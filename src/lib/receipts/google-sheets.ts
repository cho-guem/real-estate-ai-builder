import { createSign } from "node:crypto";
import type { ReceiptInput, ReceiptRecord } from "@/types/receipts";

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

async function getGoogleAccessToken() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("GOOGLE_CLIENT_EMAIL 또는 GOOGLE_PRIVATE_KEY가 설정되어 있지 않습니다.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claim))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${signer.sign(privateKey, "base64url")}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error_description ?? "Google access token 발급에 실패했습니다.");
  }

  return String(data.access_token);
}

export async function appendReceiptToSheet(receipt: ReceiptRecord, input: ReceiptInput) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID가 설정되어 있지 않습니다.");

  const accessToken = await getGoogleAccessToken();
  const approvedAt = new Date().toISOString();
  const rows = input.items.map((item) => [
    approvedAt,
    receipt.id,
    input.receipt_date,
    input.vendor_name,
    item.item_name,
    item.specification,
    item.quantity,
    item.unit,
    item.unit_price,
    item.supply_amount,
    item.vat,
    item.total_amount,
    input.memo,
    receipt.file_url ?? "",
  ]);

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
      "입고대장!A:N"
    )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: rows }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message ?? "Google Sheets append에 실패했습니다.");
  }

  return data;
}
