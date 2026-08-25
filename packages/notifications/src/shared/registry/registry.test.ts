import { describe, expect, it } from "vitest";

import {
  NOTIFICATION_TEMPLATE_IDS,
  assertSinglePublishedVersion,
  archiveRegisteredTemplate,
  getPublishedTemplate,
  listRegisteredTemplates,
  publishRegisteredTemplate,
  renderNotificationTemplate,
  resetRegisteredTemplatesForTests,
} from "./index";

describe("notification template registry", () => {
  it("enforces a single published version per templateId", () => {
    expect(() => assertSinglePublishedVersion(listRegisteredTemplates())).not.toThrow();
  });

  it("keeps working attendance template render contract", () => {
    const rendered = renderNotificationTemplate({
      templateId: NOTIFICATION_TEMPLATE_IDS.attendance.parent.dailyAbsence,
      variables: {
        studentName: "Asha",
        slotLabel: "Full day",
        date: "2026-08-21",
        classLabel: "5",
        section: "A",
      },
    });
    expect(rendered.title).toContain("Asha");
    expect(rendered.body).toContain("Full day");
  });

  it("returns published templates for send path", () => {
    const t = getPublishedTemplate(NOTIFICATION_TEMPLATE_IDS.transport.teacher.routeConfirmed);
    expect(t?.status).toBe("published");
    expect(t?.deepLink).toBeTruthy();
    expect(t?.allowedVariables.length).toBeGreaterThan(0);
  });

  it("keeps draft/archived visible in registry but not as published", () => {
    const draft = listRegisteredTemplates().find((x) => x.status === "draft");
    expect(draft).toBeTruthy();
    expect(getPublishedTemplate(draft!.templateId)).toBeNull();
  });

  it("publishes draft and keeps a single published version", () => {
    resetRegisteredTemplatesForTests();
    const draft = listRegisteredTemplates().find((x) => x.status === "draft");
    expect(draft).toBeTruthy();
    const published = publishRegisteredTemplate(draft!.templateId);
    expect(published?.status).toBe("published");
    expect(getPublishedTemplate(draft!.templateId)?.templateId).toBe(draft!.templateId);
    expect(() => assertSinglePublishedVersion(listRegisteredTemplates())).not.toThrow();
    archiveRegisteredTemplate(draft!.templateId);
    expect(getPublishedTemplate(draft!.templateId)).toBeNull();
    resetRegisteredTemplatesForTests();
  });
});
