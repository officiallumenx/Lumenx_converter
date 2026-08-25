import type { KeyboardEvent, ReactNode } from "react";

function initialsFrom(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function PeopleDirectoryCard({
  name,
  id,
  status,
  meta,
  menu,
  onOpen,
}: {
  name: string;
  id: string;
  status?: ReactNode;
  meta?: ReactNode;
  menu?: ReactNode;
  onOpen: () => void;
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  };

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      className="lx-people-card"
    >
      <div className="lx-people-card__avatar" aria-hidden>
        {initialsFrom(name)}
      </div>
      <div className="lx-people-card__body min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold leading-tight">{name}</div>
            <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{id}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {status}
            {menu ? (
              <div
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                {menu}
              </div>
            ) : null}
          </div>
        </div>
        {meta ? <div className="lx-people-card__meta">{meta}</div> : null}
      </div>
    </div>
  );
}
