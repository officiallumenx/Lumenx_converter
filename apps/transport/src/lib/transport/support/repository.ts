import { repositoryDelay } from "../utils";
import { getSupportSnapshot, getTransportManagerSnapshot } from "./store";

export const supportRepository = {
  getSnapshot: getSupportSnapshot,
  getManagerSnapshot: getTransportManagerSnapshot,

  async getContent() {
    await repositoryDelay();
    return getSupportSnapshot();
  },

  async getManager() {
    await repositoryDelay();
    return getTransportManagerSnapshot();
  },
};
