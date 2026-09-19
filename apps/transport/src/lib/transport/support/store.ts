import {
  COOKIE_POLICY,
  TRANSPORT_PRIVACY,
  TRANSPORT_TERMS,
  legalDocumentToPlainText,
} from "@lumenx/legal";

import type { SupportContent, TransportManager } from "../types";

const SUPPORT_CONTENT: SupportContent = {
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
      answer: "Yes. SOS creates an emergency for Admin to acknowledge and resolve.",
    },
  ],
  privacyPolicy: [
    legalDocumentToPlainText(TRANSPORT_PRIVACY),
    "",
    legalDocumentToPlainText(COOKIE_POLICY),
  ].join("\n"),
  terms: legalDocumentToPlainText(TRANSPORT_TERMS),
};

export function getSupportSnapshot(): SupportContent {
  return {
    ...SUPPORT_CONTENT,
    manager: { ...SUPPORT_CONTENT.manager },
    helpCenter: {
      ...SUPPORT_CONTENT.helpCenter,
      topics: [...SUPPORT_CONTENT.helpCenter.topics],
    },
    faqs: SUPPORT_CONTENT.faqs.map((faq) => ({ ...faq })),
  };
}

export function getTransportManagerSnapshot(): TransportManager {
  return { ...SUPPORT_CONTENT.manager };
}
