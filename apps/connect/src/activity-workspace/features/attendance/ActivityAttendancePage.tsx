import { useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@lumenx/ui";
import { toast } from "sonner";

const TEAMS = {
  sports: ["Cricket Team 1", "Cricket Team 2", "Kabaddi Team 1"],
  eca: ["Dance Team", "Music Group"],
};

export function ActivityAttendancePage() {
  const [mode, setMode] = useState<"class" | "team">("team");
  const [activityType, setActivityType] = useState<"sports" | "eca">("sports");
  const [team, setTeam] = useState("");

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Attendance"
        subtitle="Mark attendance class-wise (overall class) or team-wise (activity students)."
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("class")}
          className={mode === "class" ? "activity-filter-chip is-active" : "activity-filter-chip"}
        >
          Class-wise
        </button>
        <button
          type="button"
          onClick={() => setMode("team")}
          className={mode === "team" ? "activity-filter-chip is-active" : "activity-filter-chip"}
        >
          Team-wise
        </button>
      </div>

      {mode === "class" ? (
        <section className="activity-panel space-y-3">
          <p className="text-sm text-muted-foreground">
            Select class & section, then mark overall class students.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select defaultValue="10">
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">Class 10</SelectItem>
                <SelectItem value="11">Class 11</SelectItem>
                <SelectItem value="12">Class 12</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="A">
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Section A</SelectItem>
                <SelectItem value="B">Section B</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="rounded-xl" onClick={() => toast.success("Demo: open class roster")}>
            Mark class attendance
          </Button>
        </section>
      ) : (
        <section className="activity-panel space-y-3">
          <p className="text-sm text-muted-foreground">
            Select Sports or ECA, pick a team, then mark team-related students.
          </p>
          <Select
            value={activityType}
            onValueChange={(v) => {
              setActivityType(v as "sports" | "eca");
              setTeam("");
            }}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sports">Sports</SelectItem>
              <SelectItem value="eca">Extra-Curricular</SelectItem>
            </SelectContent>
          </Select>
          <Select value={team} onValueChange={setTeam}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent>
              {TEAMS[activityType].map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="rounded-xl"
            disabled={!team}
            onClick={() => toast.success(`Demo: mark attendance for ${team}`)}
          >
            Mark team attendance
          </Button>
        </section>
      )}
    </div>
  );
}
