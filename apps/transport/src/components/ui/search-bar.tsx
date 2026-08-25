import { Search, X } from "lucide-react";
import { cn } from "@lumenx/ui";

import { Input } from "./input";

export function SearchBar({
  value,
  onChange,
  placeholder = "Search…",
  className,
  label = "Search",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        enterKeyHint="search"
        autoComplete="off"
        prefixIcon={<Search aria-hidden />}
        suffixIcon={
          value ? (
            <button
              type="button"
              onClick={() => onChange("")}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Clear search"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : undefined
        }
        className="pr-11"
      />
    </div>
  );
}
