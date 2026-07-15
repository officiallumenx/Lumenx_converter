import { IconChip } from "@/components/IconChip";
import { Link } from "@tanstack/react-router";
import type { TemplateHubView } from "@/lib/template-management/types";
import {
  LayoutDashboard,
  Library,
  Award,
  FileBarChart,
  CreditCard,
  FileText,
  Wand2,
  Upload,
  FileCheck,
  FolderOpen,
  Tags,
  Settings,
} from "lucide-react";

const NAV: { view: TemplateHubView; label: string; short: string; icon: typeof LayoutDashboard }[] =
  [
    { view: "dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
    { view: "library", label: "Template Library", short: "Library", icon: Library },
    { view: "certificates", label: "Certificate Templates", short: "Certs", icon: Award },
    { view: "reports", label: "Report Templates", short: "Reports", icon: FileBarChart },
    { view: "id_cards", label: "ID Card Templates", short: "IDs", icon: CreditCard },
    { view: "documents", label: "Document Templates", short: "Docs", icon: FileText },
    { view: "builder", label: "Template Builder", short: "Builder", icon: Wand2 },
    { view: "imports", label: "Imports", short: "Import", icon: Upload },
    { view: "generate", label: "Issue Documents", short: "Issue", icon: FileCheck },
    { view: "generated", label: "Generated Documents", short: "Generated", icon: FolderOpen },
    { view: "categories", label: "Categories", short: "Categories", icon: Tags },
    { view: "settings", label: "Settings", short: "Settings", icon: Settings },
  ];

export function TemplateHubNav({ active }: { active: TemplateHubView }) {
  return (
    <div className="mb-6 -mx-1 px-1 overflow-x-auto lx-sidebar-scroll">
      <div className="flex gap-1 p-1 min-w-max bg-background rounded-lg border border-border">
        {NAV.map(({ view, label, short, icon: Icon }) => {
          const isActive = active === view;
          return (
            <Link
              key={view}
              to="/templates"
              search={{ view }}
              className={`group inline-flex items-center gap-1.5 px-2.5 sm:px-3 h-8 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors duration-200 ${
                isActive
                  ? "bg-surface text-foreground shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface/60"
              }`}
            >
              <IconChip icon={Icon} size="xs" variant="soft" active={isActive} />
              <span className="hidden lg:inline">{label}</span>
              <span className="lg:hidden">{short}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
