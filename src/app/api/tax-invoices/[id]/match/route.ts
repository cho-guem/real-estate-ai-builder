import { NextResponse } from "next/server";
import { money } from "@/lib/receipts/validation";
import { createServiceClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { receiptIds, note } = (await request.json()) as {
      receiptIds?: string[];
      note?: string;
    };

    if (!receiptIds?.length) {
      return NextResponse.json({ ok: false, error: "대조할 입고내역을 선택하세요." }, { status: 400 });
    }

    const supabase = (await createServiceClient()) as any;
    const invoiceResult = await supabase.from("tax_invoices").select("*").eq("id", id).single();
    const receiptsResult = await supabase.from("receipts").select("*").in("id", receiptIds);

    if (invoiceResult.error || receiptsResult.error) {
      return NextResponse.json(
        { ok: false, error: invoiceResult.error?.message ?? receiptsResult.error?.message },
        { status: 500 }
      );
    }

    const invoiceTotal = money(invoiceResult.data.total_amount);
    const receiptTotal = (receiptsResult.data ?? []).reduce(
      (sum: number, receipt: { total_amount: unknown }) => sum + money(receipt.total_amount),
      0
    );
    const difference = invoiceTotal - receiptTotal;
    const matchStatus = Math.abs(difference) <= 1 ? "confirmed" : "mismatch";

    await supabase.from("receipt_invoice_matches").delete().eq("tax_invoice_id", id);

    const insert = await supabase.from("receipt_invoice_matches").insert(
      receiptIds.map((receiptId) => ({
        receipt_id: receiptId,
        tax_invoice_id: id,
        match_status: matchStatus,
        match_score: matchStatus === "confirmed" ? 100 : 60,
        difference_amount: difference,
        note: note ?? "",
      }))
    );

    if (insert.error) {
      return NextResponse.json({ ok: false, error: insert.error.message }, { status: 500 });
    }

    const update = await supabase
      .from("tax_invoices")
      .update({
        status: matchStatus === "confirmed" ? "matched" : "mismatch",
        matched_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (update.error) {
      return NextResponse.json({ ok: false, error: update.error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      invoice: update.data,
      differenceAmount: difference,
      matchStatus,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "대조 확정에 실패했습니다." },
      { status: 500 }
    );
  }
}
