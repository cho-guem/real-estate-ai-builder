import type { ReceiptInput, ReceiptItemInput } from "@/types/receipts";
import { normalizeReceipt } from "@/lib/receipts/validation";

type OpenAIContent =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string; detail?: "low" | "high" | "auto" }
  | { type: "input_file"; file_url: string; filename?: string };

const receiptJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "vendor_name",
    "receipt_date",
    "items",
    "total_supply_amount",
    "total_vat",
    "total_amount",
    "memo",
    "needs_review_fields",
  ],
  properties: {
    vendor_name: { type: "string" },
    receipt_date: { type: "string", description: "YYYY-MM-DD, blank if unreadable" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "item_name",
          "specification",
          "quantity",
          "unit",
          "unit_price",
          "supply_amount",
          "vat",
          "total_amount",
          "needs_review_fields",
        ],
        properties: {
          item_name: { type: "string" },
          specification: { type: "string" },
          quantity: { type: "number" },
          unit: { type: "string" },
          unit_price: { type: "number" },
          supply_amount: { type: "number" },
          vat: { type: "number" },
          total_amount: { type: "number" },
          needs_review_fields: {
            type: "array",
            items: { type: "string" },
            description: "Fields that are uncertain and must be shown as 확인필요.",
          },
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
      description: "Receipt-level uncertain fields keyed by field name.",
    },
  },
};

function isPdf(fileUrl: string, contentType?: string | null) {
  return contentType === "application/pdf" || fileUrl.toLowerCase().includes(".pdf");
}

function extractOutputText(response: unknown): string {
  const value = response as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string; type?: string }> }>;
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

function parseReceiptJson(text: string): ReceiptInput {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
  const parsed = JSON.parse(trimmed) as ReceiptInput;
  const normalizedItems: ReceiptItemInput[] = Array.isArray(parsed.items) ? parsed.items : [];
  return normalizeReceipt(parsed, normalizedItems);
}

export async function analyzeReceiptWithOpenAI({
  fileUrl,
  contentType,
}: {
  fileUrl: string;
  contentType?: string | null;
}): Promise<ReceiptInput> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY가 설정되어 있지 않습니다.");
  }

  const content: OpenAIContent[] = [
    {
      type: "input_text",
      text: [
        "한글 종이 거래명세서 또는 PDF를 읽고 입고 등록용 JSON만 반환하세요.",
        "거래처명, 거래일, 품목명, 규격, 수량, 단위, 단가, 공급가, 부가세, 합계금액을 추출하세요.",
        "제조업 품목명(베어링, 공구, 자재, 가공품명, 규격 코드)을 보존하고 임의 번역하지 마세요.",
        "모르는 값은 빈 문자열 또는 0으로 두고 needs_review_fields에 필드명을 넣으세요.",
        "금액은 쉼표와 원 기호를 제거한 숫자로 반환하세요.",
      ].join("\n"),
    },
  ];

  if (isPdf(fileUrl, contentType)) {
    content.push({ type: "input_file", file_url: fileUrl, filename: "receipt.pdf" });
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
          name: "korean_receipt_extraction",
          strict: true,
          schema: receiptJsonSchema,
        },
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message ?? "OpenAI 분석에 실패했습니다.");
  }

  const outputText = extractOutputText(data);
  if (!outputText) throw new Error("OpenAI 응답에서 JSON 텍스트를 찾지 못했습니다.");

  return parseReceiptJson(outputText);
}
