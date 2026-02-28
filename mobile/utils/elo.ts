const K = 32;

export function calcElo(winnerElo: number, loserElo: number): {
  newWinner: number;
  newLoser: number;
} {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser = 1 - expectedWinner;

  return {
    newWinner: Math.round(winnerElo + K * (1 - expectedWinner)),
    newLoser: Math.round(loserElo + K * (0 - expectedLoser)),
  };
}

// Normalize all ELO scores to 0-100 with 1 decimal
export function normalizeScores(songs: { eloScore: number }[]): number[] {
  if (songs.length === 0) return [];
  if (songs.length === 1) return [50.0];

  const scores = songs.map((s) => s.eloScore);
  const min = Math.min(...scores);
  const max = Math.max(...scores);

  if (min === max) return songs.map(() => 50.0);

  return scores.map((s) =>
    Math.round(((s - min) / (max - min)) * 100 * 10) / 10
  );
}

// How many head-to-head matchups to run when a new song is added
// More songs in list = more comparisons needed to find correct placement
export function matchupsNeeded(rankedCount: number): number {
  if (rankedCount === 0) return 0;
  if (rankedCount < 5) return 2;
  if (rankedCount < 15) return 4;
  return 6;
}

// Starting ELO based on vibe
export function startingElo(vibe: "loved" | "okay" | "dislike"): number {
  if (vibe === "loved") return 1400;
  if (vibe === "okay") return 1200;
  return 800;
}