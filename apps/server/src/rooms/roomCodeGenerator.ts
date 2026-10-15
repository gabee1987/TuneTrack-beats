import { randomInt as cryptoRandomInt } from "node:crypto";
import { type RoomId, DomainError } from "@tunetrack/shared";

const FRIENDLY_CODE_ATTEMPT_COUNT = 5;
const FALLBACK_ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz";
const FALLBACK_ATTEMPT_COUNT = 6;
const FALLBACK_CODE_LENGTH = 6;
const ROOM_CODE_DIGITS = "23456789";
// One music word known in Hungarian and English, then two digits: "tango42" is easy to say aloud
// and type in one go. No z or y (they swap places on Hungarian keyboards), no w, q or x, no
// doubled letters, and no 0 or 1 to mistake for O, I or l.
const ROOM_CODE_WORDS = [
  "beat",
  "band",
  "banjo",
  "blues",
  "bongo",
  "dance",
  "disco",
  "drum",
  "flute",
  "folk",
  "funk",
  "gong",
  "harp",
  "hit",
  "mambo",
  "metal",
  "music",
  "note",
  "opera",
  "organ",
  "piano",
  "pop",
  "polka",
  "radio",
  "rap",
  "retro",
  "rock",
  "salsa",
  "samba",
  "solo",
  "song",
  "soul",
  "sound",
  "stage",
  "star",
  "tango",
  "tempo",
  "tune",
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

  throw new DomainError("ROOM_CODE_GENERATION_FAILED");
}

function createFriendlyRoomCode(randomInt: RandomInt): RoomId {
  const word = ROOM_CODE_WORDS[randomInt(ROOM_CODE_WORDS.length)];
  const firstDigit = ROOM_CODE_DIGITS[randomInt(ROOM_CODE_DIGITS.length)];
  const secondDigit = ROOM_CODE_DIGITS[randomInt(ROOM_CODE_DIGITS.length)];
  return `${word}${firstDigit}${secondDigit}`;
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
