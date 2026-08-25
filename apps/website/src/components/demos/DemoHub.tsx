import { lazy, Suspense } from "react";
import { DEMO_FLOWS, type DemoFlowId } from "@/content/demos";
import { cn } from "@lumenx/ui";
import { cycleTabKey, useTabFocus } from "../home/tabKeys";
import { AttendanceDemo } from "./AttendanceDemo";

const TransportDemo = lazy(() => import("./TransportDemo").then((m) => ({ default: m.TransportDemo })));
const FeesDemo = lazy(() => import("./FeesDemo").then((m) => ({ default: m.FeesDemo })));
const NotificationsDemo = lazy(() => import("./NotificationsDemo").then((m) => ({ default: m.NotificationsDemo })));
const AdmissionsDemo = lazy(() => import("./AdmissionsDemo").then((m) => ({ default: m.AdmissionsDemo })));

function DemoFallback() {
  return <div className="min-h-[300px] rounded-xl border bg-card" aria-busy="true" aria-label="Loading demo" />;
}

function DemoBody({ flow }: { flow: DemoFlowId }) {
  if (flow === "attendance") return <AttendanceDemo />;
  return (
    <Suspense fallback={<DemoFallback />}>
      {flow === "transport" ? <TransportDemo /> : null}
      {flow === "fees" ? <FeesDemo /> : null}
      {flow === "notifications" ? <NotificationsDemo /> : null}
      {flow === "admissions" ? <AdmissionsDemo /> : null}
    </Suspense>
  );
}

export function DemoFlow({ flow }: { flow: DemoFlowId }) {
  const meta = DEMO_FLOWS.find((item) => item.id === flow) ?? DEMO_FLOWS[0];
  return (
    <div>
      <h3 className="text-xl font-semibold tracking-tight">{meta.title}</h3>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{meta.lede}</p>
      <div className="mt-6">
        <DemoBody flow={flow} />
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Mock data only. Not a live institute, not a login, and not a payment.
      </p>
    </div>
  );
}

export function DemoHub({
  flow,
  onFlowChange,
}: {
  flow: DemoFlowId;
  onFlowChange: (id: DemoFlowId) => void;
}) {
  const ids = DEMO_FLOWS.map((item) => item.id);
  const { setRef, focus } = useTabFocus<DemoFlowId>();

  return (
    <div>
      <div
        className="home-role-tabs mb-6"
        role="tablist"
        aria-label="Demo walkthroughs"
        onKeyDown={(event) => cycleTabKey(event, ids, flow, onFlowChange, focus)}
      >
        {DEMO_FLOWS.map((item) => (
          <button
            key={item.id}
            ref={setRef(item.id)}
            type="button"
            role="tab"
            id={`demo-flow-${item.id}`}
            aria-selected={item.id === flow}
            aria-controls="demo-flow-panel"
            tabIndex={item.id === flow ? 0 : -1}
            className={cn("site-product-nav__item")}
            onClick={() => onFlowChange(item.id)}
          >
            {item.title}
          </button>
        ))}
      </div>
      <div id="demo-flow-panel" role="tabpanel" aria-labelledby={`demo-flow-${flow}`}>
        <DemoFlow flow={flow} />
      </div>
    </div>
  );
}
