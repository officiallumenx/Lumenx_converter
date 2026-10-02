import { PersonPhotoPreview } from "@lumenx/ui";
import { usePersonPhotoUrl } from "@/hooks/usePersonPhotoUrl";

/** Compact avatar for transport drivers table. */
export function DriverListAvatar({
  driverId,
  name,
  photoAssetPath,
}: {
  driverId: string;
  name: string;
  photoAssetPath?: string | null;
}) {
  const photo = usePersonPhotoUrl("driver", driverId, photoAssetPath);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (photo.data) {
    return (
      <PersonPhotoPreview src={photo.data} title={name} alt={name} className="shrink-0">
        <img
          src={photo.data}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-9 rounded-md object-cover bg-accent border border-border shrink-0 pointer-events-none"
        />
      </PersonPhotoPreview>
    );
  }

  return (
    <div className="size-9 rounded-md bg-accent border border-border flex items-center justify-center text-[10px] font-mono shrink-0">
      {initials || "?"}
    </div>
  );
}
