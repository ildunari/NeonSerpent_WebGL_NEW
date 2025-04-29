// Gameplay settings
export const PLAYER_SPEED = 2.5; // Base speed
export const PLAYER_TURN_RATE = 0.05; // Radians per frame
export const SEGMENT_SPACING = 8; // Distance between segments
export const INITIAL_PLAYER_LENGTH = 10; // Starting number of segments
export const ORB_DENSITY = 50 / (1000 * 1000); // Orbs per square pixel
export const ORB_RADIUS = 10;
export const WORLD_PADDING = 50; // Padding from the effective screen edge

// Rendering settings
export const SEGMENT_RADIUS = 5;
export const HEAD_RADIUS = 8;
export const EYE_RADIUS = 2;
export const EYE_OFFSET = 5; // Distance from head center
export const BODY_COLOR = 0x00ff00; // Green
export const HEAD_COLOR = 0x00dd00; // Slightly darker green
export const EYE_COLOR = 0xffffff; // White
export const BORDER_COLOR = 0xffffff; // White border
export const BORDER_WIDTH = 2;
export const BACKGROUND_VIDEO_PATH = '/cave_city_h264_compat.mp4'; // Or '/cave_city.mp4'

// Collision settings
export const SELF_COLLISION_THRESHOLD = 5; // Min segments away to trigger collision

// UI settings
export const SCORE_TEXT_STYLE = {
    fontFamily: 'Arial',
    fontSize: 24,
    fill: 0xffffff, // White
    align: 'right' as const,
};
