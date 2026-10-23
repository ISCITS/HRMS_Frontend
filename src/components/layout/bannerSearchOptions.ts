import type { MenuItem } from "@/models/AuthModels";

export type BannerSearchOption = { label: string; route: string; section: string; keywords: string };

export function buildBannerSearchOptions(items: MenuItem[]): BannerSearchOption[] {
  const options: BannerSearchOption[] = [];
  const seen = new Set<string>();
  function visit(nodes: MenuItem[], parents: string[]) {
    for (const node of nodes) {
      const label = node.strModuleName.trim();
      const route = node.strRoute?.trim();
      if (route?.startsWith("/") && !route.startsWith("//") && !route.includes("\\") && !seen.has(route)) {
        seen.add(route);
        options.push({ label, route, section: parents.join(" / "), keywords: [...parents, label, node.strModuleCode].join(" ").toLocaleLowerCase() });
      }
      visit(node.lstChildren ?? [], [...parents, label]);
    }
  }
  visit(items, []);
  return options;
}

export function filterBannerSearchOptions(options: BannerSearchOption[], input: string) {
  const query = input.trim().toLocaleLowerCase();
  const words = query.split(/\s+/).filter(Boolean);
  return options.filter(option => words.every(word => option.keywords.includes(word)))
    .sort((a, b) => Number(b.label.toLocaleLowerCase().startsWith(query)) - Number(a.label.toLocaleLowerCase().startsWith(query)) || a.label.localeCompare(b.label))
    .slice(0, 12);
}
