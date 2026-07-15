import { Card, CardHeader, CardBody, Pill, PageStack } from "@lumenx/ui-admin";
import { TEMPLATE_CATEGORY_GROUPS } from "@/lib/template-management/categories";
import { getAllTemplates } from "@/lib/template-management/store";
import { useTemplateStore } from "@/components/templates/useTemplateStore";

export function TemplateCategoriesView() {
  useTemplateStore();
  const templates = getAllTemplates().filter((t) => t.status !== "archived");

  return (
    <PageStack>
      {TEMPLATE_CATEGORY_GROUPS.map((group) => (
        <Card key={group.id}>
          <CardHeader title={group.label} hint={`${group.items.length} template categories`} />
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {group.items.map((item) => {
                const count = templates.filter((t) => t.categoryId === item.id).length;
                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border px-4 py-3 hover:bg-surface-hover transition-colors"
                  >
                    <p className="text-sm font-medium">{item.label}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Pill tone={count > 0 ? "success" : "neutral"}>
                        {count} template{count === 1 ? "" : "s"}
                      </Pill>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      ))}
    </PageStack>
  );
}
