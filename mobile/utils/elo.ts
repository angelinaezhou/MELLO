export function calcElo(winnerScore: number, loserScore: number, k = 32) {
  const expected = 1 / (1 + Math.pow(10, (loserScore - winnerScore) / 400));
  return {
    newWinner: Math.round(winnerScore + k * (1 - expected)),
    newLoser: Math.round(loserScore + k * (0 - (1 - expected))),
  };
}