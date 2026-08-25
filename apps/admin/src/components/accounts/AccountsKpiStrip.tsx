import { Card } from "@lumenx/ui-admin";

type AccountsKpiStripProps = {
  total: number;
  active: number;
  suspended: number;
};

export function AccountsKpiStrip({ total, active, suspended }: AccountsKpiStripProps) {
  return (
    <div className="lx-kpi-grid lx-kpi-grid--3 mb-3">
      <Card>
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          Total accounts
        </div>
        <div className="lx-kpi-stat__value">{total}</div>
      </Card>
      <Card>
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          Active
        </div>
        <div className="lx-kpi-stat__value">{active}</div>
      </Card>
      <Card>
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          Suspended
        </div>
        <div className="lx-kpi-stat__value">{suspended}</div>
      </Card>
    </div>
  );
}
