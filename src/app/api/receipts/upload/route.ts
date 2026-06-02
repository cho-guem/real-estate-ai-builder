import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const RECEIPT_BUCKET = "receipt-files";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "업로드할 파일이 없습니다." }, { status: 400 });
    }

    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: "JPG, PNG, WEBP, PDF 파일만 업로드할 수 있습니다." },
        { status: 400 }
      );
    }

    const supabase = (await createServiceClient()) as any;
    const extension = file.name.split(".").pop() || "bin";
    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
    const upload = await supabase.storage.from(RECEIPT_BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

    if (upload.error) {
      return NextResponse.json({ ok: false, error: upload.error.message }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(RECEIPT_BUCKET).getPublicUrl(path);

    const insert = await supabase
      .from("receipts")
      .insert({
        status: "pending",
        file_url: publicUrl,
        memo: "AI 분석 전",
      })
      .select()
      .single();

    if (insert.error) {
      return NextResponse.json({ ok: false, error: insert.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, receipt: insert.data, contentType: file.type });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "업로드에 실패했습니다." },
      { status: 500 }
    );
  }
}
