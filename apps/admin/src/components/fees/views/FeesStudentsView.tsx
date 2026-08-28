import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Field,
  TextInput,
  SearchInput,
  PageStack,
  Pill,
  DataTable,
  Th,
  Td,
  Tr,
  Select,
} from "@lumenx/ui-admin";
import {
  clearStudentOverride,
  downloadFeeReceipt,
  formatInr,
  getStudentFeeAccount,
  recordOfficePayment,
  resolveChildFeeLines,
  setStudentOverride,
  type FeePaymentMethod,
  type FeesSnapshot,
} from "@lumenx/module-fees";
import {
  notifyFeePaymentReceived,
  notifyFeeReceiptAvailable,
  pushFeesParentInbox,
} from "@lumenx/notifications";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  feesStudentClasses,
  feesStudentSections,
  feesStudentsFor,
  findFeesStudent,
  type FeesStudentOption,
} from "@/lib/fees-students";

const METHOD_OPTIONS: { value: FeePaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi_office", label: "UPI (office)" },
  { value: "cheque", label: "Cheque" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "other", label: "Other" },
];

const METHOD_LABEL: Record<FeePaymentMethod, string> = {
  cash: "Cash",
  cheque: "Cheque",
  upi_office: "UPI (office)",
  bank_transfer: "Bank transfer",
  other: "Other",
};

const STATUS_PILL: Record<
  "paid" | "partial" | "due",
  { tone: "success" | "warning" | "neutral"; label: string }
> = {
  paid: { tone: "success", label: "Paid" },
  partial: { tone: "warning", label: "Partial" },
  due: { tone: "neutral", label: "Due" },
};

