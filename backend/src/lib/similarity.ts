export function toVector(f: any): number[] {
  return [
    f.danceability ?? 0,
    f.energy ?? 0,
    f.valence ?? 0,
    f.acousticness ?? 0,
    f.instrumentalness ?? 0,
    (f.tempo ?? 120) / 200,
  ];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}