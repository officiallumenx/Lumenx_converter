import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { cn, useMediaQuery } from "@lumenx/ui";
import { useKeyboardViewport } from "@/lib/use-keyboard-viewport-offset";

type LoginKeyboardShellProps = {
  children: ReactNode;
  /** Logo + portal title + step indicator — stays pinned while the form scrolls under the keyboard. */
  header?: ReactNode;
  className?: string;
  /** Login wizard step — scroll resets when this changes so Back does not leave content off-screen. */
  stepKey?: string;
};

/**
 * Mobile login layout (app-style):
 * - Fixed to the visible viewport (visualViewport), not the full document.
 * - Form stays top-anchored — no vertical centering that jumps when the keyboard opens.
 * - Only the form panel scrolls; brand/stepper stay put.
 */
export function LoginKeyboardShell({ children, header, className, stepKey }: LoginKeyboardShellProps) {
  const { height: viewportHeight, offsetTop, open: keyboardOpen } = useKeyboardViewport();
  const scrollRef = useRef<HTMLDivElement>(null);
  const wasKeyboardOpen = useRef(false);
  const isMobileLayout = useMediaQuery("(max-width: 1023px)");

  useEffect(() => {
    if (!stepKey) return;
    scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [stepKey]);

  useEffect(() => {
    if (!isMobileLayout) return;
    if (wasKeyboardOpen.current && !keyboardOpen) {
      scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
    }
    wasKeyboardOpen.current = keyboardOpen;
  }, [keyboardOpen, isMobileLayout]);

  const mobileShellStyle =
    isMobileLayout && viewportHeight > 0
      ? ({
          "--login-vv-height": `${viewportHeight}px`,
          "--login-vv-offset-top": `${offsetTop}px`,
        } as CSSProperties)
      : undefined;

  return (
    <div
      className={cn(
        "login-keyboard-shell relative flex flex-col lg:min-h-0 lg:justify-center",
        isMobileLayout && "login-keyboard-shell--mobile",
        isMobileLayout && keyboardOpen && "login-keyboard-shell--open",
        className,
      )}
      style={mobileShellStyle}
    >
      <div
        ref={scrollRef}
        className="login-keyboard-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain lg:overflow-visible"
      >
        {header ? <div className="login-keyboard-header shrink-0">{header}</div> : null}
        <div className="login-form-panel mx-auto flex w-full max-w-sm flex-col px-1 pb-3 pt-1 sm:px-0 sm:py-4 lg:flex-1 lg:justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}
