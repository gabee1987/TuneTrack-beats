import { randomInt as cryptoRandomInt } from "node:crypto";
import type { RoomId } from "@tunetrack/shared";

const FRIENDLY_CODE_ATTEMPT_COUNT = 5;
const FALLBACK_ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz";
const FALLBACK_ATTEMPT_COUNT = 6;
const FALLBACK_CODE_LENGTH = 6;
const ROOM_CODE_WORDS = [
  "aqua",
  "bass",
  "beat",
  "blue",
  "bold",
  "bop",
  "calm",
  "card",
  "clap",
  "cool",
  "cozy",
  "crew",
  "dash",
  "deck",
  "disc",
  "drum",
  "echo",
  "epic",
  "fast",
  "flip",
  "flow",
  "folk",
  "funk",
  "glow",
  "gold",
  "hop",
  "jam",
  "jazz",
  "keys",
  "lime",
  "loop",
  "mint",
  "mix",
  "moon",
  "neon",
  "note",
  "nova",
  "play",
  "pop",
  "quiz",
  "retro",
  "riff",
  "rock",
  "rose",
  "ruby",
  "rush",
  "sky",
  "slot",
  "slow",
  "snap",
  "song",
  "soul",
  "spin",
  "star",
  "sun",
  "tape",
  "team",
  "teal",
  "time",
  "trio",
  "tune",
  "turn",
  "vibe",
  "wave",
  "wild",
  "year",
  "zing",
  "zoom",
] as const;

type RandomInt = (maxExclusive: number) => number;

export function generateUniqueRoomCode(
  isRoomCodeTaken: (roomId: RoomId) => boolean,
  randomInt: RandomInt = cryptoRandomInt,
): RoomId {
  for (let attempt = 0; attempt < FRIENDLY_CODE_ATTEMPT_COUNT; attempt += 1) {
    const roomCode = createFriendlyRoomCode(randomInt);
    if (!isRoomCodeTaken(roomCode)) {
      return roomCode;
    }
  }

  const fallbackSpaceSize = FALLBACK_ALPHABET.length ** FALLBACK_CODE_LENGTH;
  const fallbackSeed = randomInt(fallbackSpaceSize);
  // With at most five active rooms, one of six consecutive fallback codes must be free.
  for (let offset = 0; offset < FALLBACK_ATTEMPT_COUNT; offset += 1) {
    const roomCode = encodeFallbackRoomCode((fallbackSeed + offset) % fallbackSpaceSize);
    if (!isRoomCodeTaken(roomCode)) {
      return roomCode;
    }
  }

  throw new Error("ROOM_CODE_GENERATION_FAILED");
}

function createFriendlyRoomCode(randomInt: RandomInt): RoomId {
  const firstWord = ROOM_CODE_WORDS[randomInt(ROOM_CODE_WORDS.length)];
  const secondWord = ROOM_CODE_WORDS[randomInt(ROOM_CODE_WORDS.length)];
  const suffix = randomInt(90) + 10;
  return `${firstWord}-${secondWord}-${suffix}`;
}

function encodeFallbackRoomCode(value: number): RoomId {
  let remainingValue = value;
  let roomCode = "";

  for (let index = 0; index < FALLBACK_CODE_LENGTH; index += 1) {
    roomCode = FALLBACK_ALPHABET[remainingValue % FALLBACK_ALPHABET.length] + roomCode;
    remainingValue = Math.floor(remainingValue / FALLBACK_ALPHABET.length);
  }

  return roomCode;
}
