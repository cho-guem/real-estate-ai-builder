"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { AlertTriangle, Check, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buildValidationWarnings, formatWon, normalizeReceipt } from "@/lib/receipts/validation";
import type { ReceiptInput, ReceiptItemInput, ReceiptItemRecord, ReceiptRecord } from "@/types/receipts";

interface ReceiptReviewClientProps {
  receipt: ReceiptRecord;
  items: ReceiptItemRecord[];
}

const emptyItem: ReceiptItemInput = {
  item_name: "",
  specification: "",
  quantity: 0,
  unit: "EA",
  unit_price: 0,
  supply_amount: 0,
  vat: 0,
  total_amount: 0,
  needs_review_fields: ["item_name", "quantity", "total_amount"],
};

function parseNumber(value: string) {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function fieldNeedsReview(item: ReceiptItemInput, field: string) {
  return item.needs_review_fields?.includes(field) || item[field as keyof ReceiptItemInput] === "";
}

export function ReceiptReviewClient({ receipt, items }: ReceiptReviewClientProps) {
  const router = useRouter();
  const [form, setForm] = useState<ReceiptInput>(() => normalizeReceipt(receipt, items));
  const [busyAction, setBusyAction] = useState<"save" | "approve" | "reject" | null>(null);
  const [message, setMessage] = useState("");
  const warnings = useMemo(() => buildValidationWarnings(form), [form]);

  function updateReceipt<K extends keyof ReceiptInput>(key: K, value: ReceiptInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateItem(index: number, patch: Partial<ReceiptItemInput>) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch, needs_review_fields: [] } : item
      ),
    }));
  }

  async function saveChanges() {
    setBusyAction("save");
    setMessage("");
    try {
      const response = await fetch(`/api/receipts/${receipt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !json.ok) throw new Error(json.error ?? "저장에 실패했습니다.");
      setMessage("수정사항을 저장했습니다.");
      router.refresh();
      return true;
    } catch (event) {
      setMessage(event instanceof Error ? event.message : "저장 중 오류가 발생했습니다.");
      return false;
    } finally {
      setBusyAction(null);
    }
  }

  async function approve() {
    setBusyAction("approve");
    setMessage("");
    try {
      if (warnings.length > 0) {
        throw new Error("검산 경고를 먼저 확인하고 수정하세요.");
      }
      const saved = await saveChanges();
      if (!saved) return;
      setBusyAction("approve");
      const response = await fetch(`/api/receipts/${receipt.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await response.json()) as { ok: boolean; error?: string; warnings?: string[] };
      if (!response.ok || !json.ok) {
        throw new Error(json.warnings?.join("\n") ?? json.error ?? "승인에 실패했습니다.");
      }
      router.push("/receipts" as Route);
      router.refresh();
    } catch (event) {
      setMessage(event instanceof Error ? event.message : "승인 중 오류가 발생했습니다.");
    } finally {
      setBusyAction(null);
    }
  }

  async function reject() {
    setBusyAction("reject");
    setMessage("");
    try {
      const response = await fetch(`/api/receipts/${receipt.id}/reject`, { method: "POST" });
      const json = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !json.ok) throw new Error(json.error ?? "반려에 실패했습니다.");
      router.push("/receipts" as Route);
      router.refresh();
    } catch (event) {
      setMessage(event instanceof Error ? event.message : "반려 중 오류가 발생했습니다.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 text-[17px] sm:px-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-primary">확인 후 승인</p>
            <h1 className="mt-1 text-3xl font-bold tracking-normal">입고 내용 확인</h1>
            <p className="mt-2 text-base text-muted-foreground">AI가 읽은 내용이 맞는지 보고, 틀린 곳만 고치면 됩니다.</p>
          </div>
          <div className="flex gap-2">
            <Button className="h-11 px-4 text-base" variant="outline" onClick={() => router.push("/receipts" as Route)}>
              목록
            </Button>
            <Button className="h-11 px-4 text-base" variant="outline" disabled={!!busyAction} onClick={saveChanges}>
              {busyAction === "save" ? <Loader2 className="animate-spin" /> : <Save />}
              저장
            </Button>
          </div>
        </header>

        <section className="rounded-lg border bg-primary/10 p-4">
          <p className="text-lg font-bold">확인할 것 3가지</p>
          <div className="mt-3 grid gap-2">
            <p>1. 거래처와 날짜가 맞는지 확인</p>
            <p>2. 품목, 수량, 금액이 맞는지 확인</p>
            <p>3. 빨간 경고가 없어지면 입고 승인</p>
          </div>
        </section>

        {receipt.file_url && (
          <a className="text-sm text-primary underline-offset-4 hover:underline" href={receipt.file_url} target="_blank">
            원본 파일 열기
          </a>
        )}

        <section className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-3">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">거래처명</span>
            <Input value={form.vendor_name} onChange={(event) => updateReceipt("vendor_name", event.target.value)} />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">거래일</span>
            <Input type="date" value={form.receipt_date} onChange={(event) => updateReceipt("receipt_date", event.target.value)} />
          </label>
          <label className="grid gap-1.5 md:col-span-3">
            <span className="text-sm font-medium">메모</span>
            <Textarea value={form.memo} onChange={(event) => updateReceipt("memo", event.target.value)} />
          </label>
        </section>

        <section className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">품목과 금액</h2>
            <Button
              className="h-11 px-4 text-base"
              variant="outline"
              onClick={() => setForm((current) => ({ ...current, items: [...current.items, { ...emptyItem }] }))}
            >
              <Plus />
              품목 추가
            </Button>
          </div>

          <div className="grid gap-3">
            {form.items.map((item, index) => (
              <div key={index} className="grid gap-3 rounded-lg border bg-background p-3 md:grid-cols-12">
                <div className="grid gap-1 md:col-span-3">
                  <span className="text-xs font-medium text-muted-foreground">품목명</span>
                  <Input value={item.item_name} onChange={(event) => updateItem(index, { item_name: event.target.value })} />
                  {fieldNeedsReview(item, "item_name") && <Badge variant="outline">확인필요</Badge>}
                </div>
                <div className="grid gap-1 md:col-span-2">
                  <span className="text-xs font-medium text-muted-foreground">규격</span>
                  <Input value={item.specification} onChange={(event) => updateItem(index, { specification: event.target.value })} />
                </div>
                <div className="grid gap-1 md:col-span-1">
                  <span className="text-xs font-medium text-muted-foreground">수량</span>
                  <Input inputMode="decimal" value={item.quantity} onChange={(event) => updateItem(index, { quantity: parseNumber(event.target.value) })} />
                  {fieldNeedsReview(item, "quantity") && <Badge variant="outline">확인필요</Badge>}
                </div>
                <div className="grid gap-1 md:col-span-1">
                  <span className="text-xs font-medium text-muted-foreground">단위</span>
                  <Input value={item.unit} onChange={(event) => updateItem(index, { unit: event.target.value })} />
                </div>
                <div className="grid gap-1 md:col-span-1">
                  <span className="text-xs font-medium text-muted-foreground">단가</span>
                  <Input inputMode="numeric" value={item.unit_price} onChange={(event) => updateItem(index, { unit_price: parseNumber(event.target.value) })} />
                </div>
                <div className="grid gap-1 md:col-span-1">
                  <span className="text-xs font-medium text-muted-foreground">공급가</span>
                  <Input inputMode="numeric" value={item.supply_amount} onChange={(event) => updateItem(index, { supply_amount: parseNumber(event.target.value) })} />
                </div>
                <div className="grid gap-1 md:col-span-1">
                  <span className="text-xs font-medium text-muted-foreground">부가세</span>
                  <Input inputMode="numeric" value={item.vat} onChange={(event) => updateItem(index, { vat: parseNumber(event.target.value) })} />
                </div>
                <div className="grid gap-1 md:col-span-1">
                  <span className="text-xs font-medium text-muted-foreground">합계</span>
                  <Input inputMode="numeric" value={item.total_amount} onChange={(event) => updateItem(index, { total_amount: parseNumber(event.target.value) })} />
                  {fieldNeedsReview(item, "total_amount") && <Badge variant="outline">확인필요</Badge>}
                </div>
                <div className="flex items-end md:col-span-1">
                  <Button
                    className="w-full"
                    size="icon"
                    variant="destructive"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        items: current.items.filter((_, itemIndex) => itemIndex !== index),
                      }))
                    }
                    aria-label="품목 삭제"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-3">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">총 공급가</span>
            <Input inputMode="numeric" value={form.total_supply_amount} onChange={(event) => updateReceipt("total_supply_amount", parseNumber(event.target.value))} />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">총 부가세</span>
            <Input inputMode="numeric" value={form.total_vat} onChange={(event) => updateReceipt("total_vat", parseNumber(event.target.value))} />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">총 합계</span>
            <Input inputMode="numeric" value={form.total_amount} onChange={(event) => updateReceipt("total_amount", parseNumber(event.target.value))} />
          </label>
        </section>

        <section className="rounded-lg border bg-card p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-xl font-bold">자동 검산</h2>
            <span className="text-sm font-medium">{formatWon(form.total_amount)}</span>
          </div>
          {warnings.length > 0 ? (
            <div className="grid gap-2">
              {warnings.map((warning) => (
                <div key={warning} className="flex gap-3 rounded-lg bg-destructive/10 p-3 text-base font-medium text-destructive">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0" />
                  <p>{warning}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-3 rounded-lg bg-primary/10 p-3 text-base font-semibold text-primary">
              <Check className="mt-0.5 size-5 shrink-0" />
              <p>금액이 맞습니다. 승인할 수 있습니다.</p>
            </div>
          )}
        </section>

        {message && <p className="whitespace-pre-line rounded-lg border bg-muted/30 p-3 text-sm">{message}</p>}

        <footer className="sticky bottom-0 -mx-4 flex gap-2 border-t bg-background/95 p-4 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
          <Button className="h-14 flex-1 text-lg font-bold" variant="destructive" disabled={!!busyAction} onClick={reject}>
            {busyAction === "reject" ? <Loader2 className="animate-spin" /> : <X />}
            반려
          </Button>
          <Button className="h-14 flex-1 text-lg font-bold" disabled={!!busyAction || warnings.length > 0} onClick={approve}>
            {busyAction === "approve" ? <Loader2 className="animate-spin" /> : <Check />}
            입고 승인
          </Button>
        </footer>
      </div>
    </main>
  );
}
