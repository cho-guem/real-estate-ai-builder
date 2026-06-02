import type { NeedsReviewMap } from "@/types/receipts";

export type TaxInvoiceStatus = "pending" | "matched" | "mismatch" | "rejected";

export interface TaxInvoiceItemInput {
  id?: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  supply_amount: number;
  vat: number;
  total_amount: number;
  needs_review_fields?: string[];
}

export interface TaxInvoiceInput {
  vendor_name: string;
  business_registration_number: string;
  invoice_date: string;
  total_supply_amount: number;
  total_vat: number;
  total_amount: number;
  memo: string;
  needs_review_fields?: NeedsReviewMap;
  items: TaxInvoiceItemInput[];
}

export interface TaxInvoiceRecord {
  id: string;
  vendor_name: string | null;
  business_registration_number: string | null;
  invoice_date: string | null;
  total_supply_amount: number | string | null;
  total_vat: number | string | null;
  total_amount: number | string | null;
  status: TaxInvoiceStatus;
  file_url: string | null;
  memo: string | null;
  needs_review_fields?: NeedsReviewMap | null;
  raw_ai_response?: unknown;
  created_at: string;
  matched_at: string | null;
}

export interface TaxInvoiceItemRecord {
  id: string;
  tax_invoice_id: string;
  item_name: string | null;
  quantity: number | string | null;
  unit_price: number | string | null;
  supply_amount: number | string | null;
  vat: number | string | null;
  total_amount: number | string | null;
  needs_review_fields?: string[] | null;
  created_at: string;
}

export interface InvoiceMatchCandidate {
  receipt_id: string;
  vendor_name: string;
  receipt_date: string | null;
  total_amount: number;
  status: string;
  match_score: number;
  difference_amount: number;
  reasons: string[];
}
