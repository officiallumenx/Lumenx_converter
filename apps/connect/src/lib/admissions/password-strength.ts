export type PasswordStrengthLevel = "weak" | "fair" | "good" | "strong";

export type PasswordRuleKey = "length" | "upper" | "lower" | "number";

export const PASSWORD_RULES: { key: PasswordRuleKey; label: string; test: (p: string) => boolean }[] =
  [
    { key: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
    { key: "upper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
    { key: "lower", label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
    { key: "number", label: "One number", test: (p) => /[0-9]/.test(p) },
  ];

export function passwordRuleChecks(password: string): Record<PasswordRuleKey, boolean> {
  return {
    length: PASSWORD_RULES[0]!.test(password),
    upper: PASSWORD_RULES[1]!.test(password),
    lower: PASSWORD_RULES[2]!.test(password),
    number: PASSWORD_RULES[3]!.test(password),
  };
}

export function isStrongPassword(password: string): boolean {
  const c = passwordRuleChecks(password);
  return c.length && c.upper && c.lower && c.number;
}

export function getPasswordStrength(password: string): {
  level: PasswordStrengthLevel;
  score: number;
  label: string;
} {
  if (!password) return { level: "weak", score: 0, label: "Too short" };
  const checks = passwordRuleChecks(password);
  const score = Object.values(checks).filter(Boolean).length;
  if (score <= 1) return { level: "weak", score, label: "Weak" };
  if (score === 2) return { level: "fair", score, label: "Fair" };
  if (score === 3) return { level: "good", score, label: "Good" };
  return { level: "strong", score, label: "Strong" };
}
