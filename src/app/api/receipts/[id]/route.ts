import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { normalizeReceipt } from "@/lib/receipts/validation";
import type { ReceiptInput } from "@/types/receipts";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Partial<ReceiptInput>;
    const input = normalizeReceipt(body, body.items ?? []);
    const supabase = (await createServiceClient()) as any;

    const receiptUpdate = await supabase
      .from("receipts")
      .update({
        vendor_name: input.vendor_name,
        receipt_date: input.receipt_date || null,
        total_supply_amount: input.total_supply_amount,
        total_vat: input.total_vat,
        total_amount: input.total_amount,
        memo: input.memo,
        needs_review_fields: input.needs_review_fields ?? {},
      })
      .eq("id", id)
      .select()
      .single();

    if (receiptUpdate.error) {
      return NextResponse.json({ ok: false, error: receiptUpdate.error.message }, { status: 500 });
    }

    const deleteItems = await supabase.from("receipt_items").delete().eq("receipt_id", id);
    if (deleteItems.error) {
      return NextResponse.json({ ok: false, error: deleteItems.error.message }, { status: 500 });
    }

    if (input.items.length > 0) {
      const insertItems = await supabase.from("receipt_items").insert(
        input.items.map((item) => ({
          receipt_id: id,
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

      if (insertItems.error) {
        return NextResponse.json({ ok: false, error: insertItems.error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, receipt: receiptUpdate.data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "저장에 실패했습니다." },
      { status: 500 }
    );
  }
}
