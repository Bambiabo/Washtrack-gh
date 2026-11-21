export function normalizeGhanaPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");

  if (digits.length === 10 && digits.startsWith("0")) return `+233${digits.slice(1)}`;
  if (digits.length === 9 && /^[235]\d{8}$/.test(digits)) return `+233${digits}`;
  if (digits.length === 12 && digits.startsWith("233")) return `+${digits}`;

  return null;
}

export function formatGhs(amount: number | string) {
  return `GH\u20b5 ${Number(amount || 0).toFixed(2)}`;
}
