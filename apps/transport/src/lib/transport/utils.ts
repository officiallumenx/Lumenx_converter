/** Shared async delay for mock repositories — swap for real HTTP later. */
export const repositoryDelay = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));
