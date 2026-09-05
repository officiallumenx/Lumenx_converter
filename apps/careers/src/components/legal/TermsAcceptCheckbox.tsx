import { Link } from "@tanstack/react-router";
import { Checkbox } from "@lumenx/ui";

type TermsAcceptCheckboxProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  termsTo: string;
  privacyTo: string;
  cookiesTo?: string;
  id?: string;
};

export function TermsAcceptCheckbox({
  checked,
  onCheckedChange,
  termsTo,
  privacyTo,
  cookiesTo,
  id = "accept-terms",
}: TermsAcceptCheckboxProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 px-3 py-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-0.5"
      />
      <label htmlFor={id} className="text-xs leading-relaxed text-muted-foreground cursor-pointer">
        I have read and agree to the{" "}
        <Link
          to={termsTo}
          target="_blank"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Terms & Conditions
        </Link>
        ,{" "}
        <Link
          to={privacyTo}
          target="_blank"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Privacy Policy
        </Link>
        {cookiesTo ? (
          <>
            , and{" "}
            <Link
              to={cookiesTo}
              target="_blank"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Cookie Policy
            </Link>
          </>
        ) : null}
        .
      </label>
    </div>
  );
}
