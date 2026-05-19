"use client";

import {
  MapPin,
  Building2,
  PhoneCall,
  ArrowRight,
  CheckCircle,
  ShieldCheck,
  Award,
  Users,
  TrendingUp,
  Ruler,
  Clock,
  ChevronRight,
  Hash,
  Search,
  LayoutTemplate,
  MessageSquare,
} from "lucide-react";
import type { GeneratedContent } from "@/types/generation.types";
import type { ProjectConfig } from "@/config/project-options";

// ─── design tokens ────────────────────────────────────────────────────────────

// Korean typography: keep-all prevents awkward mid-word breaks
const KO = "[word-break:keep-all] leading-[1.85]";
const KO_HEADING = "[word-break:keep-all] leading-tight";

// ─── shared primitives ────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-orange-500">
      {children}
    </p>
  );
}

function H2({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <h2
      className={`text-2xl font-extrabold sm:text-3xl ${KO_HEADING} ${
        light ? "text-white" : "text-slate-900"
      }`}
    >
      {children}
    </h2>
  );
}

function Body({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p className={`mt-4 text-[15px] ${KO} ${light ? "text-blue-100/90" : "text-slate-500"}`}>
      {children}
    </p>
  );
}

// ─── Section 1: Hero ──────────────────────────────────────────────────────────

