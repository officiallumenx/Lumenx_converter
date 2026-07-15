import { Component, type ReactNode } from "react";
import QRCode from "react-qr-code";
import { cn } from "@lumenx/ui";

/** QR codes become slow/unreliable above ~600 characters. */
const MAX_QR_VALUE_LENGTH = 600;

type SafeQrCodeProps = {
  value: string;
  size?: number;
  className?: string;
  onClick?: () => void;
};

type QrErrorBoundaryProps = { children: ReactNode; fallback: ReactNode };

class QrErrorBoundary extends Component<QrErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

function QrPlaceholder({
  size,
  className,
  label,
}: {
  size: number;
  className?: string;
  label: string;
}) {
  return (
    <div
      className={cn(
        "grid place-items-center rounded-xl bg-muted px-2 text-center text-[10px] leading-tight text-muted-foreground",
        className,
      )}
      style={{ minWidth: size, minHeight: size }}
    >
      {label}
    </div>
  );
}

/** Renders a scannable QR code (short verify URL). */
export function SafeQrCode({ value, size = 64, className, onClick }: SafeQrCodeProps) {
  if (!value) {
    return <QrPlaceholder size={size} className={className} label="Loading…" />;
  }

  if (value.length > MAX_QR_VALUE_LENGTH) {
    return <QrPlaceholder size={size} className={className} label="Link too long for QR" />;
  }

  const qr = (
    <QrErrorBoundary fallback={<QrPlaceholder size={size} label="QR unavailable" />}>
      <QRCode
        value={value}
        size={size}
        level="M"
        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
      />
    </QrErrorBoundary>
  );

  if (!onClick) {
    return <div className={cn("grid place-items-center", className)}>{qr}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "grid place-items-center rounded-xl bg-white p-1.5 text-primary",
        "cursor-pointer transition-opacity hover:opacity-90",
        className,
      )}
      aria-label="View QR code"
    >
      {qr}
    </button>
  );
}
