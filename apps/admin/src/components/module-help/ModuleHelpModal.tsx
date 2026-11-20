import { Modal } from "@lumenx/ui-admin";
import type { ModuleHelpContent } from "@/lib/module-help/types";

export function ModuleHelpModal({
  open,
  onClose,
  content,
}: {
  open: boolean;
  onClose: () => void;
  content: ModuleHelpContent;
}) {
  return (
    <Modal open={open} onClose={onClose} title={content.title} size="xl">
      <div className="lx-module-help-body space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">What this is for</h2>
          <p className="whitespace-pre-wrap text-muted-foreground">{content.whatIs}</p>
        </section>
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">What you can do</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
            {content.whatYouCanDo.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">How it works</h2>
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            {content.howToUse.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      </div>
    </Modal>
  );
}
