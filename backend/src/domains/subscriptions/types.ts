/** Institute-scoped subscription read (not Nexus billing writers). */

export type InstituteSubscriptionCurrentDto = {
  plan: string;
  status: string;
  modules: Record<string, boolean>;
  studentLimit: number;
};
