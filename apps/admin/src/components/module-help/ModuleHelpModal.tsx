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
          <h2 className="text-base font-semibold text-foreground mb-2">
            What is this module?
          </h2>
          <p className="text-muted-foreground whitespace-pre-wrap">{content.whatIs}</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            What can you do here?
          </h2>
          <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
            {content.whatYouCanDo.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            How to use it
          </h2>
          <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
            {content.howToUse.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      </div>
    </Modal>
  );
}
