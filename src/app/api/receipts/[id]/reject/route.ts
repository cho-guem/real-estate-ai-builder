import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = (await createServiceClient()) as any;
    const update = await supabase
      .from("receipts")
      .update({ status: "rejected", approved_at: null })
      .eq("id", id)
      .select()
      .single();

    if (update.error) {
      return NextResponse.json({ ok: false, error: update.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, receipt: update.data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "반려 처리에 실패했습니다." },
      { status: 500 }
    );
  }
}
