import {
  awardTtPayloadSchema,
  closeRoomPayloadSchema,
  createRoomPayloadSchema,
  getRoomPreviewPayloadSchema,
  joinRoomPayloadSchema,
  kickPlayerPayloadSchema,
  renameRoomPayloadSchema,
  startGamePayloadSchema,
  transferHostPayloadSchema,
  updatePlayerProfilePayloadSchema,
  updatePlayerSettingsPayloadSchema,
  updateRoomSettingsPayloadSchema,
} from "../../src/events/schemas.js";
import { pastRoomIdLimit, TEST_REQUEST_ID, TEST_ROOM_ID, type SchemaCases } from "./schemaCase.js";

const player = { displayName: "Player One", sessionId: "TEST_SESSION_1" };
const longName = "P".repeat(24);

const requestIdPastLimit = { "a request id that is not a UUID": { requestId: "12345" } };

export const lobbySchemaCases: SchemaCases = {
  joinRoomPayloadSchema: {
    schema: joinRoomPayloadSchema,
    valid: { roomId: TEST_ROOM_ID, ...player },
    edges: {
      "a 3-character room code": { roomId: "abc" },
      "a 12-character room code": { roomId: "abcdefghijkl" },
      "a 24-character name": { displayName: longName },
      "a 1-character name": { displayName: "P" },
    },
    pastLimits: {
      ...pastRoomIdLimit,
      "a 13-character room code": { roomId: "abcdefghijklm" },
      "a room code with a space": { roomId: "test room" },
      "a 25-character name": { displayName: `${longName}P` },
      "a blank name": { displayName: "   " },
      "a blank session id": { sessionId: " " },
    },
  },
  createRoomPayloadSchema: {
    schema: createRoomPayloadSchema,
    valid: player,
    edges: { "a custom room code": { roomId: TEST_ROOM_ID } },
    pastLimits: {
      "an invalid custom room code": { roomId: "ab" },
      "a 25-character name": { displayName: `${longName}P` },
    },
  },
  getRoomPreviewPayloadSchema: {
    schema: getRoomPreviewPayloadSchema,
    valid: { roomId: TEST_ROOM_ID },
    pastLimits: pastRoomIdLimit,
  },
  updateRoomSettingsPayloadSchema: {
    schema: updateRoomSettingsPayloadSchema,
    valid: { roomId: TEST_ROOM_ID },
    edges: {
      "3 cards to win": { targetTimelineCardCount: 3 },
      "30 cards to win": { targetTimelineCardCount: 30 },
      "5 starting cards": { defaultStartingTimelineCardCount: 5 },
      "5 starting tokens": { startingTtTokenCount: 5 },
      "a 3-second challenge window": { challengeWindowDurationSeconds: 3 },
      "a 30-second challenge window": { challengeWindowDurationSeconds: 30 },
      "no challenge window": { challengeWindowDurationSeconds: null },
    },
    pastLimits: {
      ...pastRoomIdLimit,
      "2 cards to win": { targetTimelineCardCount: 2 },
      "31 cards to win": { targetTimelineCardCount: 31 },
      "0 starting cards": { defaultStartingTimelineCardCount: 0 },
      "6 starting cards": { defaultStartingTimelineCardCount: 6 },
      "-1 starting tokens": { startingTtTokenCount: -1 },
      "6 starting tokens": { startingTtTokenCount: 6 },
      "a 2-second challenge window": { challengeWindowDurationSeconds: 2 },
      "a 31-second challenge window": { challengeWindowDurationSeconds: 31 },
      "an unknown reveal mode": { revealConfirmMode: "anyone" },
      "a fractional card count": { targetTimelineCardCount: 10.5 },
    },
    defaults: {
      targetTimelineCardCount: 10,
      defaultStartingTimelineCardCount: 1,
      startingTtTokenCount: 0,
      revealConfirmMode: "host_only",
      ttModeEnabled: false,
      challengeWindowDurationSeconds: 10,
    },
  },
  renameRoomPayloadSchema: {
    schema: renameRoomPayloadSchema,
    valid: { roomId: TEST_ROOM_ID, nextRoomId: "TEST_ROOM_2", requestId: TEST_REQUEST_ID },
    pastLimits: {
      ...pastRoomIdLimit,
      "a next room code with a slash": { nextRoomId: "test/room" },
      ...requestIdPastLimit,
    },
  },
  updatePlayerSettingsPayloadSchema: {
    schema: updatePlayerSettingsPayloadSchema,
    valid: {
      roomId: TEST_ROOM_ID,
      playerId: "12345",
      startingTimelineCardCount: 1,
      startingTtTokenCount: 0,
    },
    edges: { "5 cards and 5 tokens": { startingTimelineCardCount: 5, startingTtTokenCount: 5 } },
    pastLimits: {
      ...pastRoomIdLimit,
      "0 starting cards": { startingTimelineCardCount: 0 },
      "6 starting cards": { startingTimelineCardCount: 6 },
      "6 starting tokens": { startingTtTokenCount: 6 },
      "a blank player id": { playerId: " " },
    },
  },
  updatePlayerProfilePayloadSchema: {
    schema: updatePlayerProfilePayloadSchema,
    valid: { roomId: TEST_ROOM_ID, displayName: "Player One" },
    pastLimits: { ...pastRoomIdLimit, "a 25-character name": { displayName: `${longName}P` } },
  },
  awardTtPayloadSchema: {
    schema: awardTtPayloadSchema,
    valid: { roomId: TEST_ROOM_ID, playerId: "12345", amount: 1, requestId: TEST_REQUEST_ID },
    edges: { "-5 tokens": { amount: -5 }, "+5 tokens": { amount: 5 } },
    pastLimits: {
      ...pastRoomIdLimit,
      "-6 tokens": { amount: -6 },
      "+6 tokens": { amount: 6 },
      "zero tokens": { amount: 0 },
      ...requestIdPastLimit,
    },
  },
  startGamePayloadSchema: {
    schema: startGamePayloadSchema,
    valid: { roomId: TEST_ROOM_ID },
    pastLimits: { ...pastRoomIdLimit, ...requestIdPastLimit },
  },
  transferHostPayloadSchema: {
    schema: transferHostPayloadSchema,
    valid: { roomId: TEST_ROOM_ID, playerId: "12345" },
    pastLimits: { ...pastRoomIdLimit, "a blank player id": { playerId: "" } },
  },
  kickPlayerPayloadSchema: {
    schema: kickPlayerPayloadSchema,
    valid: { roomId: TEST_ROOM_ID, playerId: "12345" },
    pastLimits: { ...pastRoomIdLimit, "a blank player id": { playerId: "" } },
  },
  closeRoomPayloadSchema: {
    schema: closeRoomPayloadSchema,
    valid: { roomId: TEST_ROOM_ID },
    pastLimits: { ...pastRoomIdLimit, ...requestIdPastLimit },
  },
};
