import type {
  NotificationPrefs,
  RosterStudent,
  SupportContent,
  TransportNotification,
  TripAssignment,
} from "../types";
import {
  NOTIFICATION_TEMPLATE_IDS,
  renderNotificationTemplate,
} from "@lumenx/module-notifications";

/**
 * Canonical demo seed for the driver Transport app.
 * Aligned with Admin Transport: BUS-01 · Rajesh Kumar · North Campus Loop (RT-01).
 * Single source of truth — feature mocks re-export slices from here.
 */
export const transportSeed = {
  trip: {
    driver: {
      id: "drv-1042",
      name: "Rajesh Kumar",
      phone: "+91 98765 43210",
      employeeId: "DRV-1042",
      licenseNumber: "DL-4521-2024",
      busNumber: "BUS-01",
    },
    bus: {
      vehicleId: "VH-01",
      busNumber: "BUS-01",
      vehicleNumber: "BUS-01",
      label: "BUS-01 · Rajesh Kumar",
      capacity: 40,
    },
    route: {
      code: "NCL",
      name: "North Campus Loop",
      adminRouteId: "RT-01",
      stops: [
        { id: "stop-01", name: "North Campus Gate", sequence: 1 },
        { id: "stop-02", name: "Lakeview Gate", sequence: 2 },
        { id: "stop-03", name: "Green Park", sequence: 3 },
        { id: "stop-04", name: "Market Square", sequence: 4 },
        { id: "stop-05", name: "Temple Road", sequence: 5 },
        { id: "stop-06", name: "Station Stop", sequence: 6 },
        { id: "stop-07", name: "Hillside Colony", sequence: 7 },
        { id: "stop-08", name: "School Main Entrance", sequence: 8 },
      ],
    },
    totalStudents: 42,
  } satisfies TripAssignment,

  roster: [
    {
      id: "STU-1042",
      name: "Aarav Sharma",
      grade: "10-B",
      stopName: "North Campus Gate",
      rollNo: "1042",
    },
    {
      id: "STU-1043",
      name: "Noah Draxler",
      grade: "10-A",
      stopName: "Stop assignment pending",
      rollNo: "1043",
    },
    {
      id: "STU-1047",
      name: "Vihaan Sharma",
      grade: "11-A",
      stopName: "Lakeview Gate",
      rollNo: "1047",
    },
    {
      id: "STU-1049",
      name: "Aarav Mehta",
      grade: "9-A",
      stopName: "Stop assignment pending",
      rollNo: "1049",
    },
  ] satisfies RosterStudent[],

  notifications: [
    {
      id: "notification-01",
      title: renderNotificationTemplate({
        templateId: NOTIFICATION_TEMPLATE_IDS.transport.teacher.routeConfirmed,
        variables: {
          routeName: "North Campus Loop",
          departureTime: "7:10 AM",
          originStop: "North Campus Gate",
        },
      }).title,
      message: renderNotificationTemplate({
        templateId: NOTIFICATION_TEMPLATE_IDS.transport.teacher.routeConfirmed,
        variables: {
          routeName: "North Campus Loop",
          departureTime: "7:10 AM",
          originStop: "North Campus Gate",
        },
      }).body,
      time: "10 min ago",
      kind: "route",
      unread: true,
      href: "/more/route-setup",
    },
    {
      id: "notification-02",
      title: renderNotificationTemplate({
        templateId: NOTIFICATION_TEMPLATE_IDS.transport.teacher.studentPickupUpdated,
        variables: {
          studentName: "Aarav Sharma",
          stopName: "Lakeview Gate",
        },
      }).title,
      message: renderNotificationTemplate({
        templateId: NOTIFICATION_TEMPLATE_IDS.transport.teacher.studentPickupUpdated,
        variables: {
          studentName: "Aarav Sharma",
          stopName: "Lakeview Gate",
        },
      }).body,
      time: "35 min ago",
      kind: "reminder",
      unread: true,
      href: "/",
    },
    {
      id: "notification-03",
      title: renderNotificationTemplate({
        templateId: NOTIFICATION_TEMPLATE_IDS.transport.teacher.schoolTimingNotice,
        variables: {
          message: "Afternoon dismissal begins 15 minutes early this Friday.",
        },
      }).title,
      message: renderNotificationTemplate({
        templateId: NOTIFICATION_TEMPLATE_IDS.transport.teacher.schoolTimingNotice,
        variables: {
          message: "Afternoon dismissal begins 15 minutes early this Friday.",
        },
      }).body,
      time: "Yesterday",
      kind: "school",
      unread: false,
      href: "/",
    },
    {
      id: "notification-04",
      title: renderNotificationTemplate({
        templateId: NOTIFICATION_TEMPLATE_IDS.transport.teacher.routeDelayReminder,
        variables: {
          location: "Market Square",
        },
      }).title,
      message: renderNotificationTemplate({
        templateId: NOTIFICATION_TEMPLATE_IDS.transport.teacher.routeDelayReminder,
        variables: {
          location: "Market Square",
        },
      }).body,
      time: "Yesterday",
      kind: "urgent",
      unread: false,
      href: "/emergency",
    },
    {
      id: "notification-05",
      title: renderNotificationTemplate({
        templateId: NOTIFICATION_TEMPLATE_IDS.transport.teacher.busInspectionComplete,
        variables: {
          message: "Bus 12 passed the scheduled safety inspection and is ready for service.",
        },
      }).title,
      message: renderNotificationTemplate({
        templateId: NOTIFICATION_TEMPLATE_IDS.transport.teacher.busInspectionComplete,
        variables: {
          message: "Bus 12 passed the scheduled safety inspection and is ready for service.",
        },
      }).body,
      time: "2 days ago",
      kind: "route",
      unread: false,
      href: "/more/route-setup",
    },
    {
      id: "notification-06",
      title: renderNotificationTemplate({
        templateId: NOTIFICATION_TEMPLATE_IDS.transport.teacher.driverBriefing,
        variables: {
          day: "Monday",
          time: "4:30 PM",
        },
      }).title,
      message: renderNotificationTemplate({
        templateId: NOTIFICATION_TEMPLATE_IDS.transport.teacher.driverBriefing,
        variables: {
          day: "Monday",
          time: "4:30 PM",
        },
      }).body,
      time: "3 days ago",
      kind: "school",
      unread: false,
      href: "/",
    },
  ] satisfies TransportNotification[],

  settings: {
    theme: "light" as const,
    notifications: {
      location: true,
      push: true,
      routeUpdates: true,
      attendanceAlerts: true,
    } satisfies NotificationPrefs,
  },

  support: {
    manager: {
      name: "Suresh Menon",
      phone: "+91 98765 00110",
      role: "Transport Manager",
    },
    helpCenter: {
      title: "Help Center",
      summary:
        "Find quick answers about trips, attendance marking, bus details, and emergency actions.",
      topics: [
        "How to start a trip from Home",
        "Set up your route by driving once (More → Route Setup)",
        "Mark boarding and dropping on Attendance",
        "Review bus information and stops",
        "Use Emergency only for urgent situations",
      ],
    },
    faqs: [
      {
        id: "faq-01",
        question: "How do I mark a student as boarded?",
        answer: "Open Attendance, stay on the Boarding tab, and tap the student card.",
      },
      {
        id: "faq-02",
        question: "How do I mark not boarded?",
        answer: "On the Boarding tab, long-press the student card to mark Not Boarded.",
      },
      {
        id: "faq-03",
        question: "Where can I see my assigned route?",
        answer: "Open More → Bus Information for route, stops, capacity, and vehicle details.",
      },
      {
        id: "faq-05",
        question: "How do I set up my route stops?",
        answer:
          "Open More → Route Setup, press Start Route Setup, drive to each stop, and press Save Current Stop. GPS is captured automatically. Finish Route Setup when done.",
      },
      {
        id: "faq-04",
        question: "Does Emergency send a real alert?",
        answer:
          "In this demo, Emergency is a placeholder confirmation only. No backend call is made.",
      },
    ],
    privacyPolicy:
      "LumenX Transport demo stores preferences on this device only. No personal data is uploaded to a backend in this build.",
    terms:
      "This Transport app build is for demonstration. Features use mock data and do not connect to live school systems.",
  } satisfies SupportContent,
} as const;
