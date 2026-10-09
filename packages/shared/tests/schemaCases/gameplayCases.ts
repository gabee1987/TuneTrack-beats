import {
  buyTimelineCardWithTtPayloadSchema,
  claimChallengePayloadSchema,
  confirmRevealPayloadSchema,
  placeCardPayloadSchema,
  placeChallengePayloadSchema,
  resolveChallengeWindowPayloadSchema,
  skipTrackWithTtPayloadSchema,
  skipTurnPayloadSchema,
} from "../../src/events/schemas.js";
import {
  pastRoomIdLimit,
  TEST_REQUEST_ID,
  TEST_ROOM_ID,
  type SchemaCase,
  type SchemaCases,
} from "./schemaCase.js";

const roomAction = { roomId: TEST_ROOM_ID, requestId: TEST_REQUEST_ID };
const roomActionPastLimits = {
  ...pastRoomIdLimit,
  "a request id that is not a UUID": { requestId: "12345" },
};

function roomActionCase(schema: SchemaCase["schema"]): SchemaCase {
  return { schema, valid: roomAction, pastLimits: roomActionPastLimits };
}

function slotActionCase(schema: SchemaCase["schema"]): SchemaCase {
  return {
    schema,
    valid: { ...roomAction, selectedSlotIndex: 1 },
    edges: { "the first slot": { selectedSlotIndex: 0 } },
    pastLimits: {
      ...roomActionPastLimits,
      "a negative slot": { selectedSlotIndex: -1 },
      "a fractional slot": { selectedSlotIndex: 0.5 },
    },
  };
}

export const gameplaySchemaCases: SchemaCases = {
  placeCardPayloadSchema: slotActionCase(placeCardPayloadSchema),
  placeChallengePayloadSchema: slotActionCase(placeChallengePayloadSchema),
  confirmRevealPayloadSchema: roomActionCase(confirmRevealPayloadSchema),
  claimChallengePayloadSchema: roomActionCase(claimChallengePayloadSchema),
  resolveChallengeWindowPayloadSchema: roomActionCase(resolveChallengeWindowPayloadSchema),
  skipTrackWithTtPayloadSchema: roomActionCase(skipTrackWithTtPayloadSchema),
  buyTimelineCardWithTtPayloadSchema: roomActionCase(buyTimelineCardWithTtPayloadSchema),
  skipTurnPayloadSchema: roomActionCase(skipTurnPayloadSchema),
};
