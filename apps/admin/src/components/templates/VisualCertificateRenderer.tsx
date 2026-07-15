import type { ComponentType } from "react";
import type { VisualTemplateFields, VisualThemeId } from "@/lib/template-management/types";
import { applyTemplateVariables } from "@/lib/template-management/variable-resolve";

type VisualCertProps = {
  theme: VisualThemeId;
  fields: VisualTemplateFields;
  variables: Record<string, string>;
  instituteLogoUrl?: string;
  instituteLogoLabel: string;
  compact?: boolean;
};

function RecipientName({
  name,
  compact,
  color = "#1e4d6b",
}: {
  name: string;
  compact?: boolean;
  color?: string;
}) {
  return (
    <div className="text-center my-2">
      <p
        className={`font-[family-name:var(--font-cert-script)] ${compact ? "text-lg" : "text-3xl sm:text-4xl"}`}
        style={{ color, fontStyle: "italic" }}
      >
        {name}
      </p>
      <div
        className={`mx-auto border-b border-dotted border-muted-foreground/50 ${compact ? "w-32 mt-1" : "w-64 sm:w-80 mt-2"}`}
      />
    </div>
  );
}

function StudentPhoto({
  url,
  name,
  compact,
  className = "",
}: {
  url?: string;
  name: string;
  compact?: boolean;
  className?: string;
}) {
  const size = compact ? "size-12" : "size-20";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className={`${size} rounded-full border-2 border-white shadow-md overflow-hidden bg-muted flex items-center justify-center shrink-0 ${className}`}
    >
      {url ? (
        <img src={url} alt={name} className="size-full object-cover" />
      ) : (
        <span className={`font-semibold text-primary ${compact ? "text-[10px]" : "text-sm"}`}>
          {initials}
        </span>
      )}
    </div>
  );
}

function GoldSeal({ compact }: { compact?: boolean }) {
  const sz = compact ? "size-10" : "size-16";
  return (
    <div className={`${sz} relative mx-auto`}>
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 shadow-md border-2 border-amber-600/40" />
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
        <div className="w-2 h-4 bg-amber-500 rotate-[-12deg] rounded-b-sm" />
        <div className="w-2 h-4 bg-amber-400 rotate-[12deg] rounded-b-sm" />
      </div>
    </div>
  );
}

function Signatory({
  name,
  title,
  compact,
}: {
  name: string;
  title: string;
  compact?: boolean;
}) {
  if (!name && !title) return null;
  return (
    <div className={`text-center flex-1 ${compact ? "min-w-[70px]" : "min-w-[100px]"}`}>
      <div className={`border-t border-foreground/60 mx-auto ${compact ? "w-16 mb-1" : "w-28 mb-2"}`} />
      <p className={`font-bold uppercase tracking-wide ${compact ? "text-[6px]" : "text-[10px]"}`}>
        {name}
      </p>
      <p className={`text-muted-foreground uppercase ${compact ? "text-[5px]" : "text-[8px]"}`}>
        {title}
      </p>
    </div>
  );
}

function CornerDecor({ position, color }: { position: "tl" | "br"; color: string }) {
  const pos =
    position === "tl"
      ? "top-0 left-0 rounded-br-[40%]"
      : "bottom-0 right-0 rounded-tl-[40%]";
  return (
    <>
      <div
        className={`absolute ${pos} w-[28%] h-[22%] opacity-90`}
        style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}
      />
      <div
        className={`absolute ${position === "tl" ? "top-2 left-2" : "bottom-2 right-2"} w-[18%] h-[14%] rounded-full opacity-60`}
        style={{ background: color }}
      />
    </>
  );
}

