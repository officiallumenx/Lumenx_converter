import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { IconWell } from "@/components/ui/icon-well";
import { ListTile } from "@/components/ui/list-tile";
import { SectionHeader } from "@/components/ui/section-header";
import { APP_NAME, MORE_NAV } from "@/constants";

export const Route = createFileRoute("/_app/more/")({
  head: () => ({ meta: [{ title: `More — ${APP_NAME}` }] }),
  component: MorePage,
});

function MorePage() {
  const navigate = useNavigate();

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <SectionHeader
        as="h1"
        size="page"
        title="More"
        subtitle="Bus info, route setup, profile, settings, and support"
      />
      <div className="space-y-2.5">
        {MORE_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <ListTile
              key={item.id}
              title={item.label}
              subtitle={item.description}
              className="group"
              leading={<IconWell icon={Icon} size="md" color={item.moduleColor} />}
              onClick={() => void navigate({ to: item.path })}
            />
          );
        })}
      </div>
    </div>
  );
}
