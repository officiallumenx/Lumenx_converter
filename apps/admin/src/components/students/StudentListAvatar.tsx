import { usePersonPhotoUrl } from "@/hooks/usePersonPhotoUrl";

/** Compact avatar for students directory table / cards. */
export function StudentListAvatar({
  studentId,
  name,
  photoAssetPath,
}: {
  studentId: string;
  name: string;
  photoAssetPath?: string | null;
}) {
  const photo = usePersonPhotoUrl("student", studentId, photoAssetPath);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (photo.data) {
    return (
      <img
        src={photo.data}
        alt=""
        className="size-9 rounded-md object-cover bg-accent border border-border shrink-0"
      />
    );
  }

  return (
    <div className="size-9 rounded-md bg-accent border border-border flex items-center justify-center text-[10px] font-mono shrink-0">
      {initials}
    </div>
  );
}
