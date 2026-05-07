const ROOM_CODE_WORDS = [
  "beat",
  "disco",
  "groove",
  "mixtape",
  "tempo",
  "vinyl",
] as const;

export function createSuggestedRoomCode(): string {
  const word = ROOM_CODE_WORDS[Math.floor(Math.random() * ROOM_CODE_WORDS.length)];
  const suffix = Math.floor(10 + Math.random() * 90);

  return `${word}-${suffix}`;
}
