import type { ReceiptInput, ReceiptItemInput, ReceiptItemRecord, ReceiptRecord } from "@/types/receipts";

const MONEY_TOLERANCE = 1;

export function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function money(value: unknown): number {
  return Math.round(toNumber(value));
}

export function formatWon(value: unknown): string {
  return `${money(value).toLocaleString("ko-KR")}원`;
}

export function normalizeItem(item: Partial<ReceiptItemInput | ReceiptItemRecord>): ReceiptItemInput {
  return {
    id: "id" in item ? item.id : undefined,
    item_name: String(item.item_name ?? ""),
    specification: String(item.specification ?? ""),
    quantity: toNumber(item.quantity),
    unit: String(item.unit ?? "EA"),
    unit_price: money(item.unit_price),
    supply_amount: money(item.supply_amount),
    vat: money(item.vat),
    total_amount: money(item.total_amount),
    needs_review_fields: Array.isArray(item.needs_review_fields) ? item.needs_review_fields : [],
  };
}

export function normalizeReceipt(
  receipt: Partial<ReceiptInput | ReceiptRecord>,
  items: Array<Partial<ReceiptItemInput | ReceiptItemRecord>>
): ReceiptInput {
  return {
    vendor_name: String(receipt.vendor_name ?? ""),
    receipt_date: String(receipt.receipt_date ?? ""),
    total_supply_amount: money(receipt.total_supply_amount),
    total_vat: money(receipt.total_vat),
    total_amount: money(receipt.total_amount),
    memo: String(receipt.memo ?? ""),
    needs_review_fields:
      receipt.needs_review_fields && !Array.isArray(receipt.needs_review_fields)
        ? receipt.needs_review_fields
        : {},
    items: items.map(normalizeItem),
  };
}

export function buildValidationWarnings(receipt: ReceiptInput): string[] {
  const warnings: string[] = [];
  const itemSupply = receipt.items.reduce((sum, item) => sum + money(item.supply_amount), 0);
  const itemVat = receipt.items.reduce((sum, item) => sum + money(item.vat), 0);
  const itemTotal = receipt.items.reduce((sum, item) => sum + money(item.total_amount), 0);

  receipt.items.forEach((item, index) => {
    const expected = money(item.supply_amount) + money(item.vat);
    if (Math.abs(expected - money(item.total_amount)) > MONEY_TOLERANCE) {
      warnings.push(
        `${index + 1}번 품목의 공급가+부가세(${formatWon(expected)})와 합계(${formatWon(
          item.total_amount
        )})가 다릅니다.`
      );
    }
  });

  if (Math.abs(itemSupply - money(receipt.total_supply_amount)) > MONEY_TOLERANCE) {
    warnings.push(
      `품목 공급가 합계(${formatWon(itemSupply)})와 문서 공급가(${formatWon(
        receipt.total_supply_amount
      )})가 다릅니다.`
    );
  }

  if (Math.abs(itemVat - money(receipt.total_vat)) > MONEY_TOLERANCE) {
    warnings.push(
      `품목 부가세 합계(${formatWon(itemVat)})와 문서 부가세(${formatWon(receipt.total_vat)})가 다릅니다.`
    );
  }

  if (Math.abs(itemTotal - money(receipt.total_amount)) > MONEY_TOLERANCE) {
    warnings.push(
      `품목 합계(${formatWon(itemTotal)})와 문서 총액(${formatWon(receipt.total_amount)})이 다릅니다.`
    );
  }

  const expectedTotal = money(receipt.total_supply_amount) + money(receipt.total_vat);
  if (Math.abs(expectedTotal - money(receipt.total_amount)) > MONEY_TOLERANCE) {
    warnings.push(
      `문서 공급가+부가세(${formatWon(expectedTotal)})와 총액(${formatWon(receipt.total_amount)})이 다릅니다.`
    );
  }

  if (!receipt.vendor_name.trim()) warnings.push("거래처명이 비어 있습니다.");
  if (!receipt.receipt_date.trim()) warnings.push("거래일이 비어 있습니다.");
  if (receipt.items.length === 0) warnings.push("품목 라인이 없습니다.");

  return warnings;
}
