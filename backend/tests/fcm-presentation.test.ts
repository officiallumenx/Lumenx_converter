import { describe, expect, it } from "vitest";
import {
  CONNECT_FCM_SMALL_ICON,
  FCM_ANDROID_COLOR,
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

  it("uses dedicated Connect small icon only for connect tokens", () => {
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
    expect(transport.icon).toBeUndefined();
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
