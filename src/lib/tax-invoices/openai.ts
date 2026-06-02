import { normalizeTaxInvoice } from "@/lib/tax-invoices/validation";
import type { TaxInvoiceInput, TaxInvoiceItemInput } from "@/types/tax-invoices";

type OpenAIContent =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string; detail?: "low" | "high" | "auto" }
  | { type: "input_file"; file_url: string; filename?: string };

const taxInvoiceJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "vendor_name",
    "business_registration_number",
    "invoice_date",
    "items",
    "total_supply_amount",
    "total_vat",
    "total_amount",
    "memo",
    "needs_review_fields",
  ],
  properties: {
    vendor_name: { type: "string", description: "공급자 상호" },
    business_registration_number: { type: "string", description: "공급자 사업자등록번호" },
    invoice_date: { type: "string", description: "YYYY-MM-DD, blank if unreadable" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "item_name",
          "quantity",
          "unit_price",
          "supply_amount",
          "vat",
          "total_amount",
          "needs_review_fields",
        ],
        properties: {
          item_name: { type: "string" },
          quantity: { type: "number" },
          unit_price: { type: "number" },
          supply_amount: { type: "number" },
          vat: { type: "number" },
          total_amount: { type: "number" },
          needs_review_fields: { type: "array", items: { type: "string" } },
        },
      },
    },
    total_supply_amount: { type: "number" },
    total_vat: { type: "number" },
    total_amount: { type: "number" },
    memo: { type: "string" },
    needs_review_fields: {
      type: "object",
      additionalProperties: { type: "string" },
    },
  },
};

function isPdf(fileUrl: string, contentType?: string | null) {
  return contentType === "application/pdf" || fileUrl.toLowerCase().includes(".pdf");
}

function extractOutputText(response: unknown): string {
  const value = response as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };

  if (typeof value.output_text === "string") return value.output_text;

  return (
    value.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter(Boolean)
      .join("\n") ?? ""
  );
}

function parseTaxInvoiceJson(text: string): TaxInvoiceInput {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
  const parsed = JSON.parse(trimmed) as TaxInvoiceInput;
  const normalizedItems: TaxInvoiceItemInput[] = Array.isArray(parsed.items) ? parsed.items : [];
  return normalizeTaxInvoice(parsed, normalizedItems);
}

export async function analyzeTaxInvoiceWithOpenAI({
  fileUrl,
  contentType,
}: {
  fileUrl: string;
  contentType?: string | null;
}): Promise<TaxInvoiceInput> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY가 설정되어 있지 않습니다.");
  }

  const content: OpenAIContent[] = [
    {
      type: "input_text",
      text: [
        "한글 세금계산서 또는 전자세금계산서 PDF/이미지를 읽고 JSON만 반환하세요.",
        "공급자 상호, 사업자등록번호, 작성일자, 품목, 공급가, 부가세, 합계금액을 추출하세요.",
        "거래명세서 입고자료와 대조할 데이터이므로 공급자명과 금액을 가장 보수적으로 읽으세요.",
        "확신이 낮은 값은 needs_review_fields에 필드명을 넣고, 모르는 값은 빈 문자열 또는 0으로 두세요.",
        "금액은 쉼표와 원 기호를 제거한 숫자로 반환하세요.",
      ].join("\n"),
    },
  ];

  if (isPdf(fileUrl, contentType)) {
    content.push({ type: "input_file", file_url: fileUrl, filename: "tax-invoice.pdf" });
  } else {
    content.push({ type: "input_image", image_url: fileUrl, detail: "high" });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_RECEIPT_MODEL ?? "gpt-4.1",
      input: [{ role: "user", content }],
      text: {
        format: {
          type: "json_schema",
          name: "korean_tax_invoice_extraction",
          strict: true,
          schema: taxInvoiceJsonSchema,
        },
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message ?? "세금계산서 AI 분석에 실패했습니다.");
  }

  const outputText = extractOutputText(data);
  if (!outputText) throw new Error("OpenAI 응답에서 JSON 텍스트를 찾지 못했습니다.");

  return parseTaxInvoiceJson(outputText);
}
