import { DEMO_FLOWS, type DemoFlowId } from "@/content/demos";
import { Section } from "../layout/Section";
import { DemoCTA } from "../conversion/DemoCTA";
import { DemoHub } from "../demos/DemoHub";
import { useState } from "react";

export function HomeDemos() {
  const [flow, setFlow] = useState<DemoFlowId>(DEMO_FLOWS[0].id);

  return (
    <Section
      id="demos"
      eyebrow="Demonstrations"
      title="See the work, without an account."
      lede="Tap through mock walkthroughs. These use sample screens — not live institute data, and not a real login."
    >
      <DemoHub flow={flow} onFlowChange={setFlow} />
      <div className="mt-8 flex justify-center">
        <DemoCTA demo={flow}>Open the product demo</DemoCTA>
      </div>
    </Section>
  );
}