function AchievementElegant({
  fields,
  variables,
  instituteLogoUrl,
  instituteLogoLabel,
  compact,
}: Omit<VisualCertProps, "theme">) {
  const name = variables.StudentName ?? "Student Name";
  const body = applyTemplateVariables(fields.bodyText, variables);

  return (
    <div className="relative size-full bg-white overflow-hidden text-foreground">
      <CornerDecor position="tl" color="#1a5f8a" />
      <CornerDecor position="br" color="#0d3d5c" />
      <div
        className="absolute inset-[12%] opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30 Q15 0 30 30 T60 30' fill='none' stroke='%23333' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: compact ? "30px 30px" : "48px 48px",
        }}
      />

      <div
        className={`relative z-10 flex flex-col items-center h-full ${compact ? "px-3 py-4" : "px-8 py-10 sm:py-14"}`}
      >
        {instituteLogoUrl && (
          <img
            src={instituteLogoUrl}
            alt={instituteLogoLabel}
            className={`${compact ? "size-8 mb-1" : "size-14 mb-3"} object-contain`}
          />
        )}

        <h1
          className={`font-serif font-bold tracking-widest ${compact ? "text-base" : "text-4xl sm:text-5xl"}`}
          style={{ color: "#2a9d8f" }}
        >
          {fields.titleMain}
        </h1>
        <p
          className={`font-sans font-semibold tracking-[0.25em] text-[#1e3a5f] ${compact ? "text-[7px] mt-0.5" : "text-sm mt-1"}`}
        >
          {fields.titleSub}
        </p>

        <p
          className={`font-semibold mt-4 ${compact ? "text-[7px]" : "text-sm mt-8"}`}
        >
          {fields.presentationLine}
        </p>

        <div className={`flex items-center gap-3 ${compact ? "my-1" : "my-3"}`}>
          {fields.showStudentPhoto && (
            <StudentPhoto
              url={fields.studentPhotoUrl || undefined}
              name={name}
              compact={compact}
            />
          )}
          <RecipientName name={name} compact={compact} />
        </div>

        <p
          className={`text-center text-muted-foreground leading-relaxed max-w-prose ${compact ? "text-[6px] px-2" : "text-xs sm:text-sm px-4"}`}
        >
          {body}
        </p>

        <div className={`mt-auto flex items-end justify-center gap-4 w-full ${compact ? "pt-2" : "pt-8"}`}>
          <Signatory
            name={fields.signatoryLeftName}
            title={fields.signatoryLeftTitle}
            compact={compact}
          />
          <GoldSeal compact={compact} />
          <Signatory
            name={fields.signatoryRightName}
            title={fields.signatoryRightTitle}
            compact={compact}
          />
        </div>
      </div>
    </div>
  );
}

