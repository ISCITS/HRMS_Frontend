export type ModuleLabelsResponse = {
  module: string;
  language: string;
  fallback_language: string | null;
  labels: Record<string, string>;
};

export type AllLabelsResponse = {
  language: string;
  fallback_language: string | null;
  modules: Record<string, Record<string, string>>;
};
