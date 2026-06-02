import { formatWon, money, toNumber } from "@/lib/receipts/validation";
import type {
  TaxInvoiceInput,
  TaxInvoiceItemInput,
  TaxInvoiceItemRecord,
  TaxInvoiceRecord,
} from "@/types/tax-invoices";

const MONEY_TOLERANCE = 1;

export function normalizeTaxInvoiceItem(
  item: Partial<TaxInvoiceItemInput | TaxInvoiceItemRecord>
): TaxInvoiceItemInput {
  return {
    id: "id" in item ? item.id : undefined,
    item_name: String(item.item_name ?? ""),
    quantity: toNumber(item.quantity),
    unit_price: money(item.unit_price),
    supply_amount: money(item.supply_amount),
    vat: money(item.vat),
    total_amount: money(item.total_amount),
    needs_review_fields: Array.isArray(item.needs_review_fields) ? item.needs_review_fields : [],
  };
}

export function normalizeTaxInvoice(
  invoice: Partial<TaxInvoiceInput | TaxInvoiceRecord>,
  items: Array<Partial<TaxInvoiceItemInput | TaxInvoiceItemRecord>>
): TaxInvoiceInput {
  return {
    vendor_name: String(invoice.vendor_name ?? ""),
    business_registration_number: String(invoice.business_registration_number ?? ""),
    invoice_date: String(invoice.invoice_date ?? ""),
    total_supply_amount: money(invoice.total_supply_amount),
    total_vat: money(invoice.total_vat),
    total_amount: money(invoice.total_amount),
    memo: String(invoice.memo ?? ""),
    needs_review_fields:
      invoice.needs_review_fields && !Array.isArray(invoice.needs_review_fields)
        ? invoice.needs_review_fields
        : {},
    items: items.map(normalizeTaxInvoiceItem),
  };
}

export function buildTaxInvoiceWarnings(invoice: TaxInvoiceInput): string[] {
  const warnings: string[] = [];
  const itemSupply = invoice.items.reduce((sum, item) => sum + money(item.supply_amount), 0);
  const itemVat = invoice.items.reduce((sum, item) => sum + money(item.vat), 0);
  const itemTotal = invoice.items.reduce((sum, item) => sum + money(item.total_amount), 0);
  const expectedTotal = money(invoice.total_supply_amount) + money(invoice.total_vat);

  invoice.items.forEach((item, index) => {
    const expected = money(item.supply_amount) + money(item.vat);
    if (Math.abs(expected - money(item.total_amount)) > MONEY_TOLERANCE) {
      warnings.push(
        `${index + 1}번 품목의 공급가+부가세(${formatWon(expected)})와 합계(${formatWon(
          item.total_amount
        )})가 다릅니다.`
      );
    }
  });

  if (Math.abs(itemSupply - money(invoice.total_supply_amount)) > MONEY_TOLERANCE) {
    warnings.push(`품목 공급가 합계와 세금계산서 공급가가 다릅니다.`);
  }
  if (Math.abs(itemVat - money(invoice.total_vat)) > MONEY_TOLERANCE) {
    warnings.push(`품목 부가세 합계와 세금계산서 부가세가 다릅니다.`);
  }
  if (Math.abs(itemTotal - money(invoice.total_amount)) > MONEY_TOLERANCE) {
    warnings.push(`품목 합계와 세금계산서 총액이 다릅니다.`);
  }
  if (Math.abs(expectedTotal - money(invoice.total_amount)) > MONEY_TOLERANCE) {
    warnings.push(`세금계산서 공급가+부가세와 총액이 다릅니다.`);
  }
  if (!invoice.vendor_name.trim()) warnings.push("공급자가 비어 있습니다.");
  if (!invoice.invoice_date.trim()) warnings.push("작성일자가 비어 있습니다.");

  return warnings;
}
