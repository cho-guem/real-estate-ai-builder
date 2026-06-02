import Link from "next/link";
import type { Metadata } from "next";
import type { Route } from "next";
import { CalendarDays, FilePlus2, SearchCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatWon } from "@/lib/receipts/validation";
import { createServiceClient } from "@/lib/supabase/server";
import type { ReceiptRecord, ReceiptStatus } from "@/types/receipts";

export const metadata: Metadata = {
  title: "입고대장",
};

const statusLabels: Record<ReceiptStatus, string> = {
  pending: "입고대기",
  approved: "승인완료",
  rejected: "반려",
};

const statusVariant: Record<ReceiptStatus, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

function formatDate(value: string | null) {
  if (!value) return "날짜 확인필요";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(value));
}

export default async function ReceiptsPage() {
  const supabase = (await createServiceClient()) as any;
  const result = await supabase
    .from("receipts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  const receipts = (result.data ?? []) as ReceiptRecord[];

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 text-[17px] sm:px-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-primary">입고 관리</p>
            <h1 className="mt-1 text-3xl font-bold tracking-normal">입고대장</h1>
            <p className="mt-2 text-base text-muted-foreground">대기 중인 건부터 확인하면 됩니다.</p>
          </div>
          <div className="grid gap-2">
            <Link className={cn(buttonVariants(), "h-11 gap-1.5 px-4 text-base")} href={"/receipts/new" as Route}>
              <FilePlus2 />
              새 촬영
            </Link>
            <Link
              className={cn(buttonVariants({ variant: "outline" }), "h-11 gap-1.5 px-4 text-base")}
              href={"/reconciliations" as Route}
            >
              <SearchCheck />
              세금계산서 대조
            </Link>
          </div>
        </header>

        <section className="grid gap-2 sm:grid-cols-3">
          {(["pending", "approved", "rejected"] as ReceiptStatus[]).map((status) => (
            <div key={status} className="rounded-lg border bg-card p-3">
              <p className="text-sm text-muted-foreground">{statusLabels[status]}</p>
              <p className="mt-1 text-2xl font-semibold">
                {receipts.filter((receipt) => receipt.status === status).length}
              </p>
            </div>
          ))}
        </section>

        <section className="grid gap-3">
          {receipts.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <p className="font-medium">등록된 거래명세서가 없습니다.</p>
              <p className="mt-1 text-sm text-muted-foreground">첫 거래명세서를 업로드해 입고 검토를 시작하세요.</p>
            </div>
          ) : (
            receipts.map((receipt) => (
              <Link
                key={receipt.id}
                className="grid gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30 sm:grid-cols-[1fr_auto]"
                href={`/receipts/${receipt.id}/review` as Route}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant[receipt.status]}>{statusLabels[receipt.status]}</Badge>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <CalendarDays className="size-3.5" />
                      {formatDate(receipt.receipt_date)}
                    </span>
                  </div>
                  <h2 className="mt-2 truncate text-lg font-semibold">
                    {receipt.vendor_name || "거래처 확인필요"}
                  </h2>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{receipt.memo || "메모 없음"}</p>
                </div>
                <div className="flex items-end justify-between gap-3 sm:block sm:text-right">
                  <p className="text-sm text-muted-foreground">합계금액</p>
                  <p className="text-xl font-semibold">{formatWon(receipt.total_amount)}</p>
                </div>
              </Link>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
