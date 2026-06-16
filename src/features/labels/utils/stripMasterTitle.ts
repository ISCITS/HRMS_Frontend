export function stripMasterTitle(strValue: string): string {
  return strValue
    .replace(/\s+Master$/i, "")
    .replace(/\s+मास्टर$/u, "")
    .trim();
}
