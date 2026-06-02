"use client";

import { useMemo, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatWon } from "@/lib/receipts/validation";
import type { InvoiceMatchCandidate, TaxInvoiceRecord } from "@/types/tax-invoices";

interface TaxInvoiceMatchClientProps {
  invoice: TaxInvoiceRecord;
  candidates: InvoiceMatchCandidate[];
}

function formatDate(value: string | null) {
  if (!value) return "날짜 확인필요";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(value));
}

export function TaxInvoiceMatchClient({ invoice, candidates }: TaxInvoiceMatchClientProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>(
    candidates[0]?.match_score >= 80 ? [candidates[0].receipt_id] : []
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const selectedTotal = useMemo(
    () =>
      candidates
        .filter((candidate) => selectedIds.includes(candidate.receipt_id))
        .reduce((sum, candidate) => sum + candidate.total_amount, 0),
    [candidates, selectedIds]
  );
  const difference = Number(invoice.total_amount ?? 0) - selectedTotal;

  function toggleReceipt(receiptId: string) {
    setSelectedIds((current) =>
      current.includes(receiptId)
        ? current.filter((id) => id !== receiptId)
        : [...current, receiptId]
    );
  }

  async function confirmMatch() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/tax-invoices/${invoice.id}/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptIds: selectedIds, note }),
      });
      const json = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !json.ok) throw new Error(json.error ?? "대조 확정에 실패했습니다.");
      router.push("/reconciliations" as Route);
      router.refresh();
    } catch (event) {
      setMessage(event instanceof Error ? event.message : "대조 확정 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 text-[17px] sm:px-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-primary">세금계산서 대조</p>
            <h1 className="mt-1 text-3xl font-bold tracking-normal">맞는 입고내역 선택</h1>
            <p className="mt-2 text-base text-muted-foreground">세금계산서와 같은 입고내역을 체크하세요.</p>
          </div>
          <Button className="h-11 px-4 text-base" variant="outline" onClick={() => router.push("/reconciliations" as Route)}>
            목록
          </Button>
        </header>

        <section className="rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={invoice.status === "matched" ? "default" : invoice.status === "mismatch" ? "destructive" : "secondary"}>
              {invoice.status === "matched" ? "대조완료" : invoice.status === "mismatch" ? "차이있음" : "대조대기"}
            </Badge>
            <span className="text-base text-muted-foreground">{formatDate(invoice.invoice_date)}</span>
          </div>
          <h2 className="mt-3 text-2xl font-bold">{invoice.vendor_name || "공급자 확인필요"}</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <p>공급가: <strong>{formatWon(invoice.total_supply_amount)}</strong></p>
            <p>부가세: <strong>{formatWon(invoice.total_vat)}</strong></p>
            <p>합계: <strong>{formatWon(invoice.total_amount)}</strong></p>
          </div>
        </section>

        <section className="rounded-lg border bg-primary/10 p-4">
          <p className="text-lg font-bold">선택한 입고 합계: {formatWon(selectedTotal)}</p>
          <p className={difference === 0 ? "mt-1 font-semibold text-primary" : "mt-1 font-semibold text-destructive"}>
            차이금액: {formatWon(difference)}
          </p>
        </section>

        <section className="grid gap-3">
          {candidates.length === 0 ? (
            <div className="rounded-lg border bg-card p-6 text-center">
              <p className="text-lg font-bold">추천할 입고내역이 없습니다.</p>
              <p className="mt-2 text-muted-foreground">먼저 거래명세서를 승인해서 입고대장에 저장해야 대조할 수 있습니다.</p>
            </div>
          ) : (
            candidates.map((candidate) => (
              <label
                key={candidate.receipt_id}
                className="flex cursor-pointer gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30"
              >
                <input
                  className="mt-1 size-6 shrink-0"
                  type="checkbox"
                  checked={selectedIds.includes(candidate.receipt_id)}
                  onChange={() => toggleReceipt(candidate.receipt_id)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={candidate.match_score >= 80 ? "default" : "secondary"}>
                      추천 {candidate.match_score}점
                    </Badge>
                    <span className="text-base text-muted-foreground">{formatDate(candidate.receipt_date)}</span>
                  </div>
                  <p className="mt-2 text-xl font-bold">{candidate.vendor_name}</p>
                  <p className="mt-1 text-lg font-semibold">{formatWon(candidate.total_amount)}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{candidate.reasons.join(", ") || "후보"}</p>
                </div>
              </label>
            ))
          )}
        </section>

        <section className="rounded-lg border bg-card p-4">
          <label className="grid gap-2">
            <span className="font-semibold">메모</span>
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="차이가 나는 이유나 확인 내용을 적어두세요." />
          </label>
        </section>

        {message && (
          <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-base font-medium text-destructive">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <p>{message}</p>
          </div>
        )}

        <footer className="sticky bottom-0 -mx-4 flex gap-2 border-t bg-background/95 p-4 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
          <Button className="h-14 flex-1 text-lg font-bold" disabled={busy || selectedIds.length === 0} onClick={confirmMatch}>
            {busy ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
            대조 확정
          </Button>
        </footer>
      </div>
    </main>
  );
}
