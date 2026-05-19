import type { GeneratedContent } from "@/types/generation.types";
import type { ProjectConfig } from "@/config/project-options";

// ─── safety ───────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── CSS builder ─────────────────────────────────────────────────────────────
//
// p  = descendant prefix with trailing space, e.g. ".scope " or ""
// bp = block/root selector, e.g. ".scope"  or "body"
//
// standalone=true  → full global resets for <html> download
// standalone=false → scoped-only resets for WordPress/Elementor embed

function buildCss(p: string, standalone: boolean): string {
  const bp = p.trim() || "body";

  const reset = standalone
    ? `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
img,svg{display:block;max-width:100%}
button,input,textarea,select{font:inherit}
button{cursor:pointer;border:none;background:none}
textarea{resize:vertical}
a{color:inherit;text-decoration:none}`
    : `${p}*,${p}*::before,${p}*::after{box-sizing:border-box}
${p}img,${p}svg{display:block;max-width:100%}
${p}button,${p}input,${p}textarea,${p}select{font:inherit}
${p}button{cursor:pointer;border:none;background:none}
${p}textarea{resize:vertical}
${p}a{color:inherit;text-decoration:none}`;

  return `${reset}
${bp}{
  font-family:'Pretendard Variable','Pretendard',-apple-system,BlinkMacSystemFont,
    'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif;
  ${standalone ? "font-size:16px;" : ""}
  ${standalone ? "background:#fff;" : ""}
  color:#1e293b;
  -webkit-font-smoothing:antialiased;
  -moz-osx-font-smoothing:grayscale;
  scroll-behavior:smooth;
  line-height:1.6;
  --re-orange:#f97316;
  --re-orange-d:#ea580c;
  --re-blue:#1d4ed8;
  --re-blue-d:#1e40af;
  --re-navy:#0f172a;
  --re-slate:#1e293b;
  --re-muted:#64748b;
  --re-border:#e2e8f0;
  --re-shadow-sm:0 1px 3px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04);
  --re-shadow-md:0 4px 20px rgba(0,0,0,.08),0 1px 4px rgba(0,0,0,.04);
  --re-shadow-lg:0 12px 40px rgba(0,0,0,.1),0 2px 8px rgba(0,0,0,.06);
  --re-shadow-orange:0 4px 24px rgba(249,115,22,.28);
  --re-shadow-blue:0 4px 20px rgba(29,78,216,.16);
  --re-ease:cubic-bezier(0.4,0,0.2,1);
}

/* ── layout ── */
${p}.section{padding:4.5rem 1.25rem}
${p}.inner{max-width:800px;margin:0 auto}
@media(min-width:480px){${p}.section{padding:5.5rem 1.75rem}}
@media(min-width:640px){${p}.section{padding:6.5rem 3rem}}
@media(min-width:1024px){${p}.section{padding:7.5rem 3rem}}

/* ── typography ── */
${p}.ko{word-break:keep-all;line-height:1.9;overflow-wrap:break-word}
${p}.ko-h{word-break:keep-all;line-height:1.25;letter-spacing:-.035em;overflow-wrap:break-word}
${p}.eyebrow{
  display:inline-flex;align-items:center;gap:.4rem;
  font-size:.65rem;font-weight:800;letter-spacing:.2em;text-transform:uppercase;
  color:var(--re-orange);margin-bottom:.875rem;
}
${p}.eyebrow::before{
  content:'';display:block;width:.375rem;height:.375rem;
  border-radius:50%;background:var(--re-orange);flex-shrink:0;
}
${p}.h2{
  font-size:1.625rem;font-weight:900;color:#0a1628;
  letter-spacing:-.03em;word-break:keep-all;line-height:1.25;
}
@media(min-width:480px){${p}.h2{font-size:1.875rem}}
@media(min-width:640px){${p}.h2{font-size:2.125rem}}
${p}.body{font-size:.9375rem;color:var(--re-muted);margin-top:1.125rem;line-height:1.9;word-break:keep-all}

/* ── buttons ── */
${p}.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:.5rem;
  border-radius:.5625rem;font-size:.875rem;font-weight:700;
  padding:.8125rem 1.875rem;
  transition:transform .2s var(--re-ease),box-shadow .2s var(--re-ease),
    opacity .2s var(--re-ease),background .2s var(--re-ease),border-color .2s var(--re-ease);
  cursor:pointer;text-align:center;white-space:nowrap;
}
${p}.btn:hover{transform:translateY(-2px)}
${p}.btn:active{transform:translateY(0)}
${p}.btn-orange{
  background:linear-gradient(135deg,#f97316 0%,#ea580c 100%);
  color:#fff;box-shadow:var(--re-shadow-orange);
  border:1px solid rgba(249,115,22,.25);
}
${p}.btn-orange:hover{
  background:linear-gradient(135deg,#fb923c 0%,#f97316 100%);
  box-shadow:0 8px 32px rgba(249,115,22,.38);
}
${p}.btn-outline{
  border:1.5px solid rgba(255,255,255,.28);color:#fff;
  background:rgba(255,255,255,.07);backdrop-filter:blur(6px);
}
${p}.btn-outline:hover{
  background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.5);
  box-shadow:0 4px 20px rgba(255,255,255,.06);
}
${p}.btn-outline-dark{
  border:1.5px solid var(--re-border);color:#475569;
  background:#fff;box-shadow:var(--re-shadow-sm);
}
${p}.btn-outline-dark:hover{
  border-color:#bfdbfe;color:var(--re-blue);
  box-shadow:var(--re-shadow-md);background:#f8faff;
}
${p}.btn-row{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1.875rem;align-items:center}

/* ─────────────── HERO ─────────────── */
${p}.hero{
  position:relative;overflow:hidden;
  background:linear-gradient(148deg,#060e1c 0%,#0c1c38 30%,#172554 62%,#0f172a 100%);
  padding:4.5rem 1.25rem 0;
}
@media(min-width:480px){${p}.hero{padding:5.5rem 1.75rem 0}}
@media(min-width:640px){${p}.hero{padding:7rem 3rem 0}}

${p}.hero-grid{
  position:absolute;inset:0;opacity:.03;pointer-events:none;
  background-image:
    repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 0,transparent 52px),
    repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 0,transparent 52px);
}
${p}.hero-noise{
  position:absolute;inset:0;opacity:.022;pointer-events:none;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size:160px;mix-blend-mode:overlay;
}
${p}.hero-blob{position:absolute;border-radius:50%;filter:blur(72px);pointer-events:none}
${p}.hero-blob-a{
  top:-8%;right:-8%;width:46%;height:46%;min-width:220px;
  background:radial-gradient(circle,rgba(59,130,246,.22) 0%,rgba(37,99,235,.08) 65%,transparent 100%);
}
${p}.hero-blob-b{
  bottom:-12%;left:-6%;width:42%;height:42%;min-width:200px;
  background:radial-gradient(circle,rgba(249,115,22,.16) 0%,rgba(234,88,12,.04) 65%,transparent 100%);
}
${p}.hero-blob-c{
  top:25%;left:38%;width:32%;height:32%;min-width:160px;
  background:radial-gradient(circle,rgba(99,102,241,.07) 0%,transparent 70%);
}
${p}.hero-inner{position:relative;max-width:800px;margin:0 auto}

${p}.hero-pill{
  display:inline-flex;align-items:center;gap:.5rem;
  border:1px solid rgba(251,146,60,.28);border-radius:9999px;
  background:rgba(251,146,60,.08);padding:.375rem 1rem;
  font-size:.7rem;font-weight:700;color:#fed7aa;margin-bottom:1.5rem;
  letter-spacing:.04em;
}
${p}.hero-dot{
  width:.375rem;height:.375rem;border-radius:50%;background:#fb923c;flex-shrink:0;
  box-shadow:0 0 7px rgba(251,146,60,.7);
}
${p}.hero h1{
  font-size:2.25rem;font-weight:900;color:#fff;margin-bottom:1.25rem;
  letter-spacing:-.04em;word-break:keep-all;line-height:1.18;
  text-shadow:0 2px 24px rgba(0,0,0,.35);
}
@media(min-width:480px){${p}.hero h1{font-size:2.625rem}}
@media(min-width:640px){${p}.hero h1{font-size:3rem;line-height:1.14}}
@media(min-width:1024px){${p}.hero h1{font-size:3.375rem}}
${p}.hero-sub{
  font-size:.9375rem;color:rgba(203,213,225,.88);max-width:560px;
  line-height:1.85;word-break:keep-all;
}
@media(min-width:640px){${p}.hero-sub{font-size:1.0625rem}}
${p}.hero-ticks{display:flex;flex-wrap:wrap;gap:.5rem 1.5rem;margin-top:2rem}
${p}.hero-tick{
  display:flex;align-items:center;gap:.5rem;
  font-size:.75rem;color:#94a3b8;font-weight:500;
}
${p}.tick-icon{
  width:.9375rem;height:.9375rem;background:#34d399;border-radius:50%;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
  font-size:.55rem;color:#fff;box-shadow:0 0 8px rgba(52,211,153,.45);
}

/* stats bar — glassmorphism */
${p}.stats-bar{
  display:grid;grid-template-columns:repeat(4,1fr);
  border:1px solid rgba(255,255,255,.1);border-bottom:none;
  border-radius:1.25rem 1.25rem 0 0;
  background:rgba(255,255,255,.042);
  backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
  margin-top:3.5rem;overflow:hidden;
  box-shadow:
    0 -4px 28px rgba(0,0,0,.22),
    inset 0 1px 0 rgba(255,255,255,.09),
    inset 0 0 0 1px rgba(255,255,255,.04);
}
${p}.stat-cell{
  padding:1.375rem .75rem;text-align:center;
  border-right:1px solid rgba(255,255,255,.07);
  transition:background .2s var(--re-ease);
}
${p}.stat-cell:last-child{border-right:none}
${p}.stat-cell:hover{background:rgba(255,255,255,.055)}
${p}.stat-val{
  font-size:1.375rem;font-weight:900;color:#fff;
  letter-spacing:-.03em;line-height:1;
}
@media(min-width:480px){${p}.stat-val{font-size:1.5rem}}
@media(min-width:640px){${p}.stat-val{font-size:1.75rem}}
${p}.stat-label{font-size:.6rem;color:#94a3b8;margin-top:.375rem;letter-spacing:.05em}

/* ─────────────── TRUST ─────────────── */
${p}.trust{background:#fff;padding:2.75rem 1.25rem;border-bottom:1px solid #f1f5f9}
@media(min-width:480px){${p}.trust{padding:3rem 1.75rem}}
@media(min-width:640px){${p}.trust{padding:3.25rem 3rem}}
${p}.trust-header{
  text-align:center;font-size:.65rem;font-weight:800;letter-spacing:.2em;
  text-transform:uppercase;color:#94a3b8;margin-bottom:1.875rem;
}
${p}.trust-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:.75rem;max-width:800px;margin:0 auto}
@media(min-width:480px){${p}.trust-grid{grid-template-columns:repeat(3,1fr)}}
@media(min-width:640px){${p}.trust-grid{grid-template-columns:repeat(5,1fr);gap:1rem}}
${p}.trust-card{
  display:flex;flex-direction:column;align-items:center;gap:.5rem;text-align:center;
  border:1px solid #f1f5f9;border-radius:1rem;background:#fafbfc;padding:1.125rem .75rem;
  transition:transform .2s var(--re-ease),box-shadow .2s var(--re-ease),border-color .2s var(--re-ease);
}
${p}.trust-card:hover{
  transform:translateY(-4px);box-shadow:var(--re-shadow-md);border-color:#e0f2fe;
}
${p}.trust-icon{
  width:2.5rem;height:2.5rem;border-radius:50%;
  background:linear-gradient(145deg,#eff6ff,#dbeafe);
  display:flex;align-items:center;justify-content:center;font-size:1.125rem;
  box-shadow:0 2px 8px rgba(29,78,216,.1);
}
${p}.trust-name{font-size:.6875rem;font-weight:800;color:#1e293b;word-break:keep-all;line-height:1.35}
${p}.trust-sub{font-size:.625rem;color:#94a3b8;font-weight:500}

/* ─────────────── LISTINGS ─────────────── */
${p}.listings{background:#f8fafc;padding:4.5rem 1.25rem}
@media(min-width:480px){${p}.listings{padding:5.5rem 1.75rem}}
@media(min-width:640px){${p}.listings{padding:6.5rem 3rem}}
${p}.listings-grid{display:grid;gap:1.125rem;margin-top:2.25rem}
@media(min-width:640px){${p}.listings-grid{grid-template-columns:repeat(3,1fr)}}
${p}.listing-card{
  display:flex;flex-direction:column;border-radius:1.25rem;border:1px solid var(--re-border);
  background:#fff;overflow:hidden;box-shadow:var(--re-shadow-sm);
  transition:transform .25s var(--re-ease),box-shadow .25s var(--re-ease),border-color .25s var(--re-ease);
}
${p}.listing-card:hover{
  transform:translateY(-7px);box-shadow:var(--re-shadow-lg);border-color:#bfdbfe;
}
${p}.listing-thumb{
  height:10rem;overflow:hidden;position:relative;
  display:flex;align-items:center;justify-content:center;
  background:linear-gradient(148deg,#dde5f0 0%,#c9d8e8 50%,#b8cada 100%);
}
${p}.listing-thumb::after{
  content:'';position:absolute;inset:0;
  background:linear-gradient(to bottom,transparent 35%,rgba(0,0,0,.14) 100%);
}
${p}.listing-thumb span[style]{position:relative;z-index:0}
${p}.listing-tag{
  position:absolute;top:.75rem;left:.75rem;z-index:1;
  border-radius:9999px;padding:.2rem .65rem;font-size:.6rem;font-weight:800;
  letter-spacing:.02em;
}
${p}.tag-green{background:rgba(209,250,229,.95);color:#065f46;box-shadow:0 1px 4px rgba(6,95,70,.14)}
${p}.tag-orange{background:rgba(255,237,213,.95);color:#9a3412;box-shadow:0 1px 4px rgba(154,52,18,.14)}
${p}.tag-blue{background:rgba(219,234,254,.95);color:#1e40af;box-shadow:0 1px 4px rgba(30,64,175,.14)}
${p}.listing-id{
  position:absolute;top:.75rem;right:.75rem;z-index:1;
  background:rgba(0,0,0,.44);color:rgba(255,255,255,.82);border-radius:9999px;
  padding:.2rem .6rem;font-size:.6rem;font-weight:600;letter-spacing:.04em;
}
${p}.listing-body{padding:1.125rem;display:flex;flex-direction:column;flex:1}
${p}.listing-title{font-size:.9rem;font-weight:800;color:#0a1628;word-break:keep-all;line-height:1.4}
${p}.listing-meta{margin-top:.625rem;display:flex;flex-direction:column;gap:.3125rem}
${p}.listing-meta-row{display:flex;align-items:center;gap:.375rem;font-size:.7rem;color:#64748b}
${p}.listing-meta-icon{font-size:.75rem;flex-shrink:0}
${p}.listing-price-label{
  font-size:.6rem;color:#94a3b8;margin-top:.875rem;padding-top:.875rem;
  border-top:1px solid #f1f5f9;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
}
${p}.listing-price{font-size:.9375rem;font-weight:900;color:var(--re-blue);word-break:keep-all;margin-top:.25rem}
${p}.listing-btn{
  margin-top:.875rem;width:100%;display:flex;align-items:center;justify-content:center;gap:.25rem;
  border:1.5px solid var(--re-border);border-radius:.5rem;padding:.5625rem;
  font-size:.75rem;font-weight:700;color:#475569;
  transition:color .2s var(--re-ease),border-color .2s var(--re-ease),background .2s var(--re-ease);
}
${p}.listing-btn:hover{color:var(--re-blue);border-color:#bfdbfe;background:#eff6ff}
${p}.listings-more{text-align:center;margin-top:2.25rem}

/* ─────────────── MARKET ─────────────── */
${p}.market{background:#fff}
${p}.market-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.875rem;margin-top:2.25rem}
${p}.market-stat{
  border:1px solid #dbeafe;border-radius:1rem;
  background:linear-gradient(148deg,#f0f7ff,#eff6ff);
  padding:1.25rem .875rem;text-align:center;
  box-shadow:0 1px 4px rgba(29,78,216,.06);
  transition:transform .2s var(--re-ease),box-shadow .2s var(--re-ease);
}
${p}.market-stat:hover{transform:translateY(-3px);box-shadow:var(--re-shadow-blue)}
${p}.market-stat-val{
  font-size:1.625rem;font-weight:900;color:var(--re-blue);
  letter-spacing:-.03em;line-height:1;
}
@media(min-width:640px){${p}.market-stat-val{font-size:1.875rem}}
${p}.market-stat-name{font-size:.6875rem;font-weight:700;color:#1e293b;margin-top:.375rem}
${p}.market-stat-sub{font-size:.6rem;color:#94a3b8;margin-top:.125rem}
${p}.market-quote{
  margin-top:2.25rem;padding:1.25rem 1.375rem;
  border-left:3px solid var(--re-orange);
  border-radius:0 .875rem .875rem 0;
  background:linear-gradient(to right,rgba(249,115,22,.05),rgba(249,115,22,.01));
}
${p}.market-quote p{
  font-size:.9375rem;font-weight:600;color:#334155;
  word-break:keep-all;line-height:1.8;font-style:italic;
}
${p}.market-quote cite{
  display:block;margin-top:.625rem;font-size:.7rem;color:#94a3b8;
  font-style:normal;font-weight:600;
}

/* ─────────────── BENCHMARK ─────────────── */
${p}.bench{background:#f8fafc}
${p}.bench-grid{display:grid;gap:1.125rem;margin-top:2.25rem}
@media(min-width:640px){${p}.bench-grid{grid-template-columns:repeat(3,1fr)}}
${p}.bench-card{
  background:#fff;border:1px solid var(--re-border);border-radius:1.25rem;
  padding:1.625rem;box-shadow:var(--re-shadow-sm);
  transition:transform .25s var(--re-ease),box-shadow .25s var(--re-ease),border-color .25s var(--re-ease);
}
${p}.bench-card:hover{
  transform:translateY(-6px);box-shadow:var(--re-shadow-lg);border-color:#e0e7ff;
}
${p}.bench-icon{
  width:2.75rem;height:2.75rem;border-radius:.875rem;border:1px solid;
  display:flex;align-items:center;justify-content:center;font-size:1.2rem;margin-bottom:.875rem;
}
${p}.bench-icon-a{background:#f5f3ff;border-color:#ede9fe;color:#7c3aed}
${p}.bench-icon-b{background:#fff7ed;border-color:#fed7aa;color:#ea580c}
${p}.bench-icon-c{background:#f0fdf4;border-color:#bbf7d0;color:#16a34a}
${p}.bench-num{
  font-size:.6rem;font-weight:900;letter-spacing:.2em;text-transform:uppercase;color:#94a3b8;
}
${p}.bench-title{
  font-size:.9375rem;font-weight:800;color:#1e293b;margin-top:.3125rem;
  word-break:keep-all;line-height:1.45;
}
${p}.bench-desc{
  font-size:.8125rem;color:#64748b;margin-top:.625rem;word-break:keep-all;line-height:1.8;
}

/* ─────────────── INQUIRY ─────────────── */
${p}.inquiry{
  background:linear-gradient(150deg,#060e1c 0%,#0c1c38 35%,#172554 72%,#0f172a 100%);
  position:relative;overflow:hidden;
}
${p}.inquiry-blob{
  position:absolute;top:-12%;right:-4%;width:48%;height:48%;min-width:240px;
  background:radial-gradient(circle,rgba(37,99,235,.13) 0%,transparent 70%);
  border-radius:50%;filter:blur(64px);pointer-events:none;
}
${p}.inquiry-blob-b{
  position:absolute;bottom:-8%;left:-4%;width:36%;height:36%;min-width:180px;
  background:radial-gradient(circle,rgba(249,115,22,.09) 0%,transparent 70%);
  border-radius:50%;filter:blur(52px);pointer-events:none;
}
${p}.inquiry-inner{
  position:relative;max-width:800px;margin:0 auto;display:grid;gap:3rem;
}
@media(min-width:640px){${p}.inquiry-inner{grid-template-columns:1fr 1fr;align-items:start;gap:3.5rem}}
${p}.inquiry-eyebrow{color:var(--re-orange)}
${p}.inquiry-h2{color:#fff}
${p}.inquiry-body{color:rgba(203,213,225,.86)}
${p}.inquiry-list{margin-top:1.875rem;list-style:none;display:flex;flex-direction:column;gap:.9375rem}
${p}.inquiry-list li{
  display:flex;align-items:flex-start;gap:.625rem;
  font-size:.875rem;color:#bfdbfe;word-break:keep-all;line-height:1.8;font-weight:500;
}
${p}.inquiry-check{
  flex-shrink:0;width:1.0625rem;height:1.0625rem;border-radius:50%;
  background:linear-gradient(135deg,#f97316,#ea580c);
  display:flex;align-items:center;justify-content:center;
  font-size:.55rem;color:#fff;margin-top:.2rem;
  box-shadow:0 2px 7px rgba(249,115,22,.4);
}
${p}.inquiry-phone{
  display:flex;align-items:center;gap:.875rem;margin-top:2rem;
  border:1px solid rgba(255,255,255,.1);border-radius:1rem;
  background:rgba(255,255,255,.05);padding:.875rem 1.125rem;
  backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  transition:background .2s var(--re-ease),border-color .2s var(--re-ease);
}
${p}.inquiry-phone:hover{background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.2)}
${p}.inquiry-phone-icon{font-size:1.375rem;color:#fb923c;flex-shrink:0}
${p}.inquiry-phone-label{
  font-size:.6rem;color:#64748b;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
}
${p}.inquiry-phone-num{
  font-size:.9375rem;font-weight:900;color:#fff;letter-spacing:.02em;
  transition:color .2s var(--re-ease);
}
${p}.inquiry-phone:hover .inquiry-phone-num{color:#fed7aa}

/* form box — glassmorphism */
${p}.form-box{
  background:rgba(255,255,255,.062);
  border:1px solid rgba(255,255,255,.13);
  border-radius:1.25rem;padding:1.75rem;
  backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  box-shadow:0 8px 36px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.09);
}
${p}.form-title{
  font-size:.9375rem;font-weight:800;color:#fff;margin-bottom:1.25rem;letter-spacing:-.02em;
}
${p}.form-row-2{display:grid;grid-template-columns:1fr 1fr;gap:.625rem}
@media(max-width:420px){${p}.form-row-2{grid-template-columns:1fr}}
${p}.form-group{margin-bottom:.75rem}
${p}.form-label{
  display:block;font-size:.6875rem;font-weight:700;color:#94a3b8;
  margin-bottom:.375rem;letter-spacing:.04em;
}
${p}.form-input{
  width:100%;background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.1);
  border-radius:.5rem;padding:.6875rem .875rem;
  font-size:.875rem;color:#fff;outline:none;
  transition:border-color .2s var(--re-ease),background .2s var(--re-ease),box-shadow .2s var(--re-ease);
}
${p}.form-input:focus{
  border-color:rgba(249,115,22,.52);background:rgba(255,255,255,.1);
  box-shadow:0 0 0 3px rgba(249,115,22,.14);
}
${p}.form-input::placeholder{color:rgba(100,116,139,.65)}
${p}.form-static{
  width:100%;background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.07);
  border-radius:.5rem;padding:.6875rem .875rem;
  font-size:.875rem;color:#64748b;
}
${p}.form-textarea{
  width:100%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);
  border-radius:.5rem;padding:.6875rem .875rem;font-size:.875rem;
  color:#fff;outline:none;height:88px;resize:vertical;
  transition:border-color .2s var(--re-ease),background .2s var(--re-ease),box-shadow .2s var(--re-ease);
}
${p}.form-textarea:focus{
  border-color:rgba(249,115,22,.52);background:rgba(255,255,255,.1);
  box-shadow:0 0 0 3px rgba(249,115,22,.14);
}
${p}.form-textarea::placeholder{color:rgba(100,116,139,.65)}
${p}.form-select{
  width:100%;background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.1);
  border-radius:.5rem;padding:.6875rem 2.25rem .6875rem .875rem;
  font-size:.875rem;color:#fff;outline:none;cursor:pointer;
  -webkit-appearance:none;appearance:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right .75rem center;
  transition:border-color .2s var(--re-ease),background .2s var(--re-ease),box-shadow .2s var(--re-ease);
}
${p}.form-select option{background:#1e2d47;color:#fff}
${p}.form-select:focus{
  border-color:rgba(249,115,22,.52);background-color:rgba(255,255,255,.1);
  box-shadow:0 0 0 3px rgba(249,115,22,.14);
}
${p}.form-submit{
  width:100%;display:flex;align-items:center;justify-content:center;gap:.5rem;
  background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;
  border-radius:.5rem;padding:.8125rem;
  font-size:.875rem;font-weight:800;margin-top:.375rem;
  cursor:pointer;letter-spacing:-.01em;
  box-shadow:0 2px 14px rgba(249,115,22,.32);
  transition:transform .2s var(--re-ease),box-shadow .2s var(--re-ease),opacity .2s var(--re-ease);
}
${p}.form-submit:hover{
  transform:translateY(-2px);box-shadow:0 6px 24px rgba(249,115,22,.42);
}
${p}.form-submit:active{transform:translateY(0)}
${p}.form-note{text-align:center;font-size:.6rem;color:#475569;margin-top:.5rem}
${p}.form-notice{
  margin-top:1rem;padding:.625rem .875rem;border-radius:.5625rem;
  background:rgba(249,115,22,.08);
  border:1px solid rgba(249,115,22,.2);
  font-size:.6875rem;color:#fed7aa;text-align:center;word-break:keep-all;line-height:1.65;
}

/* ─────────────── SEO ─────────────── */
${p}.seo{background:#fff}
${p}.seo-rows{margin-top:2rem;display:flex;flex-direction:column;gap:.875rem}
${p}.seo-row{
  display:flex;flex-direction:column;gap:.3125rem;
  border:1px solid #f1f5f9;border-radius:1rem;background:#fafbfc;
  padding:1.0625rem 1.25rem;
  transition:border-color .2s var(--re-ease),box-shadow .2s var(--re-ease);
}
@media(min-width:640px){${p}.seo-row{flex-direction:row;align-items:baseline;gap:1.25rem}}
${p}.seo-row:hover{border-color:#bfdbfe;box-shadow:var(--re-shadow-sm)}
${p}.seo-label{
  width:7.5rem;flex-shrink:0;font-size:.6rem;font-weight:800;
  letter-spacing:.14em;text-transform:uppercase;color:#94a3b8;padding-top:.125rem;
}
${p}.seo-value{font-size:.875rem;font-weight:600;color:#1e293b;word-break:keep-all;line-height:1.75}
${p}.kw-header{
  display:flex;align-items:center;gap:.5rem;margin-top:1.875rem;margin-bottom:.875rem;
  font-size:.65rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#64748b;
}
${p}.kw-chips{display:flex;flex-wrap:wrap;gap:.5rem}
${p}.kw-chip{
  border:1px solid #bfdbfe;border-radius:9999px;
  background:linear-gradient(135deg,#eff6ff,#dbeafe);
  padding:.3125rem .875rem;font-size:.75rem;font-weight:700;color:var(--re-blue);
  transition:transform .2s var(--re-ease),box-shadow .2s var(--re-ease),background .2s var(--re-ease);
}
${p}.kw-chip:hover{
  transform:translateY(-2px);box-shadow:var(--re-shadow-blue);
  background:linear-gradient(135deg,#dbeafe,#bfdbfe);
}

/* ─────────────── STRUCTURE ─────────────── */
${p}.structure{background:#f8fafc}
${p}.structure-list{list-style:none;margin-top:2.25rem;display:flex;flex-direction:column;gap:.875rem}
${p}.structure-item{
  display:flex;align-items:flex-start;gap:1.125rem;
  border:1px solid var(--re-border);border-radius:1rem;background:#fff;
  padding:1.125rem;box-shadow:var(--re-shadow-sm);
  transition:transform .2s var(--re-ease),border-color .2s var(--re-ease),box-shadow .2s var(--re-ease);
}
${p}.structure-item:hover{
  transform:translateX(5px);border-color:#bfdbfe;box-shadow:var(--re-shadow-md);
}
${p}.structure-num{
  flex-shrink:0;width:2.125rem;height:2.125rem;border-radius:.5625rem;
  background:linear-gradient(135deg,#3b82f6,#1d4ed8);
  display:flex;align-items:center;justify-content:center;
  font-size:.875rem;font-weight:900;color:#fff;
  box-shadow:0 2px 8px rgba(29,78,216,.28);
}
${p}.structure-name{
  font-size:.9375rem;font-weight:800;color:#0a1628;word-break:keep-all;line-height:1.4;
}
${p}.structure-desc{
  font-size:.78125rem;color:#64748b;margin-top:.3125rem;word-break:keep-all;line-height:1.7;
}

/* ─────────────── CTA ─────────────── */
${p}.cta{
  background:linear-gradient(150deg,#060e1c 0%,#0a1628 28%,rgba(120,40,15,.22) 58%,#0f172a 100%);
  position:relative;overflow:hidden;
}
${p}.cta-glow{
  position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(ellipse 55% 45% at 50% 58%,rgba(234,88,12,.1),transparent 72%);
}
${p}.cta-inner{position:relative;max-width:800px;margin:0 auto}
${p}.cta-body{
  display:flex;flex-direction:column;align-items:center;gap:2.5rem;text-align:center;
}
@media(min-width:640px){${p}.cta-body{flex-direction:row;align-items:flex-start;gap:3.5rem;text-align:left}}
${p}.score-ring{
  flex-shrink:0;width:7.5rem;height:7.5rem;border-radius:50%;
  border:3px solid rgba(249,115,22,.28);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:rgba(255,255,255,.04);
  box-shadow:
    0 0 0 6px rgba(249,115,22,.06),
    0 0 44px rgba(249,115,22,.09),
    inset 0 1px 0 rgba(255,255,255,.09);
}
${p}.score-val{
  font-size:2.25rem;font-weight:900;color:#fff;line-height:1;letter-spacing:-.04em;
}
${p}.score-denom{font-size:.6rem;color:#64748b;margin-top:.125rem;font-weight:600}
${p}.score-label{
  margin-top:.625rem;font-size:.7rem;font-weight:700;color:#fb923c;
  text-align:center;letter-spacing:.04em;
}
${p}.cta-text{flex:1}
${p}.cta-footer{
  margin-top:4rem;padding-top:1.75rem;border-top:1px solid rgba(255,255,255,.08);
  text-align:center;font-size:.6875rem;color:#334155;letter-spacing:.03em;
}

/* ── reduced motion ── */
@media(prefers-reduced-motion:reduce){
  ${p}.btn,${p}.trust-card,${p}.listing-card,${p}.market-stat,
  ${p}.bench-card,${p}.structure-item,${p}.kw-chip{
    transition:none!important;transform:none!important;
  }
}`;
}

