/** Async resolution for repositories — resolves immediately to eliminate artificial UI lag. */
export const repositoryDelay = (_ms = 0): Promise<void> => Promise.resolve();
