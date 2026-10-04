import { useEffect, useRef, useState } from "react";
import { PersonPhotoPreview } from "@lumenx/ui";
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
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const photo = usePersonPhotoUrl("student", studentId, photoAssetPath, {
    enabled: visible,
  });
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (photo.data) {
    return (
      <div ref={rootRef}>
        <PersonPhotoPreview src={photo.data} title={name} alt={name} className="shrink-0">
          <img
            src={photo.data}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-9 rounded-md object-cover bg-accent border border-border shrink-0 pointer-events-none"
          />
        </PersonPhotoPreview>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="size-9 rounded-md bg-accent border border-border flex items-center justify-center text-[10px] font-mono shrink-0"
    >
      {initials}
    </div>
  );
}
