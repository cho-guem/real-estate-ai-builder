import Link from "next/link";
import type { Metadata } from "next";
import type { Route } from "next";
import { FilePlus2, SearchCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatWon } from "@/lib/receipts/validation";
import { cn } from "@/lib/utils";
import { createServiceClient } from "@/lib/supabase/server";
import type { TaxInvoiceRecord, TaxInvoiceStatus } from "@/types/tax-invoices";

export const metadata: Metadata = {
  title: "세금계산서 대조 목록",
};

const statusLabels: Record<TaxInvoiceStatus, string> = {
  pending: "대조대기",
  matched: "대조완료",
  mismatch: "차이있음",
  rejected: "반려",
};

const statusVariant: Record<TaxInvoiceStatus, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  matched: "default",
  mismatch: "destructive",
  rejected: "destructive",
};

function formatDate(value: string | null) {
  if (!value) return "날짜 확인필요";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(value));
}

export default async function ReconciliationsPage() {
  const supabase = (await createServiceClient()) as any;
  const invoicesResult = await supabase
    .from("tax_invoices")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  const invoices = (invoicesResult.data ?? []) as TaxInvoiceRecord[];

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 text-[17px] sm:px-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-primary">세금계산서 확인</p>
            <h1 className="mt-1 text-3xl font-bold tracking-normal">대조 목록</h1>
            <p className="mt-2 text-base text-muted-foreground">세금계산서와 입고대장이 맞는지 확인합니다.</p>
          </div>
          <Link className={cn(buttonVariants(), "h-11 gap-1.5 px-4 text-base")} href={"/tax-invoices/new" as Route}>
            <FilePlus2 />
            새 대조
          </Link>
        </header>

        <section className="grid gap-2 sm:grid-cols-3">
          {(["pending", "matched", "mismatch"] as TaxInvoiceStatus[]).map((status) => (
            <div key={status} className="rounded-lg border bg-card p-3">
              <p className="text-sm text-muted-foreground">{statusLabels[status]}</p>
              <p className="mt-1 text-2xl font-semibold">
                {invoices.filter((invoice) => invoice.status === status).length}
              </p>
            </div>
          ))}
        </section>

        <section className="grid gap-3">
          {invoices.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <SearchCheck className="mx-auto size-9 text-primary" />
              <p className="mt-3 text-lg font-bold">대조할 세금계산서가 없습니다.</p>
              <p className="mt-1 text-muted-foreground">세금계산서를 촬영하면 입고대장과 맞춰볼 수 있습니다.</p>
            </div>
          ) : (
            invoices.map((invoice) => (
              <Link
                key={invoice.id}
                className="grid gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30 sm:grid-cols-[1fr_auto]"
                href={`/tax-invoices/${invoice.id}/match` as Route}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant[invoice.status]}>{statusLabels[invoice.status]}</Badge>
                    <span className="text-sm text-muted-foreground">{formatDate(invoice.invoice_date)}</span>
                  </div>
                  <h2 className="mt-2 truncate text-lg font-semibold">
                    {invoice.vendor_name || "공급자 확인필요"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    사업자번호 {invoice.business_registration_number || "확인필요"}
                  </p>
                </div>
                <div className="flex items-end justify-between gap-3 sm:block sm:text-right">
                  <p className="text-sm text-muted-foreground">합계금액</p>
                  <p className="text-xl font-semibold">{formatWon(invoice.total_amount)}</p>
                </div>
              </Link>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
