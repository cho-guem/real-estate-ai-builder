import type { ElementorContainer, ElementorElement, ElementorExportDocument, ElementorWidget } from "@/types/elementor.types";
import type { GeneratedSiteData } from "@/types/generated-site.types";

type StableWidgetType = "heading" | "text-editor" | "button" | "image" | "spacer" | "shortcode";

export interface ElementorExportDebugLog {
  exportedSectionCount: number;
  widgetCount: number;
  skippedInvalidNodes: string[];
  sectionSummaries: Array<{
    label: string;
    columnCount: number;
    widgetCount: number;
  }>;
}

function createIdFactory() {
  let count = 0;
  return () => `el${(count++).toString(36).padStart(5, "0")}`;
}

function compactText(value: string | undefined, fallback: string) {
  const text = value?.trim() || fallback;
  return text.replace(/\s+/g, " ");
}

function dimensions(top: number, right = top, bottom = top, left = right) {
  return {
    unit: "px",
    top: String(top),
    right: String(right),
    bottom: String(bottom),
    left: String(left),
    isLinked: false,
  };
}

function fontSize(size: number) {
  return { unit: "px", size };
}

function percent(size: number) {
  return { unit: "%", size };
}

function createElementorBuilder(fontFamily = "Noto Sans KR, system-ui, -apple-system, sans-serif") {
  const nextId = createIdFactory();
  const skippedInvalidNodes: string[] = [];

  function widget(widgetType: StableWidgetType, settings: Record<string, unknown>): ElementorWidget {
    return {
      id: nextId(),
      elType: "widget",
      widgetType,
      settings,
      elements: [],
    };
  }

  function heading(
    title: string,
    headerSize: "h1" | "h2" | "h3" = "h2",
    settings: Record<string, unknown> = {}
  ) {
    const isHero = headerSize === "h1";
    return widget("heading", {
      title: compactText(title, "제목"),
      header_size: headerSize,
      title_color: "#0f172a",
      typography_typography: "custom",
      typography_font_family: fontFamily,
      typography_font_size: fontSize(isHero ? 56 : headerSize === "h2" ? 34 : 20),
      ...(isHero
        ? {
            typography_font_size_tablet: fontSize(42),
            typography_font_size_mobile: fontSize(32),
          }
        : {}),
      typography_font_weight: "700",
      typography_line_height: { unit: "em", size: isHero ? 1.15 : 1.25 },
      typography_letter_spacing: { unit: "em", size: isHero ? -0.02 : 0 },
      _margin: dimensions(0, 0, 14, 0),
      ...settings,
    });
  }

  function text(editor: string, settings: Record<string, unknown> = {}) {
    return widget("text-editor", {
      editor: compactText(editor, "내용을 입력하세요."),
      text_color: "#475569",
      typography_typography: "custom",
      typography_font_family: fontFamily,
      typography_font_size: fontSize(16),
      typography_line_height: { unit: "em", size: 1.65 },
      _margin: dimensions(0, 0, 12, 0),
      ...settings,
    });
  }

  function button(label: string, url = "#", settings: Record<string, unknown> = {}) {
    return widget("button", {
      text: compactText(label, "자세히 보기"),
      link: { url },
      button_text_color: "#ffffff",
      background_color: "#f97316",
      border_radius: dimensions(10),
      text_padding: dimensions(13, 20),
      typography_typography: "custom",
      typography_font_weight: "700",
      _margin: dimensions(8, 8, 0, 0),
      ...settings,
    });
  }

  function spacer(height = 80, settings: Record<string, unknown> = {}) {
    return widget("spacer", {
      space: { unit: "px", size: height },
      ...settings,
    });
  }

  function shortcode(code: string, settings: Record<string, unknown> = {}) {
    return widget("shortcode", {
      shortcode: code,
      _margin: dimensions(10, 0, 10, 0),
      ...settings,
    });
  }

  function imagePlaceholder(settings: Record<string, unknown> = {}) {
    return widget("image", {
      image: {
        url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='420' viewBox='0 0 640 420'%3E%3Crect width='640' height='420' fill='%23f1f5f9'/%3E%3Ctext x='320' y='218' text-anchor='middle' font-family='Arial' font-size='24' fill='%2364758b'%3EProperty preview%3C/text%3E%3C/svg%3E",
      },
      image_size: "large",
      _border_radius: dimensions(14),
      _margin: dimensions(0, 0, 16, 0),
      ...settings,
    });
  }

  // Latest Elementor templates are most editable when the top-level structure is
  // container -> nested containers/widgets. We avoid section/column nodes here.
  function container(
    label: string,
    elements: ElementorElement[],
    settings: Record<string, unknown> = {}
  ): ElementorContainer {
    if (elements.length === 0) {
      skippedInvalidNodes.push(`Skipped empty container: ${label}`);
    }
    return {
      id: nextId(),
      elType: "container",
      settings: {
        content_width: "boxed",
        width: percent(100),
        boxed_width: { unit: "px", size: 1140 },
        flex_direction: "column",
        gap: { unit: "px", size: 20 },
        padding: dimensions(64, 24),
        ...settings,
      },
      elements,
    };
  }

  function row(label: string, elements: ElementorElement[], settings: Record<string, unknown> = {}) {
    return container(label, elements, {
      content_width: "full",
      flex_direction: "row",
      gap: { unit: "px", size: 24 },
      padding: dimensions(0),
      ...settings,
    });
  }

  function card(label: string, elements: ElementorElement[], settings: Record<string, unknown> = {}) {
    return container(label, elements, {
      content_width: "full",
      padding: dimensions(24),
      background_background: "classic",
      background_color: "#ffffff",
      border_border: "solid",
      border_color: "#e2e8f0",
      border_width: dimensions(1),
      border_radius: dimensions(18),
      box_shadow_box_shadow_type: "yes",
      box_shadow_box_shadow: {
        horizontal: 0,
        vertical: 14,
        blur: 34,
        spread: 0,
        color: "rgba(15, 23, 42, 0.08)",
      },
      ...settings,
    });
  }

  function debug(content: ElementorContainer[]): ElementorExportDebugLog {
    let widgetCount = 0;
    const countWidgets = (node: ElementorElement): number => {
      if (node.elType === "widget") return 1;
      return node.elements.reduce((sum, child) => sum + countWidgets(child), 0);
    };
    const sectionSummaries = content.map((item, index) => {
      const count = countWidgets(item);
      widgetCount += count;
      return {
        label: `container_${index + 1}`,
        columnCount: item.elements.filter((child) => child.elType === "container").length,
        widgetCount: count,
      };
    });
    return {
      exportedSectionCount: content.length,
      widgetCount,
      skippedInvalidNodes,
      sectionSummaries,
    };
  }

  return { heading, text, button, spacer, shortcode, imagePlaceholder, container, row, card, debug };
}