export function FeesStudentsView({
  snapshot,
  onChange,
  writesEnabled = true,
  studentOptions,
  studentsPickerReady = true,
  studentsPickerHint = null,
}: {
  snapshot: FeesSnapshot;
  onChange: (next: FeesSnapshot) => void;
  writesEnabled?: boolean;
  studentOptions: FeesStudentOption[];
  studentsPickerReady?: boolean;
  studentsPickerHint?: string | null;
}) {
  const notify = useAdminToast();
  const classes = useMemo(() => feesStudentClasses(studentOptions), [studentOptions]);
  const [classKey, setClassKey] = useState(classes[0] ?? "");
  const sections = useMemo(
    () => (classKey ? feesStudentSections(studentOptions, classKey) : []),
    [classKey, studentOptions],
  );
  const [section, setSection] = useState(sections[0] ?? "");
  const [studentId, setStudentId] = useState("");
  const [q, setQ] = useState("");
  const [editAmounts, setEditAmounts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<FeePaymentMethod>("cash");
  const [payNote, setPayNote] = useState("");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const nextClasses = feesStudentClasses(studentOptions);
    const nextClass = nextClasses[0] ?? "";
    setClassKey(nextClass);
    setSection(feesStudentSections(studentOptions, nextClass)[0] ?? "");
    setStudentId("");
    setQ("");
  }, [studentOptions]);

  const studentsInSection = useMemo(() => {
    if (!classKey || !section) return [];
    return feesStudentsFor(studentOptions, classKey, section);
  }, [classKey, section, studentOptions]);

  const searchHits = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [] as FeesStudentOption[];
    return feesStudentsFor(studentOptions, classKey, section).filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.rollNo.toLowerCase().includes(query) ||
        s.id.toLowerCase().includes(query),
    );
  }, [q, classKey, section, studentOptions]);

  const student = studentId ? findFeesStudent(studentOptions, studentId) : undefined;

  const account = useMemo(() => {
    if (!student) return null;
    return getStudentFeeAccount(
      snapshot,
      { studentId: student.id, classKey: student.classKey },
      { requirePublished: false },
    );
  }, [snapshot, student]);

  const lines = account?.lines ?? [];

  const selectStudent = (s: FeesStudentOption) => {
    setStudentId(s.id);
    setClassKey(s.classKey);
    setSection(s.section);
    const resolved = resolveChildFeeLines(
      snapshot,
      { studentId: s.id, classKey: s.classKey },
      { requirePublished: false },
    );
    const amounts: Record<string, string> = {};
    const noteMap: Record<string, string> = {};
    for (const line of resolved) {
      amounts[line.categoryId] = String(line.amount);
      if (line.note) noteMap[line.categoryId] = line.note;
    }
    setEditAmounts(amounts);
    setNotes(noteMap);
    const acc = getStudentFeeAccount(
      snapshot,
      { studentId: s.id, classKey: s.classKey },
      { requirePublished: false },
    );
    setPayAmount(acc.due > 0 ? String(acc.due) : "");
    setPayNote("");
    setPayMethod("cash");
    setPayDate(new Date().toISOString().slice(0, 10));
  };

  const onClassChange = (ck: string) => {
    setClassKey(ck);
    const secs = feesStudentSections(studentOptions, ck);
    setSection(secs[0] ?? "");
    setStudentId("");
    setQ("");
  };

  const onSectionChange = (sec: string) => {
    setSection(sec);
    setStudentId("");
    setQ("");
  };

  const saveConcession = (categoryId: string, name: string) => {
    if (!writesEnabled || !student) return;
    const amount = Number((editAmounts[categoryId] ?? "0").replace(/,/g, "")) || 0;
    const next = setStudentOverride(snapshot, {
      studentId: student.id,
      categoryId,
      amount,
      note: notes[categoryId],
    });
    onChange(next);
    notify(`${name} updated for ${student.name} only`);
  };

  const resetLine = (categoryId: string, name: string) => {
    if (!writesEnabled || !student) return;
    const next = clearStudentOverride(snapshot, student.id, categoryId);
    onChange(next);
    const resolved = resolveChildFeeLines(
      next,
      { studentId: student.id, classKey: student.classKey },
      { requirePublished: false },
    );
    const line = resolved.find((l) => l.categoryId === categoryId);
    setEditAmounts((prev) => ({
      ...prev,
      [categoryId]: String(line?.amount ?? 0),
    }));
    setNotes((prev) => {
      const { [categoryId]: _, ...rest } = prev;
      return rest;
    });
    notify(`${name} reset to class default`);
  };

  const recordPayment = () => {
    if (!writesEnabled) return;
    if (!student || !account) return;
    const amount = Number(payAmount.replace(/,/g, "")) || 0;
    if (amount <= 0) {
      notify("Enter a payment amount greater than zero");
      return;
    }
    try {
      const { snapshot: next, payment } = recordOfficePayment(snapshot, {
        studentId: student.id,
        studentName: student.name,
        classKey: student.classKey,
        amount,
        method: payMethod,
        note: payNote.trim() || undefined,
        paidAt: payDate,
      });
      onChange(next);
      const updated = getStudentFeeAccount(
        next,
        { studentId: student.id, classKey: student.classKey },
        { requirePublished: false },
      );
      try {
        const paid = notifyFeePaymentReceived({
          feeLabel: "School fees",
          amount: formatInr(payment.amount),
          receiptId: payment.receiptNo,
          studentId: student.id,
        });
        const receipt = notifyFeeReceiptAvailable({
          feeLabel: "School fees",
          amount: formatInr(payment.amount),
          receiptId: payment.receiptNo,
          studentId: student.id,
        });
        pushFeesParentInbox(paid.appNotification);
        pushFeesParentInbox(receipt.appNotification);
      } catch {
        /* best-effort */
      }
      setPayAmount(updated.due > 0 ? String(updated.due) : "");
      setPayNote("");
      notify(`Recorded ${formatInr(payment.amount)} · ${payment.receiptNo}`);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not record payment");
    }
  };

  return (
    <PageStack>
      {!studentsPickerReady ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {studentsPickerHint ?? "Loading students for fee picker…"}
        </div>
      ) : (
      <>
      <Card>
        <CardHeader
          title="Student fees"
          hint="Select a student · record offline office payments · adjust concessions"
        />
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Class">
              <Select
                fieldSize="md"
                className="w-full text-xs"
                value={classKey}
                onChange={(e) => onClassChange(e.target.value)}
              >
                {classes.map((ck) => (
                  <option key={ck} value={ck}>
                    {ck}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Section">
              <Select
                fieldSize="md"
                className="w-full text-xs"
                value={section}
                onChange={(e) => onSectionChange(e.target.value)}
              >
                {sections.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Student">
              <Select
                fieldSize="md"
                className="w-full text-xs"
                value={studentId}
                onChange={(e) => {
                  const s = findFeesStudent(studentOptions, e.target.value);
                  if (s) selectStudent(s);
                }}
              >
                <option value="">Select student…</option>
                {studentsInSection.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · Roll {s.rollNo}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Search by name or roll no">
            <SearchInput
              placeholder="Name or roll…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="max-w-sm"
            />
            {q.trim() && searchHits.length > 0 ? (
              <ul className="mt-2 rounded-lg border border-border divide-y divide-border max-h-36 overflow-y-auto">
                {searchHits.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted/40"
                      onClick={() => {
                        selectStudent(s);
                        setQ("");
                      }}
                    >
                      <span className="font-medium">{s.name}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {s.classKey}-{s.section} · Roll {s.rollNo}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {q.trim() && searchHits.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">No students match.</p>
            ) : null}
          </Field>
        </CardBody>
      </Card>

      {student && account ? (
        <>
          <Card>
            <CardHeader
              title={student.name}
              hint={`${student.classKey} · Sec ${student.section} · Roll ${student.rollNo} · ${student.id}`}
              action={<Pill tone={STATUS_PILL[account.status].tone}>{STATUS_PILL[account.status].label}</Pill>}
            />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                  <div className="text-[11px] text-muted-foreground">Billed</div>
                  <div className="mt-0.5 font-semibold tabular-nums text-sm">
                    {formatInr(account.billed)}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                  <div className="text-[11px] text-muted-foreground">Paid</div>
                  <div className="mt-0.5 font-semibold tabular-nums text-sm text-emerald-700 dark:text-emerald-400">
                    {formatInr(account.paid)}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                  <div className="text-[11px] text-muted-foreground">Due</div>
                  <div className="mt-0.5 font-semibold tabular-nums text-sm">
                    {formatInr(account.due)}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                  <div className="text-[11px] text-muted-foreground">Status</div>
                  <div className="mt-0.5 font-semibold text-sm">
                    {STATUS_PILL[account.status].label}
                  </div>
                </div>
              </div>

              {writesEnabled ? (
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div>
                  <div className="text-sm font-semibold">Record offline payment</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Parent pays at the office · Paid, Due, and Status update automatically · receipt
                    is downloadable
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Field label="Amount (₹)">
                    <TextInput
                      className="font-mono text-xs"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="0"
                    />
                  </Field>
                  <Field label="Mode">
                    <Select
                      fieldSize="md"
                      className="w-full text-xs"
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value as FeePaymentMethod)}
                    >
                      {METHOD_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Paid on">
                    <TextInput
                      type="date"
                      className="text-xs"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                    />
                  </Field>
                  <Field label="Note (optional)">
                    <TextInput
                      className="text-xs"
                      value={payNote}
                      onChange={(e) => setPayNote(e.target.value)}
                      placeholder="e.g. Term 1 cash"
                    />
                  </Field>
                </div>
                <Button size="sm" variant="primary" onClick={recordPayment}>
                  Record payment
                </Button>
              </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Payment history"
              hint="Office collections with downloadable receipts"
            />
            <CardBody className="p-0">
              {account.payments.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground text-center">
                  No office payments recorded for this student yet.
                </p>
              ) : (
                <DataTable>
                  <thead>
                    <tr>
                      <Th>Receipt</Th>
                      <Th>Date</Th>
                      <Th>Mode</Th>
                      <Th>Amount</Th>
                      <Th align="right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {account.payments.map((payment) => (
                      <Tr key={payment.id}>
                        <Td>
                          <div className="font-mono text-xs font-medium">{payment.receiptNo}</div>
                          {payment.note ? (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {payment.note}
                            </div>
                          ) : null}
                        </Td>
                        <Td mono>{payment.paidAt}</Td>
                        <Td>{METHOD_LABEL[payment.method]}</Td>
                        <Td mono>{formatInr(payment.amount)}</Td>
                        <Td align="right">
                          <Button
                            size="sm"
                            onClick={() => {
                              downloadFeeReceipt(payment, {
                                billed: account.billed,
                                paidTotal: account.paid,
                                due: account.due,
                              });
                              notify(`Saved to Downloads · ${payment.receiptNo}.txt`);
                            }}
                          >
                            Receipt
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </DataTable>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Fee concessions"
              hint="Edit amounts for this parent account only"
            />
            <CardBody className="p-0">
              {lines.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground text-center">
                  No fee categories assigned for this class yet. Initialize and publish first.
                </p>
              ) : (
                <DataTable>
                  <thead>
                    <tr>
                      <Th>Category</Th>
                      <Th>Class default</Th>
                      <Th>Amount</Th>
                      <Th>Note</Th>
                      <Th align="right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <Tr key={line.categoryId}>
                        <Td>
                          <div className="font-medium">{line.name}</div>
                          {line.overridden ? <Pill tone="warning">Concession</Pill> : null}
                        </Td>
                        <Td mono>{formatInr(line.defaultAmount)}</Td>
                        <Td>
                          <TextInput
                            className="w-28 font-mono text-xs"
                            disabled={!writesEnabled}
                            value={editAmounts[line.categoryId] ?? String(line.amount)}
                            onChange={(e) =>
                              setEditAmounts((prev) => ({
                                ...prev,
                                [line.categoryId]: e.target.value,
                              }))
                            }
                          />
                        </Td>
                        <Td>
                          <TextInput
                            className="min-w-[8rem] text-xs"
                            disabled={!writesEnabled}
                            placeholder="Optional"
                            value={notes[line.categoryId] ?? ""}
                            onChange={(e) =>
                              setNotes((prev) => ({
                                ...prev,
                                [line.categoryId]: e.target.value,
                              }))
                            }
                          />
                        </Td>
                        {writesEnabled ? (
                        <Td align="right">
                          <div className="inline-flex gap-1">
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => saveConcession(line.categoryId, line.name)}
                            >
                              Save
                            </Button>
                            {line.overridden ? (
                              <Button
                                size="sm"
                                onClick={() => resetLine(line.categoryId, line.name)}
                              >
                                Reset
                              </Button>
                            ) : null}
                          </div>
                        </Td>
                        ) : null}
                      </Tr>
                    ))}
                  </tbody>
                </DataTable>
              )}
            </CardBody>
          </Card>
        </>
      ) : (
        <Card>
          <CardBody>
            <p className="text-sm text-muted-foreground text-center py-6">
              Select a student to record offline payments, view history, and edit concessions.
            </p>
          </CardBody>
        </Card>
      )}
      </>
      )}
    </PageStack>
  );
}
