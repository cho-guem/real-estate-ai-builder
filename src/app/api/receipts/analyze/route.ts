import { NextResponse } from "next/server";
import { analyzeReceiptWithOpenAI } from "@/lib/receipts/openai";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { receiptId, contentType } = (await request.json()) as {
      receiptId?: string;
      contentType?: string;
    };

    if (!receiptId) {
      return NextResponse.json({ ok: false, error: "receiptId가 필요합니다." }, { status: 400 });
    }

    const supabase = (await createServiceClient()) as any;
    const receiptResult = await supabase.from("receipts").select("*").eq("id", receiptId).single();

    if (receiptResult.error || !receiptResult.data?.file_url) {
      return NextResponse.json(
        { ok: false, error: receiptResult.error?.message ?? "거래명세서를 찾지 못했습니다." },
        { status: 404 }
      );
    }

    const extracted = await analyzeReceiptWithOpenAI({
      fileUrl: receiptResult.data.file_url,
      contentType,
    });

    const update = await supabase
      .from("receipts")
      .update({
        vendor_name: extracted.vendor_name,
        receipt_date: extracted.receipt_date || null,
        total_supply_amount: extracted.total_supply_amount,
        total_vat: extracted.total_vat,
        total_amount: extracted.total_amount,
        memo: extracted.memo,
        needs_review_fields: extracted.needs_review_fields ?? {},
        raw_ai_response: extracted,
      })
      .eq("id", receiptId)
      .select()
      .single();

    if (update.error) {
      return NextResponse.json({ ok: false, error: update.error.message }, { status: 500 });
    }

    await supabase.from("receipt_items").delete().eq("receipt_id", receiptId);

    if (extracted.items.length > 0) {
      const itemInsert = await supabase.from("receipt_items").insert(
        extracted.items.map((item) => ({
          receipt_id: receiptId,
          item_name: item.item_name,
          specification: item.specification,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          supply_amount: item.supply_amount,
          vat: item.vat,
          total_amount: item.total_amount,
          needs_review_fields: item.needs_review_fields ?? [],
        }))
      );

      if (itemInsert.error) {
        return NextResponse.json({ ok: false, error: itemInsert.error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, receipt: update.data, extracted });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "AI 분석에 실패했습니다." },
      { status: 500 }
    );
  }
}
