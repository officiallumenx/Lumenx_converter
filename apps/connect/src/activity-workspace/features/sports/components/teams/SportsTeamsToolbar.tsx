import { Plus } from "lucide-react";
import { Button } from "@lumenx/ui";

type Props = {
  sectionName: string;
  onCreate: () => void;
  totalCount: number;
};

export function SportsTeamsToolbar({ sectionName, onCreate, totalCount }: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-display text-lg font-semibold">{sectionName}</h2>
        <p className="text-xs text-muted-foreground">
          {totalCount} team{totalCount === 1 ? "" : "s"} / group{totalCount === 1 ? "" : "s"}
        </p>
      </div>
      <Button onClick={onCreate} className="rounded-xl gap-2 shrink-0">
        <Plus className="size-4" />
        Add team / group
      </Button>
    </div>
  );
}
