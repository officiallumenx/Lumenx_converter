import { Input, Label } from "@lumenx/ui";
import { cn } from "@lumenx/ui";
import { Eye, EyeOff } from "lucide-react";
import {
  getPasswordStrength,
  PASSWORD_RULES,
  passwordRuleChecks,
  type PasswordStrengthLevel,
} from "@/lib/admissions/password-strength";

const STRENGTH_BAR: Record<PasswordStrengthLevel, string> = {
  weak: "w-1/4 bg-destructive",
  fair: "w-2/4 bg-amber-500",
  good: "w-3/4 bg-sky-500",
  strong: "w-full bg-emerald-500",
};

export function PasswordCreateFields({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmChange,
  showPwd,
  showConfirmPwd,
  onToggleShowPwd,
  onToggleShowConfirmPwd,
  idPrefix = "admissions",
}: {
  password: string;
  confirmPassword: string;
  onPasswordChange: (v: string) => void;
  onConfirmChange: (v: string) => void;
  showPwd: boolean;
  showConfirmPwd: boolean;
  onToggleShowPwd: () => void;
  onToggleShowConfirmPwd: () => void;
  idPrefix?: string;
}) {
  const strength = getPasswordStrength(password);
  const checks = passwordRuleChecks(password);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-password`}>Password</Label>
        <div className="relative">
          <Input
            id={`${idPrefix}-password`}
            type={showPwd ? "text" : "password"}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="Create a strong password"
            autoComplete="new-password"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            onClick={onToggleShowPwd}
            aria-label={showPwd ? "Hide password" : "Show password"}
          >
            {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {password ? (
          <div className="space-y-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all", STRENGTH_BAR[strength.level])}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Strength: <span className="font-medium text-foreground">{strength.label}</span>
            </p>
            <ul className="grid gap-1 text-[11px] text-muted-foreground">
              {PASSWORD_RULES.map((rule) => (
                <li
                  key={rule.key}
                  className={cn(checks[rule.key] ? "text-emerald-600" : "text-muted-foreground")}
                >
                  {checks[rule.key] ? "✓" : "○"} {rule.label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-confirm`}>Re-enter password</Label>
        <div className="relative">
          <Input
            id={`${idPrefix}-confirm`}
            type={showConfirmPwd ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => onConfirmChange(e.target.value)}
            placeholder="Confirm password"
            autoComplete="new-password"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            onClick={onToggleShowConfirmPwd}
            aria-label={showConfirmPwd ? "Hide password" : "Show password"}
          >
            {showConfirmPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {confirmPassword && password !== confirmPassword ? (
          <p className="text-xs text-destructive">Passwords do not match</p>
        ) : null}
      </div>
    </div>
  );
}
