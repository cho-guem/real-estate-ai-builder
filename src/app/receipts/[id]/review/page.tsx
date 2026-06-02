import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReceiptReviewClient } from "@/components/receipts/receipt-review-client";
import { createServiceClient } from "@/lib/supabase/server";
import type { ReceiptItemRecord, ReceiptRecord } from "@/types/receipts";

type ReviewPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "입고 검토",
};

export default async function ReceiptReviewPage({ params }: ReviewPageProps) {
  const { id } = await params;
  const supabase = (await createServiceClient()) as any;
  const receiptResult = await supabase.from("receipts").select("*").eq("id", id).single();

  if (receiptResult.error || !receiptResult.data) {
    notFound();
  }

  const itemsResult = await supabase
    .from("receipt_items")
    .select("*")
    .eq("receipt_id", id)
    .order("created_at", { ascending: true });

  return (
    <ReceiptReviewClient
      receipt={receiptResult.data as ReceiptRecord}
      items={(itemsResult.data ?? []) as ReceiptItemRecord[]}
    />
  );
}
