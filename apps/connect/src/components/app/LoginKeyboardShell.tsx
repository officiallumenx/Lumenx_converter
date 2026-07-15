import { useEffect, useRef, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { cn } from "@lumenx/ui";
import { useKeyboardViewport } from "@/lib/use-keyboard-viewport-offset";

type LoginKeyboardShellProps = {
  children: ReactNode;
  /** Logo + portal title + step indicator — stays pinned while the form scrolls under the keyboard. */
  header?: ReactNode;
  className?: string;
  /** Login wizard step — scroll resets when this changes so Back does not leave content off-screen. */
  stepKey?: string;
};

function subscribeMobileLayout(onStoreChange: () => void) {
  const mq = window.matchMedia("(max-width: 1023px)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getMobileLayout() {
  return window.matchMedia("(max-width: 1023px)").matches;
}

/** Mobile login layout: branded sticky header, centered form at rest, keyboard-aware scroll when typing. */
export function LoginKeyboardShell({ children, header, className, stepKey }: LoginKeyboardShellProps) {
  const { offset: keyboardOffset, height: viewportHeight, open: keyboardOpen } = useKeyboardViewport();
  const scrollRef = useRef<HTMLDivElement>(null);
  const wasKeyboardOpen = useRef(false);
  const isMobileLayout = useSyncExternalStore(
    subscribeMobileLayout,
    getMobileLayout,
    () => false,
  );
  const useKeyboardLayout = isMobileLayout && keyboardOpen;

  /** Reset scroll when the wizard step changes (Back / Continue). */
  useEffect(() => {
    if (!stepKey) return;
    scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [stepKey]);

  /** Reset scroll when the mobile keyboard closes — desktop browsers skip this path. */
  useEffect(() => {
    if (!isMobileLayout) return;
    if (wasKeyboardOpen.current && !keyboardOpen) {
      scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
    }
    wasKeyboardOpen.current = keyboardOpen;
  }, [keyboardOpen, isMobileLayout]);

  return (
    <div
      className={cn(
        "login-keyboard-shell relative flex flex-col lg:min-h-0 lg:justify-center",
        useKeyboardLayout ? "login-keyboard-shell--open" : "login-keyboard-shell--rest min-h-screen-dvh",
        className,
      )}
      style={
        {
          "--keyboard-offset": `${keyboardOffset}px`,
          "--login-vv-height": `${viewportHeight}px`,
        } as CSSProperties
      }
    >
      <div
        ref={scrollRef}
        className="login-keyboard-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain lg:overflow-visible"
      >
        {header ? <div className="login-keyboard-header shrink-0">{header}</div> : null}
        <div
          className={cn(
            "login-form-panel mx-auto flex w-full max-w-sm flex-1 flex-col px-1 pb-4 pt-2 sm:px-0 sm:py-4 lg:justify-center",
            useKeyboardLayout ? "justify-start" : "justify-center",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
