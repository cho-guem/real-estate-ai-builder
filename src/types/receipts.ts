export type ReceiptStatus = "pending" | "approved" | "rejected";

export type NeedsReviewMap = Record<string, string>;

export interface ReceiptItemInput {
  id?: string;
  item_name: string;
  specification: string;
  quantity: number;
  unit: string;
  unit_price: number;
  supply_amount: number;
  vat: number;
  total_amount: number;
  needs_review_fields?: string[];
}

export interface ReceiptInput {
  vendor_name: string;
  receipt_date: string;
  total_supply_amount: number;
  total_vat: number;
  total_amount: number;
  memo: string;
  needs_review_fields?: NeedsReviewMap;
  items: ReceiptItemInput[];
}

export interface ReceiptRecord {
  id: string;
  vendor_name: string | null;
  receipt_date: string | null;
  total_supply_amount: number | string | null;
  total_vat: number | string | null;
  total_amount: number | string | null;
  status: ReceiptStatus;
  file_url: string | null;
  memo: string | null;
  needs_review_fields?: NeedsReviewMap | null;
  raw_ai_response?: unknown;
  created_at: string;
  approved_at: string | null;
}

export interface ReceiptItemRecord {
  id: string;
  receipt_id: string;
  item_name: string | null;
  specification: string | null;
  quantity: number | string | null;
  unit: string | null;
  unit_price: number | string | null;
  supply_amount: number | string | null;
  vat: number | string | null;
  total_amount: number | string | null;
  needs_review_fields?: string[] | null;
  created_at: string;
}

export interface ReceiptWithItems extends ReceiptRecord {
  receipt_items: ReceiptItemRecord[];
}