function HeroSection({ content, config }: { content: GeneratedContent; config: ProjectConfig }) {
  const seoTitle = content.seo.rows.find((r) => r.label === "사이트 제목")?.value ?? content.region.title;
  const metaDesc = content.seo.rows.find((r) => r.label === "메타 디스크립션")?.value ?? content.region.body;

  const stats = [
    { value: "2,400+", label: "거래 완료" },
    { value: "15년", label: "업력" },
    { value: "98%", label: "고객 만족도" },
    { value: `${content.report.score}점`, label: "시장 적합도" },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* grid texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 0,transparent 50%),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 0,transparent 50%)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* glow blobs */}
      <div className="pointer-events-none absolute top-0 right-0 h-80 w-80 -translate-y-1/3 translate-x-1/3 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 translate-y-1/3 -translate-x-1/3 rounded-full bg-orange-500/15 blur-3xl" />

      <div className="relative px-6 pt-16 pb-0 sm:px-12 sm:pt-20">
        <div className="mx-auto max-w-3xl">
          {/* category pill */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-400/10 px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
            <span className="text-xs font-semibold text-orange-300">
              {config.region} · {config.propertyType} {config.transactionType} 전문
            </span>
          </div>

          {/* headline */}
          <h1
            className={`text-3xl font-extrabold tracking-tight text-white sm:text-[2.6rem] sm:leading-[1.2] ${KO_HEADING}`}
          >
            {seoTitle}
          </h1>
          <p className={`mt-5 max-w-xl text-[15px] text-slate-300 ${KO}`}>{metaDesc}</p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap gap-3">
            <button className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-900/30 transition hover:bg-orange-400 active:scale-95">
              <PhoneCall className="h-4 w-4" />
              무료 상담 신청
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10">
              매물 검색하기
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* trust tick row */}
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2">
            {["공인중개사 직영", "실매물 100%", "계약 완료 보증"].map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-xs text-slate-400">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* stats bar */}
        <div className="mx-auto mt-12 max-w-3xl">
          <div className="grid grid-cols-4 divide-x divide-white/10 rounded-t-2xl border border-b-0 border-white/10 bg-white/5 backdrop-blur-sm">
            {stats.map(({ value, label }) => (
              <div key={label} className="px-4 py-5 text-center">
                <p className="text-xl font-extrabold text-white sm:text-2xl">{value}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section 2: Trust Badges ──────────────────────────────────────────────────

function TrustSection({ config }: { config: ProjectConfig }) {
  const badges = [
    { icon: ShieldCheck, text: "한국공인중개사협회 인증", sub: "정식 등록 법인" },
    { icon: Building2, text: `${config.region} 전문 에이전트`, sub: "지역 밀착형 서비스" },
    { icon: Users, text: "B2B 기업 파트너사", sub: "법인 계약 특화" },
    { icon: Award, text: "우수 중개법인 선정", sub: "3년 연속 수상" },
    { icon: PhoneCall, text: "실시간 1:1 상담", sub: "평일 09:00–18:00" },
  ];

  return (
    <section className="bg-white px-6 py-10 sm:px-12">
      <div className="mx-auto max-w-3xl">
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-slate-400">
          신뢰할 수 있는 이유
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
          {badges.map(({ icon: Icon, text, sub }) => (
            <div
              key={text}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-4 text-center"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
                <Icon className="h-4 w-4 text-blue-600" />
              </div>
              <p className={`text-[11px] font-bold text-slate-800 ${KO_HEADING}`}>{text}</p>
              <p className="text-[10px] text-slate-400">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Section 3: Listing Cards (Factory CTA) ───────────────────────────────────

function ListingsSection({ config }: { config: ProjectConfig }) {
  const isLease = config.transactionType === "월세" || config.transactionType === "임대";
  const listings = [
    {
      id: "A-001",
      area: "660㎡ (200평)",
      floor: "지상 1층",
      price: isLease ? "보증금 3천 / 월 180만" : "6억 5천만원",
      tag: "즉시입주",
      tagColor: "bg-emerald-100 text-emerald-700",
      feature: "물류 동선 최적화",
    },
    {
      id: "B-047",
      area: "1,650㎡ (500평)",
      floor: "지상 2층",
      price: isLease ? "보증금 5천 / 월 350만" : "15억원",
      tag: "인기 매물",
      tagColor: "bg-orange-100 text-orange-700",
      feature: "대형 하역장 완비",
    },
    {
      id: "C-123",
      area: "3,300㎡ (1,000평)",
      floor: "단층 + 다락",
      price: isLease ? "월 700만 (협의)" : "28억원 (협의)",
      tag: "신규 등록",
      tagColor: "bg-blue-100 text-blue-700",
      feature: "전기 용량 확장 가능",
    },
  ];

  return (
    <section className="bg-slate-50 px-6 py-16 sm:px-12">
      <div className="mx-auto max-w-3xl">
        <Eyebrow>추천 매물</Eyebrow>
        <H2>
          {config.region} {config.propertyType} 매물 목록
        </H2>
        <Body>
          검증된 실매물만 등록합니다. 상세 정보는 담당 에이전트에게 문의해 주세요.
        </Body>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {listings.map((l) => (
            <div
              key={l.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md hover:border-blue-200"
            >
              {/* image placeholder */}
              <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                <Building2 className="h-12 w-12 text-slate-300" />
                <span
                  className={`absolute top-3 left-3 rounded-full px-2 py-0.5 text-[10px] font-bold ${l.tagColor}`}
                >
                  {l.tag}
                </span>
                <span className="absolute top-3 right-3 rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-white">
                  #{l.id}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-4">
                <p className={`text-sm font-bold text-slate-900 ${KO_HEADING}`}>
                  {config.propertyType} · {l.area}
                </p>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {config.region}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Ruler className="h-3 w-3 shrink-0" />
                    {l.floor} · {l.area}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <TrendingUp className="h-3 w-3 shrink-0" />
                    {l.feature}
                  </div>
                </div>

                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className="text-[11px] text-slate-400">{config.transactionType}</p>
                  <p className={`text-sm font-bold text-blue-700 ${KO_HEADING}`}>{l.price}</p>
                </div>

                <button className="mt-3 flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-600">
                  상세 보기
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-400 hover:text-blue-700">
            <Search className="h-4 w-4" />
            전체 매물 보기
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Section 4: Market Analysis ───────────────────────────────────────────────

function MarketSection({ content, config }: { content: GeneratedContent; config: ProjectConfig }) {
  const highlights = [
    { label: "수요 증가율", value: "+12%", sub: "전년 대비" },
    { label: "평균 거래 기간", value: "32일", sub: "중개 착수 후" },
    { label: "공실률", value: "4.2%", sub: `${config.region} 기준` },
  ];

  return (
    <section className="bg-white px-6 py-16 sm:px-12">
      <div className="mx-auto max-w-3xl">
        <Eyebrow>지역 시장 분석</Eyebrow>
        <H2>{content.region.title}</H2>
        <Body>{content.region.body}</Body>

        <div className="mt-8 grid grid-cols-3 gap-3">
          {highlights.map(({ label, value, sub }) => (
            <div
              key={label}
              className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-center"
            >
              <p className="text-2xl font-extrabold text-blue-700">{value}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-700">{label}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">{sub}</p>
            </div>
          ))}
        </div>

        {/* pull-quote */}
        <blockquote className="mt-8 border-l-4 border-orange-400 pl-4">
          <p className={`text-sm font-semibold text-slate-700 ${KO}`}>
            {content.region.body.split(/[.。!！]/)[0].trim()}.
          </p>
          <cite className="mt-2 block text-xs text-slate-400 not-italic">
            — AI 시장 분석 리포트
          </cite>
        </blockquote>
      </div>
    </section>
  );
}

// ─── Section 5: Benchmarking ──────────────────────────────────────────────────

function BenchmarkSection({ content }: { content: GeneratedContent }) {
  const points = [
    { icon: TrendingUp, label: "경쟁사 대비 강점", color: "bg-violet-50 text-violet-600 border-violet-100" },
    { icon: Award, label: "차별화 포인트", color: "bg-orange-50 text-orange-600 border-orange-100" },
    { icon: Users, label: "타깃 고객 전환율", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  ];

  return (
    <section className="bg-slate-50 px-6 py-16 sm:px-12">
      <div className="mx-auto max-w-3xl">
        <Eyebrow>벤치마킹 인사이트</Eyebrow>
        <H2>{content.benchmark.title}</H2>
        <Body>{content.benchmark.body}</Body>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {points.map(({ icon: Icon, label, color }, i) => (
            <div
              key={label}
              className={`rounded-2xl border bg-white p-5 shadow-sm`}
            >
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl border ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                0{i + 1}
              </p>
              <p className={`mt-1 text-sm font-bold text-slate-800 ${KO_HEADING}`}>{label}</p>
              <p className={`mt-2 text-xs text-slate-500 ${KO}`}>
                {content.benchmark.body.split(/[.。]/)[i]?.trim() ?? "데이터 분석 중"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Section 6: Inquiry Form ──────────────────────────────────────────────────

function InquirySection({ config }: { config: ProjectConfig }) {
  return (
    <section className="relative overflow-hidden bg-blue-950 px-6 py-16 sm:px-12">
      <div className="pointer-events-none absolute top-0 right-0 h-64 w-64 -translate-y-1/4 translate-x-1/4 rounded-full bg-blue-500/15 blur-3xl" />

      <div className="relative mx-auto max-w-3xl">
        <div className="grid gap-10 sm:grid-cols-2 sm:items-start">
          {/* left: copy */}
          <div>
            <Eyebrow>1:1 전문 상담</Eyebrow>
            <H2 light>
              지금 바로<br />상담을 시작하세요
            </H2>
            <Body light>
              {config.region} {config.propertyType} 전문 에이전트가 최적 매물을 찾아드립니다. 평균 응답 시간 2시간 이내.
            </Body>

            <ul className="mt-6 space-y-3">
              {[
                "맞춤 매물 무료 추천",
                "법인·기업 계약 전담 처리",
                "계약 후 사후 관리 지원",
              ].map((item) => (
                <li key={item} className={`flex items-start gap-2 text-sm text-blue-100 ${KO}`}>
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <PhoneCall className="h-5 w-5 shrink-0 text-orange-400" />
              <div>
                <p className="text-[10px] text-slate-400">전화 상담</p>
                <p className="text-sm font-bold text-white">1588-0000</p>
              </div>
              <div className="ml-auto">
                <Clock className="h-4 w-4 text-slate-500" />
              </div>
            </div>
          </div>

          {/* right: form */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <p className="mb-4 text-sm font-semibold text-white">상담 신청</p>
            <div className="space-y-3">
              {[
                { label: "성함", placeholder: "홍길동", type: "text" },
                { label: "연락처", placeholder: "010-0000-0000", type: "tel" },
                { label: "회사명", placeholder: "(주) 예시기업", type: "text" },
              ].map(({ label, placeholder, type }) => (
                <div key={label}>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    {label}
                  </label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    readOnly
                    className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
              ))}

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  관심 매물 유형
                </label>
                <div className="flex items-center rounded-lg border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-slate-400">
                  {config.propertyType} · {config.transactionType}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  문의 내용
                </label>
                <textarea
                  rows={3}
                  readOnly
                  placeholder="원하시는 매물 조건이나 질문을 입력해주세요"
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                />
              </div>

              <button
                disabled
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 py-3 text-sm font-bold text-white opacity-80 cursor-default"
              >
                <MessageSquare className="h-4 w-4" />
                상담 신청하기
              </button>
              <p className="text-center text-[10px] text-slate-500">
                ※ 미리보기 전용 — 실제 전송되지 않습니다
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section 7: SEO Strategy ──────────────────────────────────────────────────

function SeoSection({ content }: { content: GeneratedContent }) {
  const keywordsRow = content.seo.rows.find((r) => r.label === "추천 키워드");
  const keywords = keywordsRow
    ? keywordsRow.value.split(/[,，、\s]+/).map((k) => k.trim()).filter(Boolean)
    : [];

  return (
    <section className="bg-white px-6 py-16 sm:px-12">
      <div className="mx-auto max-w-3xl">
        <Eyebrow>SEO 전략</Eyebrow>
        <H2>{content.seo.title}</H2>

        <div className="mt-7 space-y-3">
          {content.seo.rows
            .filter((r) => r.label !== "추천 키워드")
            .map((row) => (
              <div
                key={row.label}
                className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-baseline sm:gap-4"
              >
                <p className="w-32 shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {row.label}
                </p>
                <p className={`text-sm font-medium text-slate-800 ${KO}`}>{row.value}</p>
              </div>
            ))}
        </div>

        {keywords.length > 0 && (
          <div className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <Hash className="h-4 w-4 text-slate-400" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">추천 키워드</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {keywords.map((kw) => (
                <span
                  key={kw}
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                >
                  #{kw}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Section 8: Site Structure ────────────────────────────────────────────────

function StructureSection({ content }: { content: GeneratedContent }) {
  return (
    <section className="bg-slate-50 px-6 py-16 sm:px-12">
      <div className="mx-auto max-w-3xl">
        <Eyebrow>사이트 구조 설계</Eyebrow>
        <H2>{content.structure.title}</H2>
        <Body>AI가 설계한 최적 페이지 구성입니다. 사용자 흐름과 전환율을 고려하였습니다.</Body>

        <ol className="mt-8 space-y-3">
          {content.structure.pages.map((page, i) => {
            const [name, ...rest] = page.split(/\s*[—–\-]\s*/);
            const desc = rest.join(" — ").trim();
            return (
              <li
                key={i}
                className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-extrabold text-white">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className={`font-bold text-slate-900 ${KO_HEADING}`}>{name?.trim()}</p>
                  {desc && (
                    <p className={`mt-0.5 text-xs text-slate-500 ${KO}`}>{desc}</p>
                  )}
                </div>
                <LayoutTemplate className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

// ─── Section 9: Final CTA ────────────────────────────────────────────────────

function CtaSection({ content, config }: { content: GeneratedContent; config: ProjectConfig }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-orange-950/40 to-slate-900 px-6 py-20 sm:px-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(234,88,12,0.12),_transparent_70%)]" />

      <div className="relative mx-auto max-w-3xl">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-12">
          {/* score display */}
          <div className="flex flex-col items-center">
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
              {/* outer ring */}
              <div className="absolute inset-0 rounded-full border-4 border-orange-500/30" />
              {/* progress ring approximation */}
              <div
                className="absolute inset-0 rounded-full border-4 border-orange-500"
                style={{
                  clipPath: `polygon(50% 50%, 50% 0%, ${
                    50 + 50 * Math.cos(((content.report.score / 100) * 360 - 90) * (Math.PI / 180))
                  }% ${
                    50 + 50 * Math.sin(((content.report.score / 100) * 360 - 90) * (Math.PI / 180))
                  }%, 50% 50%)`,
                }}
              />
              <div className="flex flex-col items-center">
                <span className="text-3xl font-extrabold text-white">{content.report.score}</span>
                <span className="text-[10px] text-slate-400">/ 100</span>
              </div>
            </div>
            <p className="mt-2 text-xs font-semibold text-orange-400">시장 적합도</p>
          </div>

          {/* copy */}
          <div className="flex-1 text-center sm:text-left">
            <H2 light>
              {config.region} {config.propertyType}<br />
              전문 파트너와 함께하세요
            </H2>
            <Body light>{content.report.body}</Body>

            <div className="mt-6 flex flex-wrap justify-center gap-3 sm:justify-start">
              <button className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-orange-900/40 transition hover:bg-orange-400">
                <PhoneCall className="h-4 w-4" />
                무료 상담 신청
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-7 py-3 text-sm font-semibold text-white transition hover:bg-white/5">
                매물 검색
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* footer strip */}
        <div className="mt-14 border-t border-white/10 pt-6 text-center text-[11px] text-slate-500">
          © 2025 {config.region} {config.propertyType} 전문 플랫폼 &nbsp;·&nbsp; AI 생성 미리보기 &nbsp;·&nbsp; 외부 미공개
        </div>
      </div>
    </section>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function LandingPagePreview({
  content,
  config,
}: {
  content: GeneratedContent;
  config: ProjectConfig;
}) {
  return (
    <article className="overflow-hidden rounded-xl font-sans antialiased">
      <HeroSection content={content} config={config} />
      <TrustSection config={config} />
      <ListingsSection config={config} />
      <MarketSection content={content} config={config} />
      <BenchmarkSection content={content} />
      <InquirySection config={config} />
      <SeoSection content={content} />
      <StructureSection content={content} />
      <CtaSection content={content} config={config} />
    </article>
  );
}