export function mapGeneratedSiteToElementor(site: GeneratedSiteData): ElementorExportDocument {
  const fontFamily =
    site.typography.fontFamily ??
    (site.typography.styleId === "editorial-serif"
      ? "Georgia, 'Times New Roman', serif"
      : site.typography.styleId === "compact-modern"
        ? "'Helvetica Neue', Arial, sans-serif"
        : "Noto Sans KR, system-ui, -apple-system, sans-serif");
  const b = createElementorBuilder(fontFamily);
  const hero = site.sections.find((item) => item.type === "hero");
  const cta = site.sections.find((item) => item.type === "cta");
  const map = site.sections.find((item) => item.type === "map");
  const trustItems = site.trustItems.length > 0 ? site.trustItems.slice(0, 3) : ["신뢰 근거를 입력하세요."];
  const cards = site.cards.length > 0 ? site.cards.slice(0, 3) : [{ title: "추천 매물", meta: "", price: "", body: "매물 설명" }];

  const content: ElementorContainer[] = [
    b.container(
      "hero",
      [
        b.row("hero_row", [
          b.card(
            "hero_flow",
            [
              b.heading("생성 사이트 구조", "h3", { title_color: site.colors.primary }),
              ...site.sections.slice(0, 5).flatMap((step, index) => [
                b.heading(`${index + 1}. ${step.title}`, "h3", {
                  title_color: site.colors.primary,
                  typography_font_size: fontSize(17),
                }),
                b.text(step.body || "섹션 설명"),
              ]),
            ],
            { width: percent(40) }
          ),
          b.container(
            "hero_copy",
            [
              b.text(site.seo.title, {
                text_color: site.colors.primary,
                typography_font_weight: "700",
              }),
              b.heading(hero?.title ?? site.seo.title, "h1", { title_color: site.colors.primary }),
              b.text(hero?.body ?? site.seo.metaDescription, {
                typography_font_size: fontSize(18),
              }),
              b.row("hero_buttons", [
                b.button(site.cta.primaryLabel, "#inquiry", { background_color: site.colors.accent }),
                b.button(site.cta.secondaryLabel, "#properties", { background_color: site.colors.primary }),
              ], { justify_content: "flex-start", gap: { unit: "px", size: 12 } }),
            ],
            { width: percent(60), padding: dimensions(24, 0, 24, 16) }
          ),
        ]),
      ],
      { background_background: "classic", background_color: site.colors.surface, padding: dimensions(78, 24) }
    ),
    b.container(
      "trust_points",
      [
        b.heading("신뢰 포인트", "h2", { title_color: site.colors.primary }),
        b.row(
          "trust_cards",
          trustItems.map((item, index) =>
            b.card(
              `trust_${index + 1}`,
              [
                b.heading(`신뢰 포인트 ${index + 1}`, "h3", { title_color: site.colors.primary }),
                b.text(item),
              ],
              { width: percent(33.333) }
            )
          )
        ),
      ],
      { background_color: "#ffffff" }
    ),
    b.container(
      "recommended_properties",
      [
        b.heading("추천 매물", "h2", { title_color: site.colors.primary }),
        b.row(
          "property_cards",
          cards.map((card) =>
            b.card(
              `property_${card.title}`,
              [
                b.imagePlaceholder(),
                b.heading(card.title, "h3", { title_color: site.colors.primary }),
                b.text([card.meta, card.price, card.body].filter(Boolean).join("\n")),
              ],
              { width: percent(33.333) }
            )
          )
        ),
      ],
      { background_color: site.colors.surface }
    ),
    b.container(
      "property_search_list",
      [
        b.heading("매물 검색 및 목록", "h2", { title_color: site.colors.primary }),
        b.text("검색 폼과 실제 매물 카드 목록은 플러그인 쇼트코드로 출력됩니다."),
        b.card("property_search_box", [
          b.shortcode("[property_search]"),
          b.shortcode("[property_list]"),
        ]),
      ],
      { background_color: "#ffffff" }
    ),
    b.container(
      "location_map_review",
      [
        b.heading(map?.title ?? "지도 기반 입지 검토", "h2", { title_color: site.colors.primary }),
        b.text(map?.body ?? "주요 입지와 매물 밀집 구역을 보여줍니다."),
        b.card("location_map_box", [
          b.shortcode("[property_location_search]"),
          b.shortcode("[property_map]"),
        ]),
      ],
      { background_color: site.colors.surface }
    ),
    b.container(
      "consultation_cta_form",
      [
        b.row("cta_form_row", [
          b.container(
            "cta_copy",
            [
              b.heading(cta?.title ?? site.cta.headline, "h2", { title_color: "#ffffff" }),
              b.text(cta?.body ?? site.cta.body, { text_color: "rgba(255,255,255,0.82)" }),
              b.button(site.cta.primaryLabel, "#inquiry", { background_color: site.colors.accent }),
            ],
            {
              width: percent(50),
              background_background: "classic",
              background_color: site.colors.primary,
              border_radius: dimensions(20),
              padding: dimensions(36),
            }
          ),
          b.card(
            "inquiry_form",
            [
              b.heading(site.form.title, "h3", { title_color: site.colors.primary }),
              ...site.form.fields.map((field) =>
                b.text(`입력 필드: ${field}`, {
                  _background_background: "classic",
                  _background_color: "#f8fafc",
                  _padding: dimensions(10, 12),
                })
              ),
              b.button(site.form.submitLabel, "#", { background_color: site.colors.accent }),
            ],
            { width: percent(50) }
          ),
        ]),
      ],
      { background_color: "#ffffff" }
    ),
    b.container(
      "footer",
      [
        b.heading(site.footer.brandName, "h3", { title_color: "#ffffff" }),
        b.text(`${site.footer.description}\n${site.footer.note}`, {
          text_color: "rgba(255,255,255,0.75)",
        }),
      ],
      { background_color: site.colors.primary, padding: dimensions(44, 24) }
    ),
  ];

  return {
    version: "0.4",
    title: site.seo.title,
    type: "page",
    content,
  };
}

