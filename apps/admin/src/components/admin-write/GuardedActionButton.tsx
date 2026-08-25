import { type ButtonHTMLAttributes } from "react";
import { useAdminWriteAccess } from "@/components/admin-write/AdminWriteAccessContext";

type GuardedActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  onGuardedClick?: () => void;
};

export function GuardedActionButton({
  onGuardedClick,
  onClick,
  disabled,
  title,
  ...rest
}: GuardedActionButtonProps) {
  const { writesAllowed, reason, guardWriteAction } = useAdminWriteAccess();
  const blocked = !writesAllowed;

  return (
    <button
      {...rest}
      data-admin-write
      disabled={disabled || blocked}
      title={blocked ? reason ?? title : title}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (!onGuardedClick) return;
        event.preventDefault();
        guardWriteAction(onGuardedClick);
      }}
    />
  );
}
