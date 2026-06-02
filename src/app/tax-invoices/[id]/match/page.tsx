import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TaxInvoiceMatchClient } from "@/components/tax-invoices/tax-invoice-match-client";
import { createServiceClient } from "@/lib/supabase/server";
import { buildInvoiceMatchCandidates } from "@/lib/tax-invoices/matching";
import type { ReceiptRecord } from "@/types/receipts";
import type { TaxInvoiceRecord } from "@/types/tax-invoices";

type MatchPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "세금계산서 대조",
};

export default async function TaxInvoiceMatchPage({ params }: MatchPageProps) {
  const { id } = await params;
  const supabase = (await createServiceClient()) as any;
  const invoiceResult = await supabase.from("tax_invoices").select("*").eq("id", id).single();

  if (invoiceResult.error || !invoiceResult.data) {
    notFound();
  }

  const receiptsResult = await supabase
    .from("receipts")
    .select("*")
    .eq("status", "approved")
    .order("receipt_date", { ascending: false, nullsFirst: false })
    .limit(200);

  const candidates = buildInvoiceMatchCandidates(
    invoiceResult.data as TaxInvoiceRecord,
    (receiptsResult.data ?? []) as ReceiptRecord[]
  );

  return <TaxInvoiceMatchClient invoice={invoiceResult.data as TaxInvoiceRecord} candidates={candidates} />;
}
