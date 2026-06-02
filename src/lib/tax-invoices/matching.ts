import { money } from "@/lib/receipts/validation";
import type { ReceiptRecord } from "@/types/receipts";
import type { InvoiceMatchCandidate, TaxInvoiceRecord } from "@/types/tax-invoices";

function normalizeName(value: string | null | undefined) {
  return (value ?? "")
    .replace(/\(주\)|주식회사|㈜|\s/g, "")
    .toLowerCase()
    .trim();
}

function dateDiffDays(left: string | null | undefined, right: string | null | undefined) {
  if (!left || !right) return Number.POSITIVE_INFINITY;
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) return Number.POSITIVE_INFINITY;
  return Math.abs(leftTime - rightTime) / 86400000;
}

export function buildInvoiceMatchCandidates(
  invoice: TaxInvoiceRecord,
  receipts: ReceiptRecord[]
): InvoiceMatchCandidate[] {
  const invoiceVendor = normalizeName(invoice.vendor_name);
  const invoiceTotal = money(invoice.total_amount);

  return receipts
    .map((receipt) => {
      const reasons: string[] = [];
      let score = 0;
      const receiptVendor = normalizeName(receipt.vendor_name);
      const difference = invoiceTotal - money(receipt.total_amount);
      const absDifference = Math.abs(difference);
      const days = dateDiffDays(invoice.invoice_date, receipt.receipt_date);

      if (invoiceVendor && receiptVendor && (invoiceVendor.includes(receiptVendor) || receiptVendor.includes(invoiceVendor))) {
        score += 45;
        reasons.push("거래처가 비슷함");
      }

      if (absDifference <= 1) {
        score += 40;
        reasons.push("총액이 같음");
      } else if (absDifference <= Math.max(1000, invoiceTotal * 0.01)) {
        score += 25;
        reasons.push("금액 차이가 작음");
      }

      if (days <= 7) {
        score += 15;
        reasons.push("날짜가 가까움");
      } else if (days <= 31) {
        score += 8;
        reasons.push("같은 달 가능성");
      }

      return {
        receipt_id: receipt.id,
        vendor_name: receipt.vendor_name ?? "거래처 확인필요",
        receipt_date: receipt.receipt_date,
        total_amount: money(receipt.total_amount),
        status: receipt.status,
        match_score: score,
        difference_amount: difference,
        reasons,
      };
    })
    .filter((candidate) => candidate.match_score > 0)
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 20);
}
