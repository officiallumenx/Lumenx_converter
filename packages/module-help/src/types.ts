/** Full help content for a single module. */
export interface ModuleHelpContent {
  /** Bare module id — route without leading slash (e.g. "students", "activity-sports"). */
  id: string;
  /** Short display name shown in modal title and button aria-label. */
  title: string;
  /** One-paragraph answer to "What is this module?". */
  whatIs: string;
  /** Bullet list answering "What can you do here?". */
  whatYouCanDo: string[];
  /** Ordered steps answering "How to use it" (plain strings, rendered as <ol>). */
  howToUse: string[];
}

/** Registry keyed by bare module id (no leading slash). */
export type ModuleHelpRegistry = Record<string, ModuleHelpContent>;

export type ModuleHelpResolver = (key: string) => ModuleHelpContent | null;