// ─── section HTML generators ──────────────────────────────────────────────────

function heroHtml(content: GeneratedContent, config: ProjectConfig): string {
  const seoTitle = content.seo.rows.find((r) => r.label === "사이트 제목")?.value ?? content.region.title;
  const metaDesc = content.seo.rows.find((r) => r.label === "메타 디스크립션")?.value ?? content.region.body;
  const stats = [
    { val: "2,400+", label: "거래 완료" },
    { val: "15년",   label: "업력" },
    { val: "98%",    label: "고객 만족도" },
    { val: `${content.report.score}점`, label: "시장 적합도" },
  ];
  return `
<section id="hero" class="hero" aria-label="히어로">
  <div class="hero-grid"></div>
  <div class="hero-noise"></div>
  <div class="hero-blob hero-blob-a"></div>
  <div class="hero-blob hero-blob-b"></div>
  <div class="hero-blob hero-blob-c"></div>
  <div class="hero-inner">
    <div class="hero-pill">
      <span class="hero-dot"></span>
      <span>${esc(config.region)} · ${esc(config.propertyType)} ${esc(config.transactionType)} 전문</span>
    </div>
    <h1 class="ko-h">${esc(seoTitle)}</h1>
    <p class="hero-sub ko">${esc(metaDesc)}</p>
    <div class="btn-row">
      <a href="tel:010-0000-0000" class="btn btn-orange">&#128222; 무료 상담 신청</a>
      <a href="#listings" class="btn btn-outline">매물 검색하기 &#8594;</a>
    </div>
    <div class="hero-ticks">
      ${["공인중개사 직영", "실매물 100%", "계약 완료 보증"].map((t) => `
      <span class="hero-tick"><span class="tick-icon">&#10003;</span>${esc(t)}</span>`).join("")}
    </div>
    <div class="stats-bar" role="list">
      ${stats.map(({ val, label }) => `
      <div class="stat-cell" role="listitem">
        <div class="stat-val">${esc(val)}</div>
        <div class="stat-label">${esc(label)}</div>
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

function trustHtml(config: ProjectConfig): string {
  const badges = [
    { icon: "🛡", name: "한국공인중개사협회 인증", sub: "정식 등록 법인" },
    { icon: "🏢", name: `${config.region} 전문 에이전트`,  sub: "지역 밀착형 서비스" },
    { icon: "👥", name: "B2B 기업 파트너사",              sub: "법인 계약 특화" },
    { icon: "🏆", name: "우수 중개법인 선정",             sub: "3년 연속 수상" },
    { icon: "📞", name: "실시간 1:1 상담",               sub: "평일 09:00–18:00" },
  ];
  return `
<section id="trust" class="trust" aria-label="신뢰 지표">
  <div class="trust-header">신뢰할 수 있는 이유</div>
  <div class="trust-grid">
    ${badges.map(({ icon, name, sub }) => `
    <div class="trust-card">
      <div class="trust-icon">${icon}</div>
      <div class="trust-name">${esc(name)}</div>
      <div class="trust-sub">${esc(sub)}</div>
    </div>`).join("")}
  </div>
</section>`;
}

function listingsHtml(config: ProjectConfig): string {
  const isLease = config.transactionType === "월세" || config.transactionType === "임대";
  const listings = [
    { id: "A-001", area: "660㎡ (200평)",   floor: "지상 1층",    icon: "🏭",
      price: isLease ? "보증금 3천 / 월 180만" : "6억 5천만원",
      tag: "즉시입주", tagCls: "tag-green",  feature: "물류 동선 최적화" },
    { id: "B-047", area: "1,650㎡ (500평)", floor: "지상 2층",    icon: "🏗",
      price: isLease ? "보증금 5천 / 월 350만" : "15억원",
      tag: "인기 매물", tagCls: "tag-orange", feature: "대형 하역장 완비" },
    { id: "C-123", area: "3,300㎡ (1,000평)", floor: "단층 + 다락", icon: "🔌",
      price: isLease ? "월 700만 (협의)" : "28억원 (협의)",
      tag: "신규 등록", tagCls: "tag-blue",   feature: "전기 용량 확장 가능" },
  ];
  return `
<section id="listings" class="listings section" aria-label="추천 매물">
  <div class="inner">
    <p class="eyebrow">추천 매물</p>
    <h2 class="h2 ko-h">${esc(config.region)} ${esc(config.propertyType)} 매물 목록</h2>
    <p class="body ko">검증된 실매물만 등록합니다. 상세 정보는 담당 에이전트에게 문의해 주세요.</p>
    <div class="listings-grid">
      ${listings.map((l) => `
      <div class="listing-card">
        <div class="listing-thumb">
          <span style="font-size:3rem">${l.icon}</span>
          <span class="listing-tag ${esc(l.tagCls)}">${esc(l.tag)}</span>
          <span class="listing-id">#${esc(l.id)}</span>
        </div>
        <div class="listing-body">
          <div class="listing-title">${esc(config.propertyType)} · ${esc(l.area)}</div>
          <div class="listing-meta">
            <div class="listing-meta-row"><span class="listing-meta-icon">📍</span>${esc(config.region)}</div>
            <div class="listing-meta-row"><span class="listing-meta-icon">📐</span>${esc(l.floor)} · ${esc(l.area)}</div>
            <div class="listing-meta-row"><span class="listing-meta-icon">✅</span>${esc(l.feature)}</div>
          </div>
          <div class="listing-price-label">${esc(config.transactionType)}</div>
          <div class="listing-price">${esc(l.price)}</div>
          <a href="#inquiry" class="listing-btn">상세 보기 ›</a>
        </div>
      </div>`).join("")}
    </div>
    <div class="listings-more">
      <a href="#listings" class="btn btn-outline-dark">🔍 전체 매물 보기</a>
    </div>
  </div>
</section>`;
}

function marketHtml(content: GeneratedContent, config: ProjectConfig): string {
  const firstSentence = content.region.body.split(/[.。!！]/)[0]?.trim() ?? "";
  const stats = [
    { val: "+12%", name: "수요 증가율",    sub: "전년 대비" },
    { val: "32일", name: "평균 거래 기간", sub: "중개 착수 후" },
    { val: "4.2%", name: "공실률",         sub: `${config.region} 기준` },
  ];
  return `
<section id="market" class="market section" aria-label="시장 분석">
  <div class="inner">
    <p class="eyebrow">지역 시장 분석</p>
    <h2 class="h2 ko-h">${esc(content.region.title)}</h2>
    <p class="body ko">${esc(content.region.body)}</p>
    <div class="market-stats">
      ${stats.map(({ val, name, sub }) => `
      <div class="market-stat">
        <div class="market-stat-val">${esc(val)}</div>
        <div class="market-stat-name">${esc(name)}</div>
        <div class="market-stat-sub">${esc(sub)}</div>
      </div>`).join("")}
    </div>
    <blockquote class="market-quote">
      <p>${esc(firstSentence)}.</p>
      <cite>— AI 시장 분석 리포트</cite>
    </blockquote>
  </div>
</section>`;
}

function benchmarkHtml(content: GeneratedContent): string {
  const sentences = content.benchmark.body.split(/[.。]/).map((s) => s.trim()).filter(Boolean);
  const cards = [
    { icon: "📈", cls: "bench-icon-a", label: "경쟁사 대비 강점" },
    { icon: "🏆", cls: "bench-icon-b", label: "차별화 포인트" },
    { icon: "👥", cls: "bench-icon-c", label: "타깃 고객 전환율" },
  ];
  return `
<section id="benchmark" class="bench section" aria-label="벤치마킹">
  <div class="inner">
    <p class="eyebrow">벤치마킹 인사이트</p>
    <h2 class="h2 ko-h">${esc(content.benchmark.title)}</h2>
    <p class="body ko">${esc(content.benchmark.body)}</p>
    <div class="bench-grid">
      ${cards.map(({ icon, cls, label }, i) => `
      <div class="bench-card">
        <div class="bench-icon ${esc(cls)}">${icon}</div>
        <div class="bench-num">0${i + 1}</div>
        <div class="bench-title">${esc(label)}</div>
        <div class="bench-desc">${esc(sentences[i] ?? "데이터 분석 중")}</div>
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

function inquiryHtml(config: ProjectConfig, projectId: string): string {
  // Unique IDs prevent conflicts when multiple embeds appear on the same WP page
  const fid = `re-${projectId}`;
  const typeOptions = ["공장 매매", "공장 임대", "창고 매매", "창고 임대", "토지", "기타"];
  return `
<section id="inquiry" class="inquiry section" aria-label="문의">
  <div class="inquiry-blob"></div>
  <div class="inquiry-blob-b"></div>
  <div class="inquiry-inner">
    <div>
      <p class="eyebrow inquiry-eyebrow">1:1 전문 상담</p>
      <h2 class="h2 ko-h inquiry-h2">지금 바로<br>상담을 시작하세요</h2>
      <p class="body ko inquiry-body">
        ${esc(config.region)} ${esc(config.propertyType)} 전문 에이전트가 최적 매물을 찾아드립니다.
        평균 응답 시간 2시간 이내.
      </p>
      <ul class="inquiry-list">
        ${["맞춤 매물 무료 추천", "법인·기업 계약 전담 처리", "계약 후 사후 관리 지원"].map((item) => `
        <li><span class="inquiry-check">✓</span>${esc(item)}</li>`).join("")}
      </ul>
      <a href="tel:1588-0000" class="inquiry-phone">
        <span class="inquiry-phone-icon">📞</span>
        <div>
          <div class="inquiry-phone-label">전화 상담</div>
          <div class="inquiry-phone-num">1588-0000</div>
        </div>
      </a>
    </div>
    <div class="form-box">
      <div class="form-title">상담 신청</div>
      <form id="${fid}-form">
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label" for="${fid}-name">성함</label>
            <input class="form-input" type="text" id="${fid}-name" name="name" placeholder="홍길동" autocomplete="name">
          </div>
          <div class="form-group">
            <label class="form-label" for="${fid}-tel">연락처</label>
            <input class="form-input" type="tel" id="${fid}-tel" name="tel" placeholder="010-0000-0000" autocomplete="tel">
          </div>
        </div>
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label" for="${fid}-company">회사명</label>
            <input class="form-input" type="text" id="${fid}-company" name="company" placeholder="(주) 예시기업" autocomplete="organization">
          </div>
          <div class="form-group">
            <label class="form-label" for="${fid}-type">관심 매물 유형</label>
            <select class="form-select" id="${fid}-type" name="type">
              ${typeOptions.map((opt) => `<option value="${esc(opt)}">${esc(opt)}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="${fid}-msg">문의 내용</label>
          <textarea class="form-textarea" id="${fid}-msg" name="message" placeholder="원하시는 매물 조건이나 질문을 입력해주세요"></textarea>
        </div>
        <button type="submit" class="form-submit">💬 상담 신청하기</button>
        <div class="form-note">※ 접수 후 담당 에이전트가 확인하여 연락드립니다.</div>
      </form>
      <div class="form-notice">
        ℹ️ 실제 접수 연동은 WordPress 폼 플러그인(Contact Form 7, WPForms 등)과 교체하세요.
      </div>
    </div>
  </div>
</section>
<script>
(function(){
  function init(){
    var form=document.getElementById('${fid}-form');
    if(!form)return;
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var data={
        성함:document.getElementById('${fid}-name').value.trim(),
        연락처:document.getElementById('${fid}-tel').value.trim(),
        회사명:document.getElementById('${fid}-company').value.trim(),
        관심매물:document.getElementById('${fid}-type').value,
        문의내용:document.getElementById('${fid}-msg').value.trim(),
      };
      console.log('[Real Estate AI] 상담 신청 데이터:',data);
      alert('상담 신청이 접수되었습니다. 담당자가 확인 후 연락드리겠습니다.');
      form.reset();
    });
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}
  else{init();}
})();
</script>`;
}

function seoHtml(content: GeneratedContent): string {
  const keywordsRow = content.seo.rows.find((r) => r.label === "추천 키워드");
  const keywords = keywordsRow
    ? keywordsRow.value.split(/[,，、\s]+/).map((k) => k.trim()).filter(Boolean)
    : [];
  const mainRows = content.seo.rows.filter((r) => r.label !== "추천 키워드");
  return `
<section id="seo" class="seo section" aria-label="SEO 전략">
  <div class="inner">
    <p class="eyebrow">SEO 전략</p>
    <h2 class="h2 ko-h">${esc(content.seo.title)}</h2>
    <div class="seo-rows">
      ${mainRows.map((r) => `
      <div class="seo-row">
        <span class="seo-label">${esc(r.label)}</span>
        <span class="seo-value">${esc(r.value)}</span>
      </div>`).join("")}
    </div>
    ${keywords.length > 0 ? `
    <div class="kw-header"># 추천 키워드</div>
    <div class="kw-chips">
      ${keywords.map((kw) => `<span class="kw-chip">#${esc(kw)}</span>`).join("")}
    </div>` : ""}
  </div>
</section>`;
}

function structureHtml(content: GeneratedContent): string {
  return `
<section id="structure" class="structure section" aria-label="사이트 구조">
  <div class="inner">
    <p class="eyebrow">사이트 구조 설계</p>
    <h2 class="h2 ko-h">${esc(content.structure.title)}</h2>
    <p class="body ko">AI가 설계한 최적 페이지 구성입니다. 사용자 흐름과 전환율을 고려하였습니다.</p>
    <ol class="structure-list">
      ${content.structure.pages.map((page, i) => {
        const [name = "", ...rest] = page.split(/\s*[—–\-]\s*/);
        const desc = rest.join(" — ").trim();
        return `
      <li class="structure-item">
        <span class="structure-num">${i + 1}</span>
        <div>
          <div class="structure-name">${esc(name.trim())}</div>
          ${desc ? `<div class="structure-desc">${esc(desc)}</div>` : ""}
        </div>
      </li>`;
      }).join("")}
    </ol>
  </div>
</section>`;
}

function ctaHtml(content: GeneratedContent, config: ProjectConfig): string {
  return `
<section id="cta" class="cta section" aria-label="CTA">
  <div class="cta-glow"></div>
  <div class="cta-inner">
    <div class="cta-body">
      <div>
        <div class="score-ring">
          <div class="score-val">${content.report.score}</div>
          <div class="score-denom">/ 100</div>
        </div>
        <div class="score-label">시장 적합도</div>
      </div>
      <div class="cta-text">
        <h2 class="h2 ko-h" style="color:#fff">
          ${esc(config.region)} ${esc(config.propertyType)}<br>전문 파트너와 함께하세요
        </h2>
        <p class="body ko" style="color:rgba(203,214,254,.85)">${esc(content.report.body)}</p>
        <div class="btn-row">
          <a href="tel:010-0000-0000" class="btn btn-orange">📞 무료 상담 신청</a>
          <a href="#listings" class="btn btn-outline">매물 검색 &#8594;</a>
        </div>
      </div>
    </div>
    <div class="cta-footer">
      © 2025 ${esc(config.region)} ${esc(config.propertyType)} 전문 플랫폼 &nbsp;·&nbsp;
      AI 생성 미리보기 &nbsp;·&nbsp; 외부 미공개
    </div>
  </div>
</section>`;
}

// ─── shared body builder ──────────────────────────────────────────────────────

function buildSections(content: GeneratedContent, config: ProjectConfig, projectId: string): string {
  return [
    heroHtml(content, config),
    trustHtml(config),
    listingsHtml(config),
    marketHtml(content, config),
    benchmarkHtml(content),
    inquiryHtml(config, projectId),
    seoHtml(content),
    structureHtml(content),
    ctaHtml(content, config),
  ].join("\n");
}

// ─── public API ───────────────────────────────────────────────────────────────

/** Full standalone HTML file (for download). */
export function generateLandingPageHtml(
  content: GeneratedContent,
  config: ProjectConfig,
  projectId: string
): string {
  const seoTitle = content.seo.rows.find((r) => r.label === "사이트 제목")?.value
    ?? `${config.region} ${config.propertyType} 전문`;
  const metaDesc = content.seo.rows.find((r) => r.label === "메타 디스크립션")?.value ?? "";

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${esc(metaDesc)}">
  <title>${esc(seoTitle)}</title>
  <!-- Generated by Real Estate AI Builder · project: ${esc(projectId)} · DO NOT PUBLISH -->
  <style>${buildCss("", true)}</style>
</head>
<body>
${buildSections(content, config, projectId)}
</body>
</html>`;
}

/** Scoped snippet for WordPress / Elementor HTML widget (no html/head/body). */
export function generateWordPressEmbed(
  content: GeneratedContent,
  config: ProjectConfig,
  projectId: string
): string {
  const containerId = `real-estate-ai-landing-${projectId}`;
  const scope = `.${containerId}`;
  return `<!-- Real Estate AI Landing · project: ${esc(projectId)} · paste into Elementor → HTML widget -->
<style>${buildCss(`${scope} `, false)}</style>
<div class="${containerId}">
${buildSections(content, config, projectId)}
</div>`;
}

/** Triggers a file download in the browser. */
export function downloadLandingPageHtml(
  content: GeneratedContent,
  config: ProjectConfig,
  projectId: string
): void {
  const html = generateLandingPageHtml(content, config, projectId);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `real-estate-landing-${projectId}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Copies the WordPress embed snippet to the clipboard. Returns true on success. */
export async function copyWordPressEmbed(
  content: GeneratedContent,
  config: ProjectConfig,
  projectId: string
): Promise<boolean> {
  try {
    const snippet = generateWordPressEmbed(content, config, projectId);
    await navigator.clipboard.writeText(snippet);
    return true;
  } catch {
    return false;
  }
}
