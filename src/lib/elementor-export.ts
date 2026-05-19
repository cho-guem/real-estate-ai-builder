import type { ElementorColumn, ElementorExportDocument, ElementorSection, ElementorWidget } from "@/types/elementor.types";
import type { GeneratedSiteData } from "@/types/generated-site.types";

type StableWidgetType = "heading" | "text-editor" | "button" | "image" | "spacer";

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

function createElementorBuilder() {
  const nextId = createIdFactory();
  const skippedInvalidNodes: string[] = [];

  function widget(widgetType: StableWidgetType, settings: Record<string, unknown>): ElementorWidget {
    return {
      id: nextId(),
      elType: "widget",
      widgetType,
      settings,
    };
  }

  function heading(
    title: string,
    headerSize: "h1" | "h2" | "h3" = "h2",
    settings: Record<string, unknown> = {}
  ) {
    return widget("heading", {
      title: compactText(title, "제목"),
      header_size: headerSize,
      title_color: "#0f172a",
      typography_typography: "custom",
      typography_font_size: fontSize(headerSize === "h1" ? 48 : headerSize === "h2" ? 32 : 20),
      typography_font_weight: "700",
      _margin: dimensions(0, 0, 12, 0),
      ...settings,
    });
  }

  function text(editor: string, settings: Record<string, unknown> = {}) {
    return widget("text-editor", {
      editor: compactText(editor, "내용을 입력하세요."),
      text_color: "#475569",
      typography_typography: "custom",
      typography_font_size: fontSize(15),
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
      border_radius: dimensions(8),
      text_padding: dimensions(12, 18),
      typography_typography: "custom",
      typography_font_weight: "700",
      _margin: dimensions(8, 8, 0, 0),
      ...settings,
    });
  }

  function spacer(height = 120, settings: Record<string, unknown> = {}) {
    return widget("spacer", {
      space: { unit: "px", size: height },
      ...settings,
    });
  }

  function imagePlaceholder(settings: Record<string, unknown> = {}) {
    // Elementor image widgets expect a URL object. A tiny inline SVG keeps import
    // stable without relying on media-library attachment IDs or icon libraries.
    return widget("image", {
      image: {
        url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'%3E%3Crect width='640' height='360' fill='%23f1f5f9'/%3E%3Ctext x='320' y='188' text-anchor='middle' font-family='Arial' font-size='24' fill='%2364758b'%3EProperty preview%3C/text%3E%3C/svg%3E",
      },
      image_size: "large",
      _border_radius: dimensions(12),
      _margin: dimensions(0, 0, 14, 0),
      ...settings,
    });
  }

  function column(
    elements: ElementorWidget[],
    size: number,
    settings: Record<string, unknown> = {}
  ): ElementorColumn {
    if (elements.length === 0) {
      skippedInvalidNodes.push("Skipped empty column.");
    }
    return {
      id: nextId(),
      elType: "column",
      settings: {
        _column_size: size,
        _inline_size: size,
        padding: dimensions(14),
        ...settings,
      },
      elements,
    };
  }

  function section(
    label: string,
    columns: ElementorColumn[],
    settings: Record<string, unknown> = {}
  ): ElementorSection {
    if (columns.length === 0) {
      skippedInvalidNodes.push(`Skipped empty section: ${label}`);
    }
    return {
      id: nextId(),
      elType: "section",
      settings: {
        layout: "boxed",
        content_width: { unit: "px", size: 1140 },
        gap: "default",
        padding: dimensions(64, 24),
        background_background: "classic",
        ...settings,
      },
      elements: columns,
    };
  }

  function debug(content: ElementorSection[]): ElementorExportDebugLog {
    const sectionSummaries = content.map((item, index) => {
      const widgetCount = item.elements.reduce((sum, col) => sum + col.elements.length, 0);
      return {
        label: `section_${index + 1}`,
        columnCount: item.elements.length,
        widgetCount,
      };
    });
    return {
      exportedSectionCount: content.length,
      widgetCount: sectionSummaries.reduce((sum, item) => sum + item.widgetCount, 0),
      skippedInvalidNodes,
      sectionSummaries,
    };
  }

  return { heading, text, button, spacer, imagePlaceholder, column, section, debug };
}

