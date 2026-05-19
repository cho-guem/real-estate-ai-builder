export interface ElementorWidget {
  id: string;
  elType: "widget";
  widgetType: string;
  settings: Record<string, unknown>;
  isInner?: boolean;
}

export interface ElementorColumn {
  id: string;
  elType: "column";
  settings: Record<string, unknown>;
  elements: ElementorWidget[];
  isInner?: boolean;
}

export interface ElementorSection {
  id: string;
  elType: "section";
  settings: Record<string, unknown>;
  elements: ElementorColumn[];
  isInner?: boolean;
}

export interface ElementorExportDocument {
  version: "0.4";
  title: string;
  type: "page";
  content: ElementorSection[];
}
