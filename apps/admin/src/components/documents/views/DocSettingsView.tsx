import { useState } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Field,
  TextInput,
  PageStack,
} from "@lumenx/ui-admin";
import { Save, Info } from "lucide-react";

type DocNumberingScheme = "serial" | "yearSerial" | "typeSerial";

export function DocSettingsView() {
  const [prefix, setPrefix] = useState("LX");
  const [scheme, setScheme] = useState<DocNumberingScheme>("yearSerial");
  const [expiryDays, setExpiryDays] = useState("90");
  const [footerText, setFooterText] = useState("This is a computer-generated document and is valid without a physical signature unless stated otherwise.");
  const [connectSync, setConnectSync] = useState(true);
  const [autoNotify, setAutoNotify] = useState(true);
  const [watermark, setWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState("DRAFT");
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <PageStack>
      <div className="grid grid-cols-12 gap-4">
        {/* Numbering & prefixes */}
        <Card className="col-span-12 lg:col-span-6">
          <CardHeader title="Document numbering" hint="Controls how document serial numbers are generated" />
          <CardBody>
            <div className="space-y-4">
              <Field label="Document prefix">
                <TextInput
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="e.g. LX"
                />
                <p className="text-xs text-muted-foreground mt-1">Used as a prefix in all document numbers (e.g. LX/BON/2025/001)</p>
              </Field>
              <Field label="Numbering scheme">
                <div className="flex flex-col gap-2 mt-1">
                  {(["yearSerial", "serial", "typeSerial"] as DocNumberingScheme[]).map((s) => (
                    <label key={s} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="scheme"
                        value={s}
                        checked={scheme === s}
                        onChange={() => setScheme(s)}
                        className="accent-primary"
                      />
                      <span className="text-sm">
                        {s === "yearSerial" && "Year + Serial  — e.g. BON/2025/001"}
                        {s === "serial" && "Global serial  — e.g. BON/001"}
                        {s === "typeSerial" && "Type + Serial  — e.g. BONAFIDE-001"}
                      </span>
                    </label>
                  ))}
                </div>
              </Field>
            </div>
          </CardBody>
        </Card>

        {/* Document lifecycle */}
        <Card className="col-span-12 lg:col-span-6">
          <CardHeader title="Document lifecycle" hint="Expiry and download settings" />
          <CardBody>
            <div className="space-y-4">
              <Field label="Default expiry (days)">
                <TextInput
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  placeholder="90"
                  type="number"
                />
                <p className="text-xs text-muted-foreground mt-1">Generated documents expire after this many days. Set 0 to disable expiry.</p>
              </Field>
              <div className="flex flex-col gap-3 pt-1">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoNotify}
                    onChange={() => setAutoNotify((v) => !v)}
                    className="accent-primary mt-0.5"
                  />
                  <span className="text-sm">
                    <span className="font-medium">Auto-notify students / parents</span>
                    <span className="block text-xs text-muted-foreground">Send a notification when a requested document is ready</span>
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={connectSync}
                    onChange={() => setConnectSync((v) => !v)}
                    className="accent-primary mt-0.5"
                  />
                  <span className="text-sm">
                    <span className="font-medium">Sync with LumenX Connect</span>
                    <span className="block text-xs text-muted-foreground">Students & parents can download approved documents via the Connect app</span>
                  </span>
                </label>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Watermark */}
        <Card className="col-span-12 lg:col-span-6">
          <CardHeader title="Watermark" hint="Add a diagonal watermark to draft or restricted documents" />
          <CardBody>
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={watermark}
                  onChange={() => setWatermark((v) => !v)}
                  className="accent-primary mt-0.5"
                />
                <span className="text-sm">
                  <span className="font-medium">Enable watermark on generated documents</span>
                  <span className="block text-xs text-muted-foreground">Applied to all documents in draft or pending state</span>
                </span>
              </label>
              {watermark && (
                <Field label="Watermark text">
                  <TextInput
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="e.g. DRAFT, CONFIDENTIAL"
                  />
                </Field>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Footer */}
        <Card className="col-span-12 lg:col-span-6">
          <CardHeader title="Document footer" hint="Text printed at the bottom of all generated documents" />
          <CardBody>
            <Field label="Footer disclaimer">
              <textarea
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-ring/30 resize-none"
              />
            </Field>
          </CardBody>
        </Card>

        {/* Info banner */}
        <div className="col-span-12">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex gap-3">
            <Info className="size-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">Generation workflow</span> is not yet active in this demo. Settings here will be applied once the generation pipeline is connected.
            </p>
          </div>
        </div>

        {/* Save */}
        <div className="col-span-12 flex justify-end">
          <Button variant="primary" onClick={save}>
            <Save className="size-3.5" /> {saved ? "Saved!" : "Save settings"}
          </Button>
        </div>
      </div>
    </PageStack>
  );
}
