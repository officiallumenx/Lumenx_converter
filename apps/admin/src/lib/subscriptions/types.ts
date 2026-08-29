/** Mirrors backend InstituteSubscriptionCurrentDto. */

export type InstituteSubscriptionCurrentDto = {
  plan: string;
  status: string;
  modules: Record<string, boolean>;
  studentLimit: number;
};