function BonafideOrnate({ fields, variables, instituteLogoUrl, instituteLogoLabel, compact }: Omit<VisualCertProps, "theme">) {
  const name = variables.StudentName ?? "Student Name";
  const body = applyTemplateVariables(fields.bodyText, variables);
  return (
    <div className="relative size-full bg-[#fffef8] p-[3%]">
      <div className="size-full border-4 border-double border-amber-700/70 rounded-sm p-[2%] flex flex-col items-center">
        <div className="size-full border border-amber-600/40 flex flex-col items-center">
          {instituteLogoUrl ? (
            <img src={instituteLogoUrl} alt={instituteLogoLabel} className={`${compact ? "size-8 mt-2" : "size-16 mt-6"} object-contain`} />
          ) : (
            <div className={`${compact ? "size-8 mt-2" : "size-16 mt-6"} rounded-full border-2 border-amber-700 flex items-center justify-center text-amber-800 font-bold ${compact ? "text-[8px]" : "text-xs"}`}>
              {instituteLogoLabel.slice(0, 3)}
            </div>
          )}
          <h1 className={`font-serif text-amber-900 font-bold ${compact ? "text-sm mt-2" : "text-3xl mt-4"}`}>{fields.titleMain}</h1>
          <p className={`tracking-[0.3em] text-amber-800/80 ${compact ? "text-[7px]" : "text-sm"}`}>{fields.titleSub}</p>
          <p className={`${compact ? "text-[7px] mt-2" : "text-sm mt-6"}`}>{fields.presentationLine}</p>
          <RecipientName name={name} compact={compact} color="#7c4a03" />
          <p className={`text-center max-w-md ${compact ? "text-[6px] px-2" : "text-xs px-6"}`}>{body}</p>
          <div className={`mt-auto flex gap-6 ${compact ? "pb-2" : "pb-8"}`}>
            <Signatory name={fields.signatoryLeftName} title={fields.signatoryLeftTitle} compact={compact} />
            <Signatory name={fields.signatoryRightName} title={fields.signatoryRightTitle} compact={compact} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ConductClassic({ fields, variables, compact }: Omit<VisualCertProps, "theme">) {
  const name = variables.StudentName ?? "Student Name";
  const body = applyTemplateVariables(fields.bodyText, variables);
  return (
    <div className="relative size-full bg-white border-[6px] border-[#2d6a4f] p-[3%]">
      <div className="size-full border-2 border-[#40916c] flex flex-col items-center">
        <div className={`${compact ? "size-10 mt-2" : "size-16 mt-6"} rounded-full bg-[#2d6a4f] text-white flex items-center justify-center font-bold ${compact ? "text-[8px]" : "text-lg"}`}>✓</div>
        <h1 className={`font-serif text-[#1b4332] font-bold ${compact ? "text-xs mt-2" : "text-2xl mt-4"}`}>{fields.titleMain}</h1>
        <p className={`text-[#40916c] tracking-widest ${compact ? "text-[6px]" : "text-xs"}`}>{fields.titleSub}</p>
        <p className={`${compact ? "text-[7px] mt-2" : "mt-6 text-sm"}`}>{fields.presentationLine}</p>
        <RecipientName name={name} compact={compact} color="#1b4332" />
        <p className={`text-center ${compact ? "text-[6px] px-2" : "text-xs px-4"}`}>{body}</p>
        <div className={`mt-auto flex gap-4 ${compact ? "pb-2" : "pb-6"}`}>
          <Signatory name={fields.signatoryLeftName} title={fields.signatoryLeftTitle} compact={compact} />
          <Signatory name={fields.signatoryRightName} title={fields.signatoryRightTitle} compact={compact} />
        </div>
      </div>
    </div>
  );
}

function SportsMedal({ fields, variables, compact }: Omit<VisualCertProps, "theme">) {
  const name = variables.StudentName ?? "Student Name";
  const body = applyTemplateVariables(fields.bodyText, variables);
  return (
    <div className="relative size-full bg-gradient-to-b from-orange-50 to-red-50 overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[15%] bg-gradient-to-r from-red-600 via-orange-500 to-red-600" />
      <div className={`relative z-10 flex flex-col items-center h-full ${compact ? "px-2 py-6" : "px-6 py-12"}`}>
        <div className={`${compact ? "size-8" : "size-14"} rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 border-4 border-yellow-600 flex items-center justify-center text-white font-bold ${compact ? "text-[10px]" : "text-xl"}`}>🏅</div>
        <h1 className={`text-red-800 font-bold ${compact ? "text-xs mt-2" : "text-3xl mt-4"}`}>{fields.titleMain}</h1>
        <p className={`text-orange-700 tracking-wider ${compact ? "text-[6px]" : "text-sm"}`}>{fields.titleSub}</p>
        <p className={`${compact ? "text-[7px] mt-2" : "mt-4 text-sm"}`}>{fields.presentationLine}</p>
        <div className="flex items-center gap-2">
          {fields.showStudentPhoto && <StudentPhoto url={fields.studentPhotoUrl} name={name} compact={compact} />}
          <RecipientName name={name} compact={compact} color="#b91c1c" />
        </div>
        <p className={`text-center ${compact ? "text-[6px]" : "text-xs"}`}>{body}</p>
        <div className={`mt-auto flex gap-3 ${compact ? "pb-1" : "pb-6"}`}>
          <Signatory name={fields.signatoryLeftName} title={fields.signatoryLeftTitle} compact={compact} />
          <Signatory name={fields.signatoryRightName} title={fields.signatoryRightTitle} compact={compact} />
        </div>
      </div>
    </div>
  );
}

function ScienceModern({ fields, variables, compact }: Omit<VisualCertProps, "theme">) {
  const name = variables.StudentName ?? "Student Name";
  const body = applyTemplateVariables(fields.bodyText, variables);
  return (
    <div className="relative size-full bg-slate-950 text-white overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-violet-600/40 to-transparent" />
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-cyan-500/30 to-transparent" />
      <div className={`relative z-10 flex flex-col items-center h-full ${compact ? "px-2 py-4" : "px-6 py-10"}`}>
        <h1 className={`font-bold bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent ${compact ? "text-sm" : "text-3xl"}`}>{fields.titleMain}</h1>
        <p className={`text-cyan-200/80 tracking-widest ${compact ? "text-[6px]" : "text-xs"}`}>{fields.titleSub}</p>
        <p className={`text-cyan-100/70 ${compact ? "text-[7px] mt-2" : "mt-4 text-sm"}`}>{fields.presentationLine}</p>
        <div className="flex items-center gap-2">
          {fields.showStudentPhoto && <StudentPhoto url={fields.studentPhotoUrl} name={name} compact={compact} />}
          <RecipientName name={name} compact={compact} color="#67e8f9" />
        </div>
        <p className={`text-center text-slate-300 ${compact ? "text-[6px]" : "text-xs"}`}>{body}</p>
        <div className={`mt-auto flex gap-3 ${compact ? "pb-1" : "pb-6"}`}>
          <Signatory name={fields.signatoryLeftName} title={fields.signatoryLeftTitle} compact={compact} />
          <Signatory name={fields.signatoryRightName} title={fields.signatoryRightTitle} compact={compact} />
        </div>
      </div>
    </div>
  );
}

function ParticipationColorful({ fields, variables, compact }: Omit<VisualCertProps, "theme">) {
  const name = variables.StudentName ?? "Student Name";
  const body = applyTemplateVariables(fields.bodyText, variables);
  const bands = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7"];
  return (
    <div className="relative size-full bg-white overflow-hidden">
      <div className="absolute top-0 inset-x-0 flex h-2">
        {bands.map((c) => (
          <div key={c} className="flex-1" style={{ background: c }} />
        ))}
      </div>
      <div className={`flex flex-col items-center h-full ${compact ? "px-2 py-5" : "px-6 py-12"}`}>
        <h1 className={`font-bold text-foreground ${compact ? "text-xs" : "text-2xl"}`}>{fields.titleMain}</h1>
        <p className={`text-muted-foreground ${compact ? "text-[6px]" : "text-sm"}`}>{fields.titleSub}</p>
        <p className={`${compact ? "text-[7px] mt-2" : "mt-4"}`}>{fields.presentationLine}</p>
        <div className="flex items-center gap-2">
          {fields.showStudentPhoto && <StudentPhoto url={fields.studentPhotoUrl} name={name} compact={compact} />}
          <RecipientName name={name} compact={compact} color="#7c3aed" />
        </div>
        <p className={`text-center ${compact ? "text-[6px]" : "text-xs"}`}>{body}</p>
        <div className={`mt-auto flex gap-3 ${compact ? "pb-1" : "pb-6"}`}>
          <Signatory name={fields.signatoryLeftName} title={fields.signatoryLeftTitle} compact={compact} />
          <Signatory name={fields.signatoryRightName} title={fields.signatoryRightTitle} compact={compact} />
        </div>
      </div>
      <div className="absolute bottom-0 inset-x-0 flex h-2">
        {bands.map((c) => (
          <div key={`b-${c}`} className="flex-1" style={{ background: c }} />
        ))}
      </div>
    </div>
  );
}

function TransferOfficial({ fields, variables, compact }: Omit<VisualCertProps, "theme">) {
  const name = variables.StudentName ?? "Student Name";
  const body = applyTemplateVariables(fields.bodyText, variables);
  return (
    <div className="relative size-full bg-white p-[4%]">
      <div className="absolute inset-[8%] border border-dashed border-muted-foreground/20 pointer-events-none flex items-center justify-center">
        <span className={`text-muted-foreground/10 font-bold rotate-[-30deg] ${compact ? "text-lg" : "text-5xl"}`}>OFFICIAL</span>
      </div>
      <div className="relative border-2 border-foreground/80 p-[3%] h-full flex flex-col">
        <h1 className={`text-center font-bold uppercase tracking-wider border-b border-foreground pb-2 ${compact ? "text-[8px]" : "text-lg"}`}>
          {fields.titleMain} {fields.titleSub}
        </h1>
        <p className={`${compact ? "text-[6px] mt-2" : "mt-4 text-sm"}`}>{fields.presentationLine}</p>
        <p className={`font-semibold ${compact ? "text-[8px]" : "text-base"}`}>{name}</p>
        <p className={`flex-1 ${compact ? "text-[6px] mt-1 leading-snug" : "text-xs mt-2 leading-relaxed"}`}>{body}</p>
        <div className={`border border-foreground/30 ${compact ? "text-[5px]" : "text-[9px]"}`}>
          <div className="grid grid-cols-3 bg-muted/30 font-medium">
            <div className="p-1 border-r border-foreground/30">Subject</div>
            <div className="p-1 border-r border-foreground/30">Max</div>
            <div className="p-1">Obtained</div>
          </div>
          {["English", "Mathematics", "Science"].map((s) => (
            <div key={s} className="grid grid-cols-3 border-t border-foreground/20">
              <div className="p-1 border-r border-foreground/20">{s}</div>
              <div className="p-1 border-r border-foreground/20">100</div>
              <div className="p-1">—</div>
            </div>
          ))}
        </div>
        <div className={`flex justify-between mt-auto ${compact ? "pt-2" : "pt-4"}`}>
          <Signatory name={fields.signatoryLeftName} title={fields.signatoryLeftTitle} compact={compact} />
          <Signatory name={fields.signatoryRightName} title={fields.signatoryRightTitle} compact={compact} />
        </div>
      </div>
    </div>
  );
}

function ReportCardModern({ fields, variables, compact }: Omit<VisualCertProps, "theme">) {
  const name = variables.StudentName ?? "Student Name";
  const body = applyTemplateVariables(fields.bodyText, variables);
  return (
    <div className={`size-full bg-white ${compact ? "p-2" : "p-6"}`}>
      <div className="flex items-start justify-between gap-2 border-b-2 border-primary pb-2">
        <div>
          <h1 className={`font-bold text-primary ${compact ? "text-[8px]" : "text-xl"}`}>{fields.titleMain} {fields.titleSub}</h1>
          <p className={`text-muted-foreground ${compact ? "text-[6px]" : "text-xs"}`}>{body}</p>
        </div>
        {fields.showStudentPhoto && <StudentPhoto url={fields.studentPhotoUrl} name={name} compact={compact} />}
      </div>
      <table className={`w-full mt-2 ${compact ? "text-[5px]" : "text-[10px]"}`}>
        <thead>
          <tr className="bg-muted/50">
            <th className="p-1 text-left border">Subject</th>
            <th className="p-1 border">Marks</th>
            <th className="p-1 border">Grade</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["English", "88", "A2"],
            ["Mathematics", "92", "A1"],
            ["Science", "85", "A2"],
            ["Social Studies", "78", "B1"],
          ].map(([sub, m, g]) => (
            <tr key={sub}>
              <td className="p-1 border">{sub}</td>
              <td className="p-1 border text-center">{m}</td>
              <td className="p-1 border text-center">{g}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={`flex justify-between mt-auto ${compact ? "pt-2" : "pt-6"}`}>
        <Signatory name={fields.signatoryLeftName} title={fields.signatoryLeftTitle} compact={compact} />
        <Signatory name={fields.signatoryRightName} title={fields.signatoryRightTitle} compact={compact} />
      </div>
    </div>
  );
}

function AnnualReportFormal({ fields, variables, compact }: Omit<VisualCertProps, "theme">) {
  return <ReportCardModern fields={fields} variables={variables} compact={compact} instituteLogoLabel="" />;
}

function MarksheetGrid({ fields, variables, compact }: Omit<VisualCertProps, "theme">) {
  return <ReportCardModern fields={fields} variables={variables} compact={compact} instituteLogoLabel="" />;
}

function StudentIdBlue({ fields, variables, instituteLogoUrl, instituteLogoLabel, compact }: Omit<VisualCertProps, "theme">) {
  const name = variables.StudentName ?? "Student Name";
  const meta = applyTemplateVariables(fields.bodyText, variables);
  return (
    <div className={`size-full bg-white rounded-lg overflow-hidden flex ${compact ? "text-[5px]" : "text-[9px]"}`}>
      <div className={`bg-[#1e40af] text-white flex flex-col items-center justify-center ${compact ? "w-[28%] p-1" : "w-[30%] p-2"}`}>
        {instituteLogoUrl ? (
          <img src={instituteLogoUrl} alt="" className={`${compact ? "size-6" : "size-10"} object-contain mb-1`} />
        ) : (
          <div className={`${compact ? "size-6" : "size-10"} rounded bg-white/20 flex items-center justify-center font-bold`}>
            {instituteLogoLabel.slice(0, 2)}
          </div>
        )}
        <p className={`font-bold text-center leading-tight ${compact ? "text-[4px]" : "text-[7px]"}`}>{fields.titleMain}</p>
      </div>
      <div className={`flex-1 flex gap-2 ${compact ? "p-1.5" : "p-3"}`}>
        {fields.showStudentPhoto && (
          <StudentPhoto url={fields.studentPhotoUrl} name={name} compact={compact} className="!rounded-md" />
        )}
        <div className="flex-1 min-w-0">
          <p className={`font-bold truncate ${compact ? "text-[7px]" : "text-sm"}`}>{name}</p>
          <p className="text-muted-foreground truncate">{meta}</p>
          <div className={`mt-1 h-4 bg-[repeating-linear-gradient(90deg,#000_0_1px,transparent_1px_3px)] opacity-30 ${compact ? "h-2" : ""}`} />
          <div className={`${compact ? "size-4" : "size-8"} mt-1 border border-border grid place-items-center text-muted-foreground`}>QR</div>
        </div>
      </div>
    </div>
  );
}

function TeacherIdProfessional({ fields, variables, instituteLogoUrl, instituteLogoLabel, compact }: Omit<VisualCertProps, "theme">) {
  const name = variables.TeacherName ?? variables.StudentName ?? "Faculty Name";
  return (
    <div className={`size-full bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-lg overflow-hidden flex ${compact ? "text-[5px]" : "text-[9px]"}`}>
      <div className={`flex flex-col items-center justify-center ${compact ? "w-[35%] p-1" : "w-[35%] p-2"}`}>
        {fields.showStudentPhoto && (
          <StudentPhoto url={fields.studentPhotoUrl} name={name} compact={compact} />
        )}
      </div>
      <div className={`flex-1 ${compact ? "p-1.5" : "p-3"}`}>
        {instituteLogoUrl && <img src={instituteLogoUrl} alt="" className={`${compact ? "size-4" : "size-8"} object-contain mb-1`} />}
        <p className={`font-bold ${compact ? "text-[6px]" : "text-xs"}`}>{fields.titleSub}</p>
        <p className={`font-semibold ${compact ? "text-[7px]" : "text-sm"}`}>{name}</p>
        <p className="text-white/60">{applyTemplateVariables(fields.bodyText, variables)}</p>
        <p className={`mt-auto text-white/40 ${compact ? "text-[4px]" : "text-[7px]"}`}>{instituteLogoLabel}</p>
      </div>
    </div>
  );
}

const THEME_RENDERERS: Record<VisualThemeId, ComponentType<Omit<VisualCertProps, "theme">>> = {
  achievement_elegant: AchievementElegant,
  bonafide_ornate: BonafideOrnate,
  conduct_classic: ConductClassic,
  sports_medal: SportsMedal,
  science_modern: ScienceModern,
  participation_colorful: ParticipationColorful,
  transfer_official: TransferOfficial,
  report_card_modern: ReportCardModern,
  annual_report_formal: AnnualReportFormal,
  marksheet_grid: MarksheetGrid,
  student_id_blue: StudentIdBlue,
  teacher_id_professional: TeacherIdProfessional,
};

export function VisualCertificateRenderer(props: VisualCertProps) {
  const Renderer = THEME_RENDERERS[props.theme] ?? AchievementElegant;
  return <Renderer {...props} />;
}
