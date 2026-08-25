import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@lumenx/ui";

const TOPICS = [
  {
    title: "Sports & ECA structure",
    body: "Sports uses Indoor/Outdoor → Sport → Team → Students. ECA uses Activity → Group → Students. Teams and Groups are the units you use for attendance, messages, events, and achievements.",
  },
  {
    title: "Attendance & practice",
    body: "Mark attendance on a Team or Group only — not academic classes. Assign practice with a date and time; it appears on the Calendar.",
  },
  {
    title: "Messages & announcements",
    body: "Pick Sports or ECA, select one Team or Group, write your note, and send. There is no chat or reply thread — send only.",
  },
  {
    title: "Certificates & achievements",
    body: "Choose a Team or Group, then the whole unit or students from that roster. Achievements can be for the unit or individual students on that roster.",
  },
  {
    title: "Dual Role",
    body: "If you teach subjects and coordinate activities, use Role switch in Settings to move between Subject Teacher and Activity Coordinator workspaces.",
  },
] as const;

/** Short Activity-specific help — not Subject Teacher content. */
export function ActivityHelpTopics() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {TOPICS.map((topic, i) => (
        <AccordionItem key={topic.title} value={`activity-help-${i}`}>
          <AccordionTrigger className="text-left text-sm font-medium">
            {topic.title}
          </AccordionTrigger>
          <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
            {topic.body}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
