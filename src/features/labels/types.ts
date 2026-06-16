export type ModuleLabelsResponse = {
  module: string;
  language: string;
  fallback_language: string | null;
  labels: Record<string, string>;
};
