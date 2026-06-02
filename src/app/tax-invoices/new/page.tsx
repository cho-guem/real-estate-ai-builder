import type { Metadata } from "next";
import { TaxInvoiceNewClient } from "@/components/tax-invoices/tax-invoice-new-client";

export const metadata: Metadata = {
  title: "세금계산서 촬영",
};

export default function NewTaxInvoicePage() {
  return <TaxInvoiceNewClient />;
}
