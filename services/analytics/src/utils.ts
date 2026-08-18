let counter = 0;
export function createId(prefix: string, ...parts: (string | number)[]): string {
  return `ft:${prefix}:${parts.join(":")}:${++counter}`;
}
