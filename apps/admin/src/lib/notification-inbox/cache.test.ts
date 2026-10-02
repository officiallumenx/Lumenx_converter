import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/lib/admin-queries/keys";
import type { NotificationInboxListState } from "./load";
import {
  optimisticMarkAllNotificationsRead,
  optimisticMarkNotificationRead,
} from "./cache";

const sample = (id: string, unread: boolean) => ({
  id,
  title: id,
  desc: "",
  detail: "",
  category: "circulars" as const,
  priority: "normal" as const,
  type: "info" as const,
  time: "now",
  unread,
  href: undefined,
  createdAt: "2026-01-01T00:00:00Z",
});

describe("notification inbox cache patches", () => {
  it("does not invent cache when query data is missing", () => {
    const qc = new QueryClient();
    const instituteId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    optimisticMarkNotificationRead(qc, instituteId, "n1");
    expect(
      qc.getQueryData(adminQueryKeys.notifications(instituteId)),
    ).toBeUndefined();
  });

  it("marks one item read in the query cache", () => {
    const qc = new QueryClient();
    const instituteId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const initial: NotificationInboxListState = {
      status: "ready",
      items: [sample("n1", true), sample("n2", true)],
      errorMessage: null,
    };
    qc.setQueryData(adminQueryKeys.notifications(instituteId), initial);

    optimisticMarkNotificationRead(qc, instituteId, "n1");

    const next = qc.getQueryData<NotificationInboxListState>(
      adminQueryKeys.notifications(instituteId),
    );
    expect(next?.items.find((n) => n.id === "n1")?.unread).toBe(false);
    expect(next?.items.find((n) => n.id === "n2")?.unread).toBe(true);
  });

  it("marks all items read", () => {
    const qc = new QueryClient();
    const instituteId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    qc.setQueryData(adminQueryKeys.notifications(instituteId), {
      status: "ready",
      items: [sample("n1", true), sample("n2", true)],
      errorMessage: null,
    } satisfies NotificationInboxListState);

    optimisticMarkAllNotificationsRead(qc, instituteId);

    const next = qc.getQueryData<NotificationInboxListState>(
      adminQueryKeys.notifications(instituteId),
    );
    expect(next?.items.every((n) => !n.unread)).toBe(true);
  });
});
