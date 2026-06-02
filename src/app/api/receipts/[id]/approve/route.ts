import { NextResponse } from "next/server";
import { appendReceiptToSheet } from "@/lib/receipts/google-sheets";
import { createServiceClient } from "@/lib/supabase/server";
import { buildValidationWarnings, normalizeReceipt } from "@/lib/receipts/validation";
import type { ReceiptInput, ReceiptRecord } from "@/types/receipts";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Partial<ReceiptInput> | undefined;
    const supabase = (await createServiceClient()) as any;

    const receiptResult = await supabase.from("receipts").select("*").eq("id", id).single();
    const itemsResult = await supabase.from("receipt_items").select("*").eq("receipt_id", id);

    if (receiptResult.error || itemsResult.error) {
      return NextResponse.json(
        { ok: false, error: receiptResult.error?.message ?? itemsResult.error?.message },
        { status: 404 }
      );
    }

    const input = body?.items
      ? normalizeReceipt(body, body.items)
      : normalizeReceipt(receiptResult.data, itemsResult.data ?? []);

    const warnings = buildValidationWarnings(input);
    if (warnings.length > 0) {
      return NextResponse.json(
        { ok: false, error: "검산 경고를 해결한 뒤 승인하세요.", warnings },
        { status: 422 }
      );
    }

    await appendReceiptToSheet(receiptResult.data as ReceiptRecord, input);

    const update = await supabase
      .from("receipts")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (update.error) {
      return NextResponse.json({ ok: false, error: update.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, receipt: update.data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "승인 처리에 실패했습니다." },
      { status: 500 }
    );
  }
}
