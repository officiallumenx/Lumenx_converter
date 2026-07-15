import { updateActivityInStore } from "@/lib/activity/sports/activities-store";
import { updatePracticeSessionInStore } from "@/lib/activity/sports/practice-sessions-store";
import { updateTournamentInStore } from "@/lib/activity/sports/tournaments-store";
import type { SportsArchiveRecord } from "./types";

/** Lazy sports repository access — avoids coupling store init to sports/repositories. */
async function sportsRepo() {
  const { sportsRepository } = await import("@/lib/activity/sports/repositories");
  return sportsRepository;
}

export async function restoreNativeArchiveRecord(
  record: SportsArchiveRecord,
): Promise<void> {
  switch (record.sourceModule) {
    case "activities":
      updateActivityInStore(record.sourceId, { status: "scheduled" });
      break;
    case "practice": {
      const repo = await sportsRepo();
      updatePracticeSessionInStore(
        record.sourceId,
        { status: "scheduled" },
        repo.listActiveTeamOptions(),
      );
      break;
    }
    case "tournaments":
      updateTournamentInStore(record.sourceId, { status: "completed" });
      break;
    case "teams":
      /* Future: await repo.restoreTeam(record.sourceId) */
      break;
    default:
      break;
  }
}

export async function archiveNativeRecord(
  sourceModule: SportsArchiveRecord["sourceModule"],
  sourceId: string,
): Promise<void> {
  const repo = await sportsRepo();
  switch (sourceModule) {
    case "teams":
      await repo.archiveTeam(sourceId);
      break;
    case "activities":
      await repo.archiveActivity(sourceId);
      break;
    case "practice":
      await repo.archivePracticeSession(sourceId);
      break;
    case "tournaments":
      await repo.archiveTournament(sourceId);
      break;
    default:
      break;
  }
}
