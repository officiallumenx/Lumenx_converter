import { transportSeed } from "../mock/seed";
import type { SupportContent, TransportManager } from "../types";

export function getSupportSnapshot(): SupportContent {
  return {
    ...transportSeed.support,
    manager: { ...transportSeed.support.manager },
    helpCenter: {
      ...transportSeed.support.helpCenter,
      topics: [...transportSeed.support.helpCenter.topics],
    },
    faqs: transportSeed.support.faqs.map((faq) => ({ ...faq })),
  };
}

export function getTransportManagerSnapshot(): TransportManager {
  return { ...transportSeed.support.manager };
}
