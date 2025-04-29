// --- Core Data Structures ---

/** Represents a 2D point or vector */
export interface Point {
    x: number;
    y: number;
}

/** Represents a segment of the snake's body */
export interface Segment extends Point {
    isGrowing?: boolean;     // Is the segment currently in its growth animation?
    growthProgress?: number; // Animation progress (0 to 1)
}

/** Represents the snake's current movement vector */
export interface Velocity {
    vx: number;
    vy: number;
}

/**
 * Represents the state of a single snake.
 * Adapted for the NeonSerpent WebGL game.
 */
export interface SnakeState {
    id: string | number; // Unique identifier (using 0 for player for now)
    segs: Segment[];     // Array of segments, head is at index 0
    velocity: Velocity;  // Current direction of movement
    speed: number;       // Current movement speed (pixels per update/second)
    length: number;      // Logical length (used for radius calculations, might differ from segs.length)
    color: number;       // Base color as a hex number (e.g., 0xRRGGBB)
    isPlayer: boolean;   // Flag indicating if this is the player's snake
    // --- Simplified/Deferred properties from original code ---
    // glowFrames: number;  // Counter for temporary post-eating glow effect (Deferred)
    // eatQueue: number[];  // Positions of active eating "pulse" animations along the body (Deferred)
    visible: boolean;    // Should this snake be rendered?
    name: string;        // Added name property
    score: number;       // Added score property (ensure it's here)
    // Add other state as needed (e.g., power-ups)
}

// --- World Constants ---
// World size is now dynamic, calculated in Game.ts based on screen size and zoom
export const WORLD_PADDING = 50; // Pixels from the edge of the visible zoomed video

// --- Player Constants ---
// These might move to a dedicated constants.ts file later
export const PLAYER_INITIAL_SPEED = 45; // Base speed (pixels per second)
export const PLAYER_MAX_ADDITIONAL_SPEED = 100; // Increased max speed increase from length (was 60)
export const PLAYER_SPEED_LENGTH_FACTOR = 0.008; // Slightly reduced factor for slower ramp-up (was 0.01)
export const PLAYER_INITIAL_LENGTH = 10;
export const PLAYER_INITIAL_SEGMENTS = 10;
export const PLAYER_COLOR: number = 0x00FF00; // Green in hex format

// --- Eating & Effects Constants ---
export const PLAYER_EAT_SPEED_BOOST = 2.0; // Multiplier for speed boost peak
export const PLAYER_EAT_SPEED_BOOST_DURATION_MS = 750; // Increased duration (was 350)
export const PLAYER_EAT_GLOW_FRAMES = 15; // How many frames the body glow lasts
export const PLAYER_LENGTH_PER_ORB = 1; // How much logical length increases per orb

// --- Movement & Collision Constants ---
export const KEYBOARD_TURN_COOLDOWN_MS = 100; // Milliseconds between keyboard turns
export const JOYSTICK_TURN_COOLDOWN_MS = 50;  // Milliseconds between joystick turns (shorter)
export const SAFE_PX = 192; // Safety distance behind head for self-collision checks
export const MAX_NECK_SKIP_SEGMENTS = 60; // Max segments to ignore for self-collision

// Helper function adapted from provided code
/**
 * Calculates the approximate visual radius of a snake segment based on its length.
 * Reduced by ~50%
 */
export function segRadius(snakeLength: number): number {
  // Reduced base radius and scaling factor for smaller snake
  // Start at 4px and increase slightly with length
  return 4 + snakeLength / 80;
}


// ---- Orb sizing ----
// Minimum visual radius in px (sprite will be diameter = radius * 2)
export const ORB_BASE_RADIUS = 12;
// Multiplier relative to the starting snake segment radius — lets us scale with future tweaks
export const ORB_RADIUS_MULTIPLIER = 3;

// --- Orb Constants ---
export enum OrbTier {
    LOW,
    MID,
    HIGH
}

export interface OrbTierConfig {
    value: number;
    color: number; // Hex color
    spawnWeight: number; // Relative probability weight
}

export const ORB_TIER_CONFIG: Record<OrbTier, OrbTierConfig> = {
    [OrbTier.LOW]: { value: 1, color: 0x8888FF, spawnWeight: 6 }, // Light Blue, 60%
    [OrbTier.MID]: { value: 3, color: 0xFF88FF, spawnWeight: 3 }, // Pink, 30%
    [OrbTier.HIGH]: { value: 5, color: 0xFFFF88, spawnWeight: 1 }, // Light Yellow, 10%
};

// Calculate total weight for weighted random selection
export const ORB_TOTAL_SPAWN_WEIGHT = Object.values(ORB_TIER_CONFIG).reduce((sum, tier) => sum + tier.spawnWeight, 0);

// Mapping from Orb Tier to its texture path
export const ORB_TEXTURE: Record<OrbTier, string> = {
    [OrbTier.LOW]: '/orb1.png',
    [OrbTier.MID]: '/orb2.png',
    [OrbTier.HIGH]: '/orb3.png'
};

// Add other shared types or constants as needed
