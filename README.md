# Real Estate AI Builder

AI 기반 부동산 웹사이트 제작 워크플로우 앱입니다. 사용자는 프로젝트를 만들고, 벤치마크 분석부터 전략, 사이트 구조, 기능 기획, UX, SEO, 브랜드, 디자인 시스템, 랜딩페이지 생성, 검토 단계까지 순차적으로 진행할 수 있습니다.

## 기술 스택

- Next.js 15
- React 19
- TypeScript
- Supabase Auth / Database
- Anthropic API
- Tailwind CSS
- Vercel 배포
- WordPress REST API / WP-CLI / Docker deployment foundation

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 환경변수

`.env.example`을 복사해 `.env.local`을 만들고 실제 값을 입력합니다.

```bash
cp .env.example .env.local
```

필수 환경변수:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_APP_NAME
NEXT_PUBLIC_SITE_URL
ANTHROPIC_API_KEY
```

주의:

- `.env.local`은 절대 GitHub에 업로드하지 않습니다.
- `SUPABASE_SERVICE_ROLE_KEY`와 `ANTHROPIC_API_KEY`는 서버에서만 사용해야 합니다.
- 키가 외부에 노출된 적이 있다면 Supabase와 Anthropic 콘솔에서 즉시 재발급하세요.

## Supabase 설정

1. Supabase 프로젝트를 생성합니다.
2. `SUPABASE_SETUP.md` 안내에 따라 SQL 마이그레이션을 적용합니다.
3. Supabase Dashboard > Project Settings > API에서 URL과 키를 확인합니다.
4. Auth Redirect URL에 로컬 및 배포 도메인을 등록합니다.

예시:

```text
http://localhost:3000/auth/callback
https://your-vercel-domain.vercel.app/auth/callback
```

## 품질 확인

배포 전 아래 명령을 실행합니다.

```bash
npm run type-check
npm run build
```

현재 확인된 상태:

- `npm run type-check` 통과
- `npm run build` 통과

## Vercel 배포

1. GitHub에 이 저장소를 업로드합니다.
2. Vercel에서 새 프로젝트를 생성하고 GitHub 저장소를 연결합니다.
3. Framework Preset은 `Next.js`를 선택합니다.
4. Build Command는 기본값 또는 `npm run build`를 사용합니다.
5. Output Directory는 비워둡니다.
6. Vercel Project Settings > Environment Variables에 위 필수 환경변수를 등록합니다.
7. `NEXT_PUBLIC_APP_URL`과 `NEXT_PUBLIC_SITE_URL`은 배포 도메인으로 설정합니다.
8. 배포 후 `/api/v1/health`에서 상태를 확인합니다.

```text
https://your-vercel-domain.vercel.app/api/v1/health
```

정상 응답:

```json
{
  "status": "ok"
}
```

## GitHub 업로드 전 체크리스트

- `.env.local`이 커밋 대상에 포함되지 않았는지 확인
- `.next/`, `node_modules/`, `*.zip`, `*.log`가 제외되는지 확인
- `npm run build`가 통과하는지 확인
- Supabase 마이그레이션 파일이 포함되어 있는지 확인
- README와 `.env.example`이 최신 상태인지 확인

## 주요 폴더

```text
src/        Next.js 앱 소스
supabase/   Supabase 마이그레이션
docs/       단계별 개발 문서
scripts/    보조 스크립트
```

`ai-real-estate-property-manager/`는 생성된 워드프레스 부동산 매물 관리 플러그인 소스입니다. 설치용 zip 파일은 생성 산출물이므로 GitHub 업로드 대상에서 제외됩니다.

## WordPress 자동 배포

WordPress 자동 배포 SaaS 아키텍처는 아래 문서에 정리되어 있습니다.

```text
docs/WORDPRESS_AUTO_DEPLOYMENT.md
```

현재 앱은 프로젝트별 WordPress 배포 요청, 배포 단계 저장, 모바일 대응 대시보드 UI를 제공합니다. 실제 WordPress 생성, 플러그인 설치, Elementor import, 도메인 연결은 WP-CLI/Docker/호스팅 provider API를 실행할 수 있는 별도 worker에서 처리하도록 설계되어 있습니다.
