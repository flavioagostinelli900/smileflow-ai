// Browser-safe password helpers used in both admin (create studio) and security settings.

export const PASSWORD_RULES = [
  { id: "len", label: "Almeno 8 caratteri", test: (v: string) => v.length >= 8 },
  { id: "upper", label: "1 lettera maiuscola", test: (v: string) => /[A-Z]/.test(v) },
  { id: "lower", label: "1 lettera minuscola", test: (v: string) => /[a-z]/.test(v) },
  { id: "num", label: "1 numero", test: (v: string) => /\d/.test(v) },
  { id: "special", label: "1 carattere speciale (!@#$%^&*)", test: (v: string) => /[!@#$%^&*]/.test(v) },
];

export function passwordMeetsRules(v: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(v));
}

// Generates a 12-char password with upper, lower, digit and special character guaranteed.
export function generateTempPassword(length = 12): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%^&*";
  const all = upper + lower + digits + special;

  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
  const required = [pick(upper), pick(lower), pick(digits), pick(special)];
  const rest = Array.from({ length: Math.max(0, length - required.length) }, () => pick(all));
  const arr = [...required, ...rest];
  // Fisher–Yates shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}
