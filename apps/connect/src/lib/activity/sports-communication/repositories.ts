import {
  archiveAnnouncementInStore,
  cancelAnnouncementInStore,
  createAnnouncementInStore,
  getAnnouncementByIdFromStore,
  listAnnouncementsFromStore,
  resetSportsCommunicationStore,
  scheduleAnnouncementInStore,
  sendAnnouncementNowInStore,
  updateAnnouncementInStore,
} from "./store";
import type {
  CommunicationAnnouncementInput,
  CommunicationListFilters,
  SportsCommunicationAnnouncement,
} from "./types";

const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));

export const sportsCommunicationRepository = {
  async listAnnouncements(
    filters?: CommunicationListFilters,
  ): Promise<SportsCommunicationAnnouncement[]> {
    await delay();
    return listAnnouncementsFromStore(filters);
  },
  getAnnouncementsSnapshot(): SportsCommunicationAnnouncement[] {
    return listAnnouncementsFromStore();
  },
  async getAnnouncementById(id: string): Promise<SportsCommunicationAnnouncement | null> {
    await delay(120);
    return getAnnouncementByIdFromStore(id);
  },
  async createAnnouncement(
    input: CommunicationAnnouncementInput,
    schedule = false,
  ): Promise<SportsCommunicationAnnouncement> {
    await delay(280);
    return createAnnouncementInStore(input, schedule);
  },
  async updateAnnouncement(
    id: string,
    patch: Partial<CommunicationAnnouncementInput>,
  ): Promise<SportsCommunicationAnnouncement> {
    await delay(280);
    return updateAnnouncementInStore(id, patch);
  },
  async scheduleAnnouncement(
    id: string,
    scheduledDate: string,
    scheduledTime: string,
  ): Promise<SportsCommunicationAnnouncement> {
    await delay(220);
    return scheduleAnnouncementInStore(id, scheduledDate, scheduledTime);
  },
  async sendNow(id: string): Promise<SportsCommunicationAnnouncement> {
    await delay(300);
    return sendAnnouncementNowInStore(id);
  },
  async cancelAnnouncement(id: string): Promise<SportsCommunicationAnnouncement> {
    await delay(220);
    return cancelAnnouncementInStore(id);
  },
  async archiveAnnouncement(id: string): Promise<SportsCommunicationAnnouncement> {
    await delay(220);
    return archiveAnnouncementInStore(id);
  },
  reset() {
    resetSportsCommunicationStore();
  },
};
