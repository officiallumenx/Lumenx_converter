/**
 * Simplified file upload — preview, replace, delete.
 * Formats: JPG / JPEG / PNG / PDF. Images auto-compressed.
 * No crop, rotate, rename, or advanced manager.
 */
import { useId, useRef, useState, type ReactNode } from "react";
import {
  processSimpleUpload,
  simpleUploadAccept,
  simpleUploadLimitLabel,
  type SimpleUploadKind,
  type SimpleUploadValue,
} from "@lumenx/utils";
import { cn } from "./lib/utils";
import { Button } from "./components/ui/button";
import { FileText, ImageIcon, Trash2, Upload } from "lucide-react";

export type { SimpleUploadKind, SimpleUploadValue };

export function SimpleFileUpload({
  kind,
  value,
  onChange,
  label,
  className,
  disabled,
  compact,
}: {
  kind: SimpleUploadKind;
  value: SimpleUploadValue | null;
  onChange: (next: SimpleUploadValue | null) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  /** Circular avatar-style preview (images). */
  compact?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file || disabled) return;
    setBusy(true);
    setError(null);
    try {
      const next = await processSimpleUpload(file, kind);
      onChange(next);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed";
      setError(message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const isImage = Boolean(
    value &&
      (value.dataUrl.startsWith("data:image/") ||
        (value.mimeType.startsWith("image/") && value.dataUrl.length > 0)),
  );

  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      {label ? <p className="text-sm font-medium text-foreground">{label}</p> : null}

      <div
        className={cn(
          "rounded-xl border border-border bg-card p-3 sm:p-4",
          compact && "flex items-center gap-3",
        )}
      >
        {value ? (
          <div className={cn("flex min-w-0 gap-3", compact ? "items-center flex-1" : "flex-col sm:flex-row sm:items-start")}>
            <PreviewThumb value={value} isImage={isImage} compact={compact} />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-sm font-medium">{value.fileName}</p>
              <p className="text-[11px] text-muted-foreground">
                {(value.size / 1024).toFixed(0)} KB · {isImage ? "Image" : "PDF"}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg gap-1.5"
                  disabled={disabled || busy}
                  onClick={() => inputRef.current?.click()}
                >
                  <Upload className="size-3.5" />
                  {busy ? "Working…" : "Replace"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg gap-1.5 text-destructive hover:text-destructive"
                  disabled={disabled || busy}
                  onClick={() => {
                    onChange(null);
                    setError(null);
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex w-full min-w-0 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-6 text-center transition-colors hover:bg-muted/40 disabled:opacity-50",
              compact && "flex-row py-3",
            )}
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              {kind === "image" ? <ImageIcon className="size-5" /> : <FileText className="size-5" />}
            </span>
            <span className="text-sm font-medium">{busy ? "Processing…" : "Upload file"}</span>
            <span className="text-[11px] text-muted-foreground">{simpleUploadLimitLabel(kind)}</span>
          </button>
        )}

        <input
          id={inputId}
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={simpleUploadAccept(kind)}
          disabled={disabled || busy}
          aria-label={label ?? "Upload file"}
          onChange={(e) => void pick(e.target.files?.[0])}
        />
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function PreviewThumb({
  value,
  isImage,
  compact,
}: {
  value: SimpleUploadValue;
  isImage: boolean;
  compact?: boolean;
}): ReactNode {
  if (isImage) {
    return (
      <img
        src={value.dataUrl}
        alt=""
        className={cn(
          "shrink-0 border border-border object-cover bg-muted",
          compact ? "size-14 rounded-full" : "size-20 rounded-lg sm:size-24",
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        "shrink-0 grid place-items-center border border-border bg-muted/40 text-muted-foreground",
        compact ? "size-14 rounded-full" : "size-20 rounded-lg sm:size-24",
      )}
      aria-hidden
    >
      <FileText className="size-8" />
    </div>
  );
}
