export const AI_COUNT            = 8;
export const AI_BASE_SPEED       = 36;   // px/s
export const AI_VARIANCE_SPEED   = 12;   // ±
export const AI_VIEW_RADIUS      = 600;  // px
export const AI_TURN_COOLDOWN_MS = 80;
export const AI_NOISE            = 0.15; // 0‒1 steering wobble
export const AI_STATES = ['GATHER','HUNT','EVADE'] as const;
export type AIState = typeof AI_STATES[number];
