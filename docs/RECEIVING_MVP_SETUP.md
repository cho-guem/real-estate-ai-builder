# AI 입고·거래명세서 자동등록 MVP

## 구현 계획

1. `/receipts/new`에서 이미지 또는 PDF를 업로드하고 Supabase Storage에 원본을 저장합니다.
2. 업로드 직후 `receipts.status = pending` 레코드를 만들고, 사용자가 누른 `AI 분석` 액션에서 OpenAI Responses API로 거래명세서를 JSON 추출합니다.
3. `/receipts/[id]/review`에서 사용자가 추출값을 직접 수정하고 금액 검산 경고를 확인합니다.
4. `입고 승인`을 눌렀을 때만 Supabase 상태를 `approved`로 바꾸고 Google Sheets `입고대장` 탭에 append합니다.
5. `/receipts`에서 pending, approved, rejected 목록을 모바일 우선 UI로 확인합니다.

## 폴더 구조

```txt
src/app/receipts
  page.tsx
  new/page.tsx
  [id]/review/page.tsx
src/app/tax-invoices
  new/page.tsx
  [id]/match/page.tsx
src/app/reconciliations
  page.tsx
src/app/api/receipts
  upload/route.ts
  analyze/route.ts
  [id]/route.ts
  [id]/approve/route.ts
  [id]/reject/route.ts
src/app/api/tax-invoices
  upload/route.ts
  analyze/route.ts
  [id]/match/route.ts
src/components/receipts
  receipt-new-client.tsx
  receipt-review-client.tsx
src/lib/receipts
  google-sheets.ts
  openai.ts
  validation.ts
src/types/receipts.ts
supabase/migrations/007_receiving_mvp.sql
supabase/migrations/008_tax_invoice_reconciliation.sql
```

## 환경변수

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_RECEIPT_MODEL=gpt-4.1
GOOGLE_CLIENT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEET_ID=
```

`GOOGLE_PRIVATE_KEY`는 `.env.local`에 넣을 때 줄바꿈을 `\n`으로 이스케이프해도 됩니다. 코드에서 실제 줄바꿈으로 복원합니다.

## Supabase 설정

1. Supabase SQL Editor에서 `supabase/migrations/007_receiving_mvp.sql`을 실행합니다.
2. 세금계산서 대조까지 사용하려면 `supabase/migrations/008_tax_invoice_reconciliation.sql`도 실행합니다.
3. `receipt-files`, `tax-invoice-files` Storage bucket이 자동 생성됩니다. MVP에서는 OpenAI가 파일 URL을 읽을 수 있도록 public bucket으로 둡니다.
4. 단일 사용자 MVP라서 RLS는 열어두었습니다. 운영 전에는 사용자 인증과 RLS 정책을 반드시 조정하세요.

## 세금계산서 대조 흐름

1. `/tax-invoices/new`에서 세금계산서를 촬영하거나 PDF/이미지를 선택합니다.
2. AI가 공급자, 사업자등록번호, 작성일자, 공급가, 부가세, 합계금액을 읽습니다.
3. `/tax-invoices/[id]/match`에서 승인 완료된 입고대장 후보를 추천 점수순으로 보여줍니다.
4. 사용자가 실제 세금계산서와 같은 입고내역을 하나 이상 체크합니다.
5. 합계가 맞으면 `대조완료`, 차이가 있으면 `차이있음`으로 저장됩니다.

## Google Sheets 설정

1. Google Cloud Console에서 Service Account를 생성합니다.
2. Google Sheets API를 활성화합니다.
3. 서비스 계정 키 JSON에서 `client_email`, `private_key`를 환경변수에 넣습니다.
4. 대상 스프레드시트를 만들고 서비스 계정 이메일에 편집 권한을 공유합니다.
5. 시트 안에 `입고대장` 탭을 만듭니다.
6. 첫 행 헤더 예시:

```txt
승인일시 | 거래명세서ID | 거래일 | 거래처 | 품목명 | 규격 | 수량 | 단위 | 단가 | 공급가 | 부가세 | 합계 | 메모 | 원본파일
```

## OpenAI 입력 방식

이미지는 Responses API의 `input_image`에 public URL을 전달하고, PDF는 OpenAI 파일 입력 문서의 Base64 방식 대신 public URL 기반 `input_file`로 전달합니다. OpenAI 문서 기준으로 Responses API는 이미지 입력과 PDF 파일 입력을 모두 지원합니다.
