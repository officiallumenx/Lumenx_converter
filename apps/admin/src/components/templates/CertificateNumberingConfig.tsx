import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardBody, CardHeader, Field, Select, TextInput } from "@lumenx/ui-admin";
import {
  DEFAULT_CERTIFICATE_NUMBER_DIGITS,
  DEFAULT_CERTIFICATE_NUMBER_FORMAT,
  MAX_CERTIFICATE_NUMBER_DIGITS,
  MIN_CERTIFICATE_NUMBER_DIGITS,
  certificateNumberFormatError,
  previewCertificateNumber,
} from "@lumenx/module-certificates";
import { useAdminToast } from "@/components/AdminActionToast";
import { useDemoProfile } from "@/lib/demo-profile-context";
import {
  loadCertificateNumbering,
  peekCertificateNumbers,
  saveCertificateNumberFormat,
  subscribeCertificateNumbering,
} from "@/lib/certificate-numbering-store";

export function CertificateNumberingConfig() {
  const notify = useAdminToast();
  const { instituteSummary, profileId } = useDemoProfile();
  const [format, setFormat] = useState(DEFAULT_CERTIFICATE_NUMBER_FORMAT);
  const [digits, setDigits] = useState(DEFAULT_CERTIFICATE_NUMBER_DIGITS);
  const [savedFormat, setSavedFormat] = useState(DEFAULT_CERTIFICATE_NUMBER_FORMAT);
  const [savedDigits, setSavedDigits] = useState(DEFAULT_CERTIFICATE_NUMBER_DIGITS);
  const [nextNumber, setNextNumber] = useState("");

  useEffect(() => {
    const refresh = () => {
      const current = loadCertificateNumbering();
      setFormat(current.format);
      setDigits(current.digits);
      setSavedFormat(current.format);
      setSavedDigits(current.digits);
      setNextNumber(peekCertificateNumbers(1)[0] ?? previewCertificateNumber(current.format, current.digits));
    };
    refresh();
    return subscribeCertificateNumbering(refresh);
  }, [profileId]);

  const error = certificateNumberFormatError(format);
  const sample = useMemo(
    () => previewCertificateNumber(format, digits, 124),
    [format, digits],
  );
  const dirty = format.trim() !== savedFormat || digits !== savedDigits;

  const save = () => {
    try {
      const saved = saveCertificateNumberFormat(format, digits);
      setFormat(saved.format);
      setDigits(saved.digits);
      setSavedFormat(saved.format);
      setSavedDigits(saved.digits);
      notify("Certificate number format saved for this institute");
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Could not save number format");
    }
  };

  return (
    <Card>
      <CardHeader
        title="Certificate numbers"
        hint={`${instituteSummary.name} · sequential · unique · already issued numbers stay unchanged`}
      />
      <CardBody className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
          <Field label="Format" hint="Use {YEAR} and {NUMBER}">
            <TextInput
              value={format}
              onChange={(event) => setFormat(event.target.value)}
              placeholder={DEFAULT_CERTIFICATE_NUMBER_FORMAT}
              aria-invalid={Boolean(error)}
            />
          </Field>
          <Field label="Digits">
            <Select
              value={String(digits)}
              onChange={(event) => setDigits(Number(event.target.value))}
            >
              {Array.from(
                { length: MAX_CERTIFICATE_NUMBER_DIGITS - MIN_CERTIFICATE_NUMBER_DIGITS + 1 },
                (_, index) => MIN_CERTIFICATE_NUMBER_DIGITS + index,
              ).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <p className="text-sm text-muted-foreground">
          Sample <span className="font-mono text-foreground">{sample}</span>
          {nextNumber ? (
            <>
              {" "}
              · next <span className="font-mono text-foreground">{nextNumber}</span>
            </>
          ) : null}
        </p>
        <Button type="button" variant="primary" disabled={Boolean(error) || !dirty} onClick={save}>
          Save format
        </Button>
      </CardBody>
    </Card>
  );
}