export function buildElementorExportDebug(site: GeneratedSiteData): ElementorExportDebugLog {
  const document = mapGeneratedSiteToElementor(site);
  const skippedInvalidNodes: string[] = [];
  let widgetCount = 0;

  const walk = (node: ElementorElement, path: string) => {
    if (node.elType === "widget") {
      widgetCount++;
      if (!node.widgetType) skippedInvalidNodes.push(`Invalid widget at ${path}`);
      return;
    }
    if (node.elType !== "container") {
      skippedInvalidNodes.push(`Invalid container at ${path}`);
      return;
    }
    if (node.elements.length === 0) {
      skippedInvalidNodes.push(`Empty container at ${path}`);
    }
    node.elements.forEach((child, index) => walk(child, `${path}.${index}`));
  };

  const sectionSummaries = document.content.map((container, index) => {
    const before = widgetCount;
    walk(container, `content.${index}`);
    return {
      label: `container_${index + 1}`,
      columnCount: container.elements.filter((child) => child.elType === "container").length,
      widgetCount: widgetCount - before,
    };
  });

  return {
    exportedSectionCount: document.content.length,
    widgetCount,
    skippedInvalidNodes,
    sectionSummaries,
  };
}

export function mapGeneratedSiteToMinimalElementorTest(site: GeneratedSiteData): ElementorExportDocument {
  const b = createElementorBuilder();
  return {
    version: "0.4",
    title: `${site.seo.title} - Minimal Test`,
    type: "page",
    content: [
      b.container("minimal", [
        b.heading(site.seo.title, "h1"),
        b.text(site.seo.metaDescription || "Elementor import smoke test"),
        b.button(site.cta.primaryLabel || "문의하기", "#"),
      ]),
    ],
  };
}

export function renderElementorImportInstructions() {
  return [
    "1. elementor-template.json은 최신 Elementor의 container 기반 템플릿입니다.",
    "2. 섹션 순서는 Hero, Trust, 추천 매물, 검색/목록, 지도 검토, 상담 CTA/Form, Footer입니다.",
    "3. [property_search]는 검색 폼만, [property_list]는 카드 목록만 출력합니다.",
    "4. [property_location_search]는 지역 검색 폼만, [property_map]은 지도 placeholder만 출력합니다.",
  ];
}
