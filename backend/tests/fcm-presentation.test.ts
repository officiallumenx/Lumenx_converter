import { describe, expect, it } from "vitest";
import {
  ADMIN_FCM_SMALL_ICON,
  CONNECT_FCM_SMALL_ICON,
  FCM_ANDROID_COLOR,
  TRANSPORT_FCM_SMALL_ICON,
  androidSmallIconForApp,
  backendCategoryTrayLabel,
  buildFcmAndroidNotification,
  formatFcmTrayTitle,
  resolveAndroidNotificationColor,
} from "../src/domains/notifications/fcm-presentation.js";
import { buildFcmData } from "../src/domains/notifications/fcm-worker.js";

describe("FCM presentation metadata", () => {
  it("Connect module app is preserved on data payload", () => {
    const data = buildFcmData(
      {
        id: "n1",
        institute_id: "i1",
        category: "announcements",
        deep_link: "/announcements/1",
        payload: {},
        priority: "normal",
      },
      { deviceApp: "connect" },
    );
    expect(data.app).toBe("connect");
    expect(data.category).toBe("announcements");
    expect(data.href).toBe("/announcements/1");
  });

  it("preserves announcement type in tray title and data", () => {
    expect(backendCategoryTrayLabel("announcements")).toBe("Announcement");
    expect(
      formatFcmTrayTitle({
        title: "Nate",
        category: "announcements",
        isAlert: false,
      }),
    ).toBe("Announcement • Nate");
  });

  it("preserves message and event types", () => {
    expect(
      formatFcmTrayTitle({ title: "Hello", category: "messages", isAlert: false }),
    ).toBe("Message • Hello");
    expect(
      formatFcmTrayTitle({ title: "Sports day", category: "events", isAlert: false }),
    ).toBe("Event • Sports day");
  });

  it("maps INFO to blue, WARNING to amber, CRITICAL to red", () => {
    expect(resolveAndroidNotificationColor({ priority: "normal" })).toBe(
      FCM_ANDROID_COLOR.info,
    );
    expect(resolveAndroidNotificationColor({ priority: "important" })).toBe(
      FCM_ANDROID_COLOR.warning,
    );
    expect(resolveAndroidNotificationColor({ priority: "critical" })).toBe(
      FCM_ANDROID_COLOR.critical,
    );
  });

  it("sets dedicated small icon for connect, transport, and admin tokens", () => {
    const connect = buildFcmAndroidNotification({
      isAlert: false,
      priority: "normal",
      deviceApp: "connect",
    });
    expect(connect.icon).toBe(CONNECT_FCM_SMALL_ICON);
    expect(connect.color).toBe(FCM_ANDROID_COLOR.info);

    const transport = buildFcmAndroidNotification({
      isAlert: false,
      priority: "normal",
      deviceApp: "transport",
    });
    expect(transport.icon).toBe(TRANSPORT_FCM_SMALL_ICON);
    expect(transport.color).toBe(FCM_ANDROID_COLOR.info);

    const admin = buildFcmAndroidNotification({
      isAlert: false,
      priority: "normal",
      deviceApp: "admin",
    });
    expect(admin.icon).toBe(ADMIN_FCM_SMALL_ICON);
    expect(admin.color).toBe(FCM_ANDROID_COLOR.info);

    // Unknown app → no icon (no crash)
    const unknown = buildFcmAndroidNotification({
      isAlert: false,
      priority: "normal",
      deviceApp: "unknown_app",
    });
    expect(unknown.icon).toBeUndefined();
  });

  it("androidSmallIconForApp resolves per-app drawable names", () => {
    expect(androidSmallIconForApp("connect")).toBe(CONNECT_FCM_SMALL_ICON);
    expect(androidSmallIconForApp("transport")).toBe(TRANSPORT_FCM_SMALL_ICON);
    expect(androidSmallIconForApp("admin")).toBe(ADMIN_FCM_SMALL_ICON);
    expect(androidSmallIconForApp(null)).toBeUndefined();
    expect(androidSmallIconForApp(undefined)).toBeUndefined();
    expect(androidSmallIconForApp("nexus")).toBeUndefined();
  });

  it("normal INFO transport notification uses blue not red/orange", () => {
    // Trip started, student boarded etc. → priority=normal → blue
    const android = buildFcmAndroidNotification({
      isAlert: false,
      priority: "normal",
      deviceApp: "connect",
    });
    expect(android.color).toBe(FCM_ANDROID_COLOR.info);

    // Approaching 15 min → priority=important → amber
    const approachAmber = buildFcmAndroidNotification({
      isAlert: false,
      priority: "important",
      deviceApp: "connect",
    });
    expect(approachAmber.color).toBe(FCM_ANDROID_COLOR.warning);

    // Emergency SOS → priority=critical → red
    const sos = buildFcmAndroidNotification({
      isAlert: true,
      priority: "critical",
      deviceApp: "connect",
    });
    expect(sos.color).toBe(FCM_ANDROID_COLOR.critical);
  });

  it("background-equivalent data retains category, severity, and deep link", () => {
    const data = buildFcmData(
      {
        id: "n2",
        institute_id: "i1",
        category: "events",
        deep_link: "/events/9",
        payload: {
          severity: "attention",
          alertSeverity: "mandatory",
          presentation: "alert",
        },
        priority: "important",
      },
      { deviceApp: "connect" },
    );
    expect(data.category).toBe("events");
    expect(data.severity).toBe("attention");
    expect(data.alertSeverity).toBe("mandatory");
    expect(data.presentation).toBe("alert");
    expect(data.href).toBe("/events/9");
    expect(data.app).toBe("connect");
  });

  it("critical alert tray keeps Important prefix and red color", () => {
    expect(
      formatFcmTrayTitle({
        title: "Campus closed",
        category: "system",
        isAlert: true,
      }),
    ).toBe("Important: Campus closed");
    const android = buildFcmAndroidNotification({
      isAlert: true,
      priority: "critical",
      deviceApp: "connect",
    });
    expect(android.channelId).toBe("lumenx_alerts");
    expect(android.color).toBe(FCM_ANDROID_COLOR.critical);
    expect(android.icon).toBe(CONNECT_FCM_SMALL_ICON);
  });
});
