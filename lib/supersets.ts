// Client-safe superset/giant-set inference for the workout logger.
//
// The plan data marks paired work only with a per-exercise groupLabel string
// ("Superset" / "Giant Set") — there is no explicit pairing key. These helpers
// infer the grouping at render time; nothing in the plan is ever modified.
//
// Rules (deliberately conservative — when unsure, leave exercises ungrouped so
// the logger keeps its normal per-set rest behaviour):
// - Only consecutive, non-cardio exercises with the same normalised label
//   ("superset" | "giant set") form a run.
// - "Superset" runs chunk into pairs (A1/A2). Seed data runs are always even;
//   an odd remainder folds into the last group as a triple rather than leaving
//   a lone "Superset"-labelled exercise with no partner.
// - "Giant Set" runs of 2-5 form one group. Longer runs are several distinct
//   giant sets written back-to-back with no way to tell where one ends, so
//   they stay ungrouped.

export type SupersetGroup = {
  key: string;
  label: string; // original display label, e.g. "Superset"
  memberIds: string[]; // exercise ids in plan order
};

type GroupableExercise = {
  id: string;
  groupLabel: string | null;
  isCardio: boolean;
};

const GROUPABLE = new Set(["superset", "giant set"]);
const MAX_GIANT_SET = 5;

export function inferGroups(exercises: GroupableExercise[]): SupersetGroup[] {
  const groups: SupersetGroup[] = [];

  const flush = (label: string, run: GroupableExercise[]) => {
    const norm = label.trim().toLowerCase();
    if (run.length < 2) return;
    if (norm === "superset") {
      // Chunk into pairs; an odd remainder joins the final pair as a triple.
      const chunks: GroupableExercise[][] = [];
      for (let i = 0; i + 1 < run.length; i += 2) chunks.push(run.slice(i, i + 2));
      if (run.length % 2 === 1) {
        if (chunks.length) chunks[chunks.length - 1].push(run[run.length - 1]);
        else return; // single leftover, nothing to pair with
      }
      for (const c of chunks)
        groups.push({
          key: `sg-${groups.length}`,
          label,
          memberIds: c.map((e) => e.id),
        });
    } else if (norm === "giant set" && run.length <= MAX_GIANT_SET) {
      groups.push({
        key: `sg-${groups.length}`,
        label,
        memberIds: run.map((e) => e.id),
      });
    }
  };

  let runLabel: string | null = null;
  let run: GroupableExercise[] = [];
  for (const ex of exercises) {
    const norm = ex.groupLabel?.trim().toLowerCase() ?? null;
    const groupable = !ex.isCardio && norm !== null && GROUPABLE.has(norm);
    if (groupable && norm === runLabel?.trim().toLowerCase()) {
      run.push(ex);
      continue;
    }
    if (runLabel) flush(runLabel, run);
    runLabel = groupable ? ex.groupLabel : null;
    run = groupable ? [ex] : [];
  }
  if (runLabel) flush(runLabel, run);

  return groups;
}

/** exercise id -> its group, for quick lookup while rendering/logging. */
export function groupIndex(groups: SupersetGroup[]): Map<string, SupersetGroup> {
  const map = new Map<string, SupersetGroup>();
  for (const g of groups) for (const id of g.memberIds) map.set(id, g);
  return map;
}

export type PairingHint = { message: string; tone: "warn" | "info" };

/**
 * Builder-side guidance: which groupLabel runs WON'T pair the way the user
 * probably expects. Mirrors inferGroups' run-walking + normalisation; purely
 * advisory — saving is never blocked (inference degrades safely to ungrouped).
 */
export function pairingHints(
  exercises: { name?: string; groupLabel: string | null; isCardio: boolean }[]
): PairingHint[] {
  const hints: PairingHint[] = [];

  const flush = (label: string, len: number) => {
    const norm = label.trim().toLowerCase();
    if (norm === "superset") {
      if (len === 1)
        hints.push({
          message:
            "A Superset needs a partner — add the next exercise with the same technique directly below.",
          tone: "warn",
        });
      else if (len % 2 === 1)
        hints.push({
          message: `Odd Superset run of ${len} — the last exercise folds into the final pair as a triple.`,
          tone: "info",
        });
    } else if (norm === "giant set") {
      if (len === 1)
        hints.push({
          message: "A Giant set needs 2–5 exercises back-to-back.",
          tone: "warn",
        });
      else if (len > MAX_GIANT_SET)
        hints.push({
          message: `${len} Giant set exercises in a row won't group — split the run with a normal exercise.`,
          tone: "warn",
        });
    }
  };

  let runLabel: string | null = null;
  let runLen = 0;
  for (const ex of exercises) {
    const norm = ex.groupLabel?.trim().toLowerCase() ?? null;
    const groupable = norm !== null && GROUPABLE.has(norm);
    if (ex.isCardio && groupable) {
      hints.push({
        message: `${ex.name?.trim() || "A cardio exercise"} can't join a superset — cardio breaks the pairing.`,
        tone: "warn",
      });
    }
    const inRun = groupable && !ex.isCardio;
    if (inRun && norm === runLabel?.trim().toLowerCase()) {
      runLen += 1;
      continue;
    }
    if (runLabel) flush(runLabel, runLen);
    runLabel = inRun ? ex.groupLabel : null;
    runLen = inRun ? 1 : 0;
  }
  if (runLabel) flush(runLabel, runLen);

  return hints;
}

type RoundExercise = {
  id: string;
  warmupSets: number;
  rows: { setNumber: number; setType: string; done: boolean }[];
};

/**
 * After completing `fromId`'s work set numbered `setNumber`, which group member
 * should the lifter move to next in this round — or null when the round is
 * complete (time to rest)?
 *
 * Round n = the n-th work set of each member (warmups are per-exercise prep and
 * don't participate). Members are scanned in group order starting after the
 * completed exercise, wrapping around, so block-style or out-of-order logging
 * degrades gracefully. A member without a work set at this index (fewer sets,
 * or sets removed) is treated as done. The just-completed set is treated as
 * done regardless of `rows` state, because callers often check before their
 * optimistic state update lands.
 */
export function nextInRound(
  members: RoundExercise[],
  fromId: string,
  setNumber: number
): { id: string; setNumber: number } | null {
  const from = members.find((m) => m.id === fromId);
  const fromIdx = members.findIndex((m) => m.id === fromId);
  if (!from || fromIdx === -1) return null;
  const workIndex = setNumber - from.warmupSets;
  if (workIndex < 1) return null; // a warmup set, not part of a round

  for (let step = 1; step <= members.length; step++) {
    const m = members[(fromIdx + step) % members.length];
    const row = m.rows.find(
      (r) => r.setType === "work" && r.setNumber - m.warmupSets === workIndex
    );
    if (!row) continue;
    if (m.id === fromId && row.setNumber === setNumber) continue;
    if (!row.done) return { id: m.id, setNumber: row.setNumber };
  }
  return null;
}
