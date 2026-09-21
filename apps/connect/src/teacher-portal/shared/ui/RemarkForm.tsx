import { useState } from "react";
import {
  Button,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lumenx/ui";
import type { RemarkTone, RemarkType, StudentRemark } from "@/lib/teacher/types";

const REMARK_TYPES: { value: RemarkType; label: string }[] = [
  { value: "academic", label: "Academic remark" },
  { value: "behaviour", label: "Behaviour remark" },
  { value: "improvement", label: "Improvement suggestion" },
  { value: "parent_note", label: "Parent note" },
];

const REMARK_TONES: { value: RemarkTone; label: string }[] = [
  { value: "good", label: "Good" },
  { value: "bad", label: "Bad" },
  { value: "none", label: "None" },
];

export function RemarkForm({
  onSubmit,
}: {
  onSubmit: (type: RemarkType, tone: RemarkTone, text: string) => void;
}) {
  const [type, setType] = useState<RemarkType>("academic");
  const [tone, setTone] = useState<RemarkTone>("none");
  const [text, setText] = useState("");

  const submit = () => {
    const trimmed = text.trim();
    if (trimmed.length < 8) return;
    onSubmit(type, tone, trimmed);
    setText("");
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select value={type} onValueChange={(v) => setType(v as RemarkType)}>
          <SelectTrigger className="h-10 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REMARK_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tone} onValueChange={(v) => setTone(v as RemarkTone)}>
          <SelectTrigger className="h-10 rounded-xl">
            <SelectValue placeholder="Tone" />
          </SelectTrigger>
          <SelectContent>
            {REMARK_TONES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a remark visible to parent and admin (not student)…"
        className="min-h-[88px] rounded-xl resize-none"
      />
      <Button onClick={submit} disabled={text.trim().length < 8} className="rounded-xl">
        Add remark
      </Button>
    </div>
  );
}

const TONE_LABEL: Record<RemarkTone, string> = {
  good: "Good",
  bad: "Bad",
  none: "None",
};

export function RemarkList({ remarks }: { remarks: StudentRemark[] }) {
  if (!remarks.length) {
    return <p className="text-sm text-muted-foreground">No remarks yet.</p>;
  }
  return (
    <ul className="space-y-3">
      {remarks.map((r) => (
        <li key={r.id} className="rounded-xl border border-border bg-muted/20 p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium capitalize text-foreground">
              {r.type.replace("_", " ")}
            </span>
            <span>·</span>
            <span>{TONE_LABEL[r.tone] ?? "None"}</span>
            <span>·</span>
            <span>{r.createdAt}</span>
          </div>
          <p className="mt-1.5 text-sm">{r.text}</p>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Visible to teacher, parent, admin — not student
          </p>
        </li>
      ))}
    </ul>
  );
}
