const K = 64; // bigger K = more movement per matchup

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

// Normalize but clamp to vibe bands instead of stretching min/max to 0-100
export function normalizeScores(songs: { eloScore: number; vibe: "loved" | "okay" | "dislike" }[]): number[] {
  if (songs.length === 0) return [];
  if (songs.length === 1) return [vibeCenter(songs[0].vibe)];

  // Normalize within each vibe band separately
  const bands: Record<string, { min: number; max: number; lo: number; hi: number }> = {
    loved:   { min: Infinity, max: -Infinity, lo: 62, hi: 100 },
    okay:    { min: Infinity, max: -Infinity, lo: 32, hi: 61 },
    dislike: { min: Infinity, max: -Infinity, lo: 0,  hi: 31 },
  };

  // Find min/max ELO within each band
  for (const s of songs) {
    const b = bands[s.vibe];
    if (s.eloScore < b.min) b.min = s.eloScore;
    if (s.eloScore > b.max) b.max = s.eloScore;
  }

  return songs.map((s) => {
    const b = bands[s.vibe];
    if (b.min === b.max) return vibeCenter(s.vibe);
    const normalized = (s.eloScore - b.min) / (b.max - b.min); // 0-1 within band
    return Math.round((b.lo + normalized * (b.hi - b.lo)) * 10) / 10;
  });
}

function vibeCenter(vibe: "loved" | "okay" | "dislike"): number {
  if (vibe === "loved") return 81;
  if (vibe === "okay") return 46;
  return 15;
}

export function matchupsNeeded(rankedCount: number): number {
  if (rankedCount === 0) return 0;
  if (rankedCount < 5) return 2;
  if (rankedCount < 15) return 4;
  return 6;
}

export function startingElo(vibe: "loved" | "okay" | "dislike"): number {
  if (vibe === "loved") return 1600;
  if (vibe === "okay") return 1200;
  return 800;
}