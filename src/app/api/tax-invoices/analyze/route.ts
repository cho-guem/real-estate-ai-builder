import { NextResponse } from "next/server";
import { analyzeTaxInvoiceWithOpenAI } from "@/lib/tax-invoices/openai";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { invoiceId, contentType } = (await request.json()) as {
      invoiceId?: string;
      contentType?: string;
    };

    if (!invoiceId) {
      return NextResponse.json({ ok: false, error: "invoiceId가 필요합니다." }, { status: 400 });
    }

    const supabase = (await createServiceClient()) as any;
    const invoiceResult = await supabase.from("tax_invoices").select("*").eq("id", invoiceId).single();

    if (invoiceResult.error || !invoiceResult.data?.file_url) {
      return NextResponse.json(
        { ok: false, error: invoiceResult.error?.message ?? "세금계산서를 찾지 못했습니다." },
        { status: 404 }
      );
    }

    const extracted = await analyzeTaxInvoiceWithOpenAI({
      fileUrl: invoiceResult.data.file_url,
      contentType,
    });

    const update = await supabase
      .from("tax_invoices")
      .update({
        vendor_name: extracted.vendor_name,
        business_registration_number: extracted.business_registration_number,
        invoice_date: extracted.invoice_date || null,
        total_supply_amount: extracted.total_supply_amount,
        total_vat: extracted.total_vat,
        total_amount: extracted.total_amount,
        memo: extracted.memo,
        needs_review_fields: extracted.needs_review_fields ?? {},
        raw_ai_response: extracted,
      })
      .eq("id", invoiceId)
      .select()
      .single();

    if (update.error) {
      return NextResponse.json({ ok: false, error: update.error.message }, { status: 500 });
    }

    await supabase.from("tax_invoice_items").delete().eq("tax_invoice_id", invoiceId);

    if (extracted.items.length > 0) {
      const itemInsert = await supabase.from("tax_invoice_items").insert(
        extracted.items.map((item) => ({
          tax_invoice_id: invoiceId,
          item_name: item.item_name,
          quantity: item.quantity,
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

    return NextResponse.json({ ok: true, invoice: update.data, extracted });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "AI 분석에 실패했습니다." },
      { status: 500 }
    );
  }
}
