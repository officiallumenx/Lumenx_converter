/** Extract `{{variable}}` tokens from title/message templates. */
export function extractAllowedVariables(...parts: string[]): string[] {
  const found = new Set<string>();
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  for (const part of parts) {
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(part)) !== null) {
      found.add(m[1]!);
    }
  }
  return [...found].sort();
}

export function interpolateTemplate(
  template: string,
  variables: Record<string, string | number | boolean | null | undefined> = {},
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const value = variables[key];
    return value === undefined || value === null ? "" : String(value);
  });
}
