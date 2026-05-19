export interface GeneratedSeoRow {
  label: string;
  value: string;
}

export interface GeneratedContent {
  region: {
    title: string;
    body: string;
  };
  benchmark: {
    title: string;
    body: string;
  };
  seo: {
    title: string;
    rows: GeneratedSeoRow[];
  };
  structure: {
    title: string;
    pages: string[];
  };
  report: {
    title: string;
    body: string;
    score: number;
  };
}

export interface GenerateApiResponse {
  ok: true;
  content: GeneratedContent;
}

export interface GenerateApiError {
  ok: false;
  error: string;
  code?: "missing_key" | "api_error" | "parse_error" | "auth_error";
}

export type GenerateApiResult = GenerateApiResponse | GenerateApiError;
