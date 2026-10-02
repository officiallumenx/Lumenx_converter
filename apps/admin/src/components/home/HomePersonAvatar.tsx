import { PersonPhotoPreview } from "@lumenx/ui";
import { usePersonPhotoUrl } from "@/hooks/usePersonPhotoUrl";

function initialsFrom(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Circular avatar for Home birthday / people rows. */
export function HomePersonAvatar({
  kind,
  personId,
  name,
  photoAssetPath,
  size = "md",
}: {
  kind: "student" | "teacher";
  personId: string;
  name: string;
  photoAssetPath?: string | null;
  size?: "sm" | "md";
}) {
  const photo = usePersonPhotoUrl(kind, personId, photoAssetPath);
  const dim = size === "sm" ? "size-8" : "size-10";
  const text = size === "sm" ? "text-[10px]" : "text-[11px]";

  if (photo.data) {
    return (
      <PersonPhotoPreview src={photo.data} title={name} alt={name} className="shrink-0">
        <img
          src={photo.data}
          alt=""
          loading="lazy"
          decoding="async"
          className={`${dim} rounded-full object-cover bg-muted border border-border shrink-0 pointer-events-none`}
        />
      </PersonPhotoPreview>
    );
  }

  return (
    <div
      className={`${dim} rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center ${text} font-semibold text-primary shrink-0`}
      aria-hidden
    >
      {initialsFrom(name) || "?"}
    </div>
  );
}
