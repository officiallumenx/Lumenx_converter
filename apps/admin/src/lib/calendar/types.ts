import type { EventDto } from "../events/types";

export type { EventDto };

/**
 * Presentation-only row consumed by the Academic Calendar admin route.
 * Never used as tenant/auth authority.
 */
export type CalendarListItem = {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  time?: string;
  kind: string;
};

export type ListCalendarParams = {
  instituteId: string;
};
