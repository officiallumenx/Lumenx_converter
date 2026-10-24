import { Link } from "@tanstack/react-router";
import { Section } from "../layout/Section";
import { FAQList } from "../content/FAQList";
import { HOME_FAQ } from "@/content/home";
import { contactSearch } from "@/lib/search";

export function HomeFaq() {
  return (
    <Section
      id="faq"
      eyebrow="Questions"
      title="Common questions from institutes."
      lede="Clear answers about products, pricing, trial, and getting started. Still unsure? Contact us."
      tone="muted"
    >
      <FAQList items={HOME_FAQ} defaultOpenFirst />
      <p className="mt-8 text-sm text-muted-foreground">
        Still have a question?{" "}
        <a href="#leave-a-message" className="font-medium text-foreground underline-offset-4 hover:underline">
          Leave a message
        </a>
        {" · "}
        <Link to="/contact" search={contactSearch("question")} className="font-medium text-foreground underline-offset-4 hover:underline">
          Contact us
        </Link>
        {" · "}
        <Link to="/pricing" search={{}} className="font-medium text-foreground underline-offset-4 hover:underline">
          See pricing
        </Link>
      </p>
    </Section>
  );
}
