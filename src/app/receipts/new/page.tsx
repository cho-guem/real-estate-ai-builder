import type { Metadata } from "next";
import { ReceiptNewClient } from "@/components/receipts/receipt-new-client";

export const metadata: Metadata = {
  title: "거래명세서 업로드",
};

export default function NewReceiptPage() {
  return <ReceiptNewClient />;
}
