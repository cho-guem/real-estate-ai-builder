export interface ElementorWidget {
  id: string;
  elType: "widget";
  widgetType: string;
  settings: Record<string, unknown>;
  elements?: [];
  isInner?: boolean;
}

export interface ElementorContainer {
  id: string;
  elType: "container";
  settings: Record<string, unknown>;
  elements: Array<ElementorContainer | ElementorWidget>;
  isInner?: boolean;
}

export type ElementorElement = ElementorContainer | ElementorWidget;

export interface ElementorExportDocument {
  version: "0.4";
  title: string;
  type: "page";
  content: ElementorContainer[];
}
