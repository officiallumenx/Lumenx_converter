import { Section } from "../layout/Section";
import { LeaveMessageForm } from "../conversion/LeaveMessageForm";

export function HomeLeaveMessage() {
  return (
    <Section
      id="leave-a-message"
      eyebrow="Leave a message"
      title="Have a question about LumenX?"
      lede="Tell us your name, email, and phone number, and write your question. We’ll get back to you."
      narrow
    >
      <LeaveMessageForm />
    </Section>
  );
}
