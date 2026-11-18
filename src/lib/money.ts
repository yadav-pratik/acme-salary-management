export function parseSalaryMinor(amount: string, minorUnits: number): number | null {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(amount.trim());
  if (!match || (match[2]?.length ?? 0) > minorUnits) return null;

  const fraction = (match[2] ?? "").padEnd(minorUnits, "0");
  const value = BigInt(match[1] + fraction);
  if (value <= 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(value);
}

export function formatSalary(amountMinor: number, currency: string, minorUnits: number) {
  const value = BigInt(amountMinor);
  const factor = 10n ** BigInt(minorUnits);
  const whole = new Intl.NumberFormat("en-US").format(value / factor);
  const fraction = minorUnits > 0 ? "." + (value % factor).toString().padStart(minorUnits, "0") : "";
  return `${currency} ${whole}${fraction}`;
}
