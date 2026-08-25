import * as React from "react";
import {
  Avatar as UiAvatar,
  AvatarFallback as UiAvatarFallback,
  AvatarImage as UiAvatarImage,
  cn,
} from "@lumenx/ui";

const sizeClass = {
  sm: "size-8 text-[10px]",
  md: "size-10 text-xs",
  lg: "size-12 text-sm",
  xl: "size-16 text-base",
} as const;

export type AvatarSize = keyof typeof sizeClass;

export interface AvatarProps extends React.ComponentPropsWithoutRef<typeof UiAvatar> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: AvatarSize;
}

export function Avatar({ src, alt, fallback, size = "md", className, ...props }: AvatarProps) {
  return (
    <UiAvatar className={cn(sizeClass[size], "ring-1 ring-border", className)} {...props}>
      {src ? <UiAvatarImage src={src} alt={alt} /> : null}
      <UiAvatarFallback className="bg-transport/15 font-semibold text-transport">
        {fallback ?? "?"}
      </UiAvatarFallback>
    </UiAvatar>
  );
}

export { UiAvatarImage as AvatarImage, UiAvatarFallback as AvatarFallback };