// Import stability rule: every exported node follows section -> columns -> widgets.
// We only use stable native widgets and avoid unsupported style, responsive, icon,
// form, accordion, and nested container schemas until Elementor import is proven.
// Visual polish is limited to conservative Elementor settings that commonly exist
// on sections, columns, and the stable widgets below: colors, padding, margins,
// typography size/weight, borders, and simple background colors.
export function mapGeneratedSiteToElementor(site: GeneratedSiteData): ElementorExportDocument {
  const b = createElementorBuilder();
  const hero = site.sections.find((item) => item.type === "hero");
  const cta = site.sections.find((item) => item.type === "cta");
  const map = site.sections.find((item) => item.type === "map");
  const heroSteps = site.sections.slice(0, 5);
  const trustItems = site.trustItems.length > 0 ? site.trustItems.slice(0, 3) : ["신뢰 근거를 입력하세요."];
  const cards = site.cards.length > 0 ? site.cards.slice(0, 3) : [{ title: "추천 매물", meta: "", price: "", body: "매물 설명" }];

  const content: ElementorSection[] = [
    b.section("hero", [
      b.column(
        [
          b.heading("생성 사이트 구조", "h3", { title_color: site.colors.primary }),
          ...heroSteps.flatMap((step, index) => [
            b.heading(`${index + 1}. ${step.title}`, "h3", {
              title_color: site.colors.primary,
              typography_font_size: fontSize(17),
            }),
            b.text(step.body || "섹션 설명"),
          ]),
        ],
        40,
        {
          background_background: "classic",
          background_color: "#ffffff",
          border_border: "solid",
          border_color: "#e2e8f0",
          border_width: dimensions(1),
          border_radius: dimensions(16),
          padding: dimensions(24),
        }
      ),
      b.column(
        [
          b.text(site.seo.title, {
            text_color: site.colors.primary,
            typography_font_weight: "700",
          }),
          b.heading(hero?.title ?? site.seo.title, "h1", {
            title_color: site.colors.primary,
            typography_font_size: fontSize(52),
          }),
          b.text(hero?.body ?? site.seo.metaDescription, {
            typography_font_size: fontSize(17),
          }),
          b.button(site.cta.primaryLabel, "#inquiry", {
            background_color: site.colors.accent,
          }),
          b.button(site.cta.secondaryLabel, "#properties", {
            background_color: site.colors.primary,
          }),
        ],
        60,
        { padding: dimensions(28, 18, 28, 34) }
      ),
    ], { background_color: site.colors.surface, padding: dimensions(72, 24) }),
    b.section("navigation", [
      b.column(
        site.navigation.flatMap((item) => [
          b.button(item.label, item.href, {
            background_color: "#ffffff",
            button_text_color: site.colors.primary,
            border_border: "solid",
            border_color: "#e2e8f0",
            border_width: dimensions(1),
          }),
        ]),
        100,
        { padding: dimensions(10) }
      ),
    ], { background_color: "#ffffff", padding: dimensions(22, 24) }),
    b.section(
      "trust_cards",
      trustItems.map((item, index) =>
        b.column(
          [
            b.heading(`신뢰 포인트 ${index + 1}`, "h3", { title_color: site.colors.primary }),
            b.text(item),
          ],
          33.333,
          {
            background_background: "classic",
            background_color: "#ffffff",
            border_border: "solid",
            border_color: "#e2e8f0",
            border_width: dimensions(1),
            border_radius: dimensions(16),
            padding: dimensions(22),
          }
        )
      ),
      { background_color: "#ffffff" }
    ),
    b.section(
      "property_cards",
      cards.map((card) =>
        b.column(
          [
            b.imagePlaceholder(),
            b.heading(card.title, "h3", { title_color: site.colors.primary }),
            b.text([card.meta, card.price, card.body].filter(Boolean).join("\n")),
          ],
          33.333,
          {
            background_background: "classic",
            background_color: "#ffffff",
            border_border: "solid",
            border_color: "#e2e8f0",
            border_width: dimensions(1),
            border_radius: dimensions(16),
            padding: dimensions(20),
          }
        )
      ),
      { background_color: site.colors.surface }
    ),
    b.section("cta_inquiry", [
      b.column(
        [
          b.heading(cta?.title ?? site.cta.headline, "h2", { title_color: "#ffffff" }),
          b.text(cta?.body ?? site.cta.body, { text_color: "rgba(255,255,255,0.82)" }),
          b.button(site.cta.primaryLabel, "#inquiry", { background_color: site.colors.accent }),
        ],
        50,
        {
          background_background: "classic",
          background_color: site.colors.primary,
          border_radius: dimensions(18),
          padding: dimensions(34),
        }
      ),
      b.column(
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
        50,
        {
          background_background: "classic",
          background_color: "#ffffff",
          border_border: "solid",
          border_color: "#e2e8f0",
          border_width: dimensions(1),
          border_radius: dimensions(16),
          padding: dimensions(24),
        }
      ),
    ], { background_color: "#ffffff" }),
    b.section("map", [
      b.column(
        [
          b.heading(map?.title ?? "지도 기반 입지 검토", "h2", { title_color: site.colors.primary }),
          b.text(map?.body ?? "주요 입지와 매물 밀집 구역을 보여줍니다."),
          b.spacer(220, {
            _background_background: "classic",
            _background_color: "#f1f5f9",
            _border_border: "dashed",
            _border_color: "#cbd5e1",
            _border_width: dimensions(1),
          }),
        ],
        100,
        {
          background_background: "classic",
          background_color: "#ffffff",
          border_border: "solid",
          border_color: "#e2e8f0",
          border_width: dimensions(1),
          border_radius: dimensions(18),
          padding: dimensions(24),
        }
      ),
    ], { background_color: site.colors.surface }),
    b.section("footer", [
      b.column(
        [
          b.heading(site.footer.brandName, "h3", { title_color: "#ffffff" }),
          b.text(`${site.footer.description}\n${site.footer.note}`, {
            text_color: "rgba(255,255,255,0.75)",
          }),
        ],
        100,
        { padding: dimensions(8) }
      ),
    ], { background_color: site.colors.primary, padding: dimensions(42, 24) }),
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
  const sectionSummaries = document.content.map((sectionNode, sectionIndex) => {
    if (sectionNode.elType !== "section") {
      skippedInvalidNodes.push(`Invalid section elType at index ${sectionIndex}`);
    }
    if (sectionNode.elements.length === 0) {
      skippedInvalidNodes.push(`Empty section at index ${sectionIndex}`);
    }
    const widgetCount = sectionNode.elements.reduce((sum, columnNode, columnIndex) => {
      if (columnNode.elType !== "column") {
        skippedInvalidNodes.push(`Invalid column elType at section ${sectionIndex}, column ${columnIndex}`);
      }
      if (columnNode.elements.length === 0) {
        skippedInvalidNodes.push(`Empty column at section ${sectionIndex}, column ${columnIndex}`);
      }
      columnNode.elements.forEach((widgetNode, widgetIndex) => {
        if (widgetNode.elType !== "widget" || !widgetNode.widgetType) {
          skippedInvalidNodes.push(
            `Invalid widget at section ${sectionIndex}, column ${columnIndex}, widget ${widgetIndex}`
          );
        }
      });
      return sum + columnNode.elements.length;
    }, 0);
    return {
      label: `section_${sectionIndex + 1}`,
      columnCount: sectionNode.elements.length,
      widgetCount,
    };
  });

  return {
    exportedSectionCount: document.content.length,
    widgetCount: sectionSummaries.reduce((sum, item) => sum + item.widgetCount, 0),
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
      b.section("minimal", [
        b.column(
          [
            b.heading(site.seo.title, "h1"),
            b.text(site.seo.metaDescription || "Elementor import smoke test"),
            b.button(site.cta.primaryLabel || "문의하기", "#"),
          ],
          100
        ),
      ]),
    ],
  };
}

export function renderElementorImportInstructions() {
  return [
    "1. Minimal Elementor Test JSON으로 기본 import를 확인하세요.",
    "2. Safe Elementor JSON은 모든 섹션을 section > column > widget 구조로 내보냅니다.",
    "3. 현재 export는 heading, text-editor, button, image, spacer 위젯만 사용합니다.",
    "4. Export Debug JSON에서 섹션 수, 위젯 수, skipped node 목록을 확인할 수 있습니다.",
  ];
}
