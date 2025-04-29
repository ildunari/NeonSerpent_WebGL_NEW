import * as PIXI from 'pixi.js'; // Import PixiJS
import {
    Point,
    Segment,
    Velocity,
    SnakeState,
    PLAYER_INITIAL_SPEED,
    PLAYER_INITIAL_LENGTH,
    PLAYER_INITIAL_SEGMENTS,
    PLAYER_COLOR, // RGBA array [r, g, b, a] (0-1 range)
    PLAYER_MAX_ADDITIONAL_SPEED, // Added
    PLAYER_SPEED_LENGTH_FACTOR, // Added
    // KEYBOARD_TURN_COOLDOWN_MS, // Removed unused import
    // JOYSTICK_TURN_COOLDOWN_MS,
    SAFE_PX,
    MAX_NECK_SKIP_SEGMENTS,
    segRadius,
    // Import eating constants
    PLAYER_EAT_SPEED_BOOST,
    PLAYER_EAT_SPEED_BOOST_DURATION_MS,
    PLAYER_EAT_GLOW_FRAMES,
    PLAYER_LENGTH_PER_ORB
    // WORLD_WIDTH, WORLD_HEIGHT removed from imports
} from './types';
import { dist } from './utils'; // Ensure dist is imported

 // // Helper function to position 'current' exactly 'distance' behind 'target' // REMOVED UNUSED
// function moveTowards(target: Point, current: Point, distance: number): Point {
//   const dx = current.x - target.x; // Vector from target to current
//   const dy = current.y - target.y;
//   const len = Math.hypot(dx, dy);
//   if (len === 0) return { ...current }; // Avoid division by zero if points are coincident
//   // Calculate the scale factor to make the vector length exactly 'distance'
//   const scale = distance / len;
//   // Calculate the new position by adding the scaled vector to the target's position
//   return { x: target.x + dx * scale, y: target.y + dy * scale };
// }

/** Helper function to wrap coordinates within the torus world */
function wrap(p: Point, worldWidth: number, worldHeight: number): Point {
    const halfWidth = worldWidth / 2;
    const halfHeight = worldHeight / 2;
    let { x, y } = p; // Destructure for modification

    if (x > halfWidth) {
        x -= worldWidth;
    } else if (x < -halfWidth) {
        x += worldWidth;
    }
    if (y > halfHeight) {
        y -= worldHeight;
    } else if (y < -halfHeight) {
        y += worldHeight;
    }
    return { x, y };
}

/** Helper function to calculate the shortest delta on a torus */
function torusDelta(target: Point, current: Point, worldWidth: number, worldHeight: number): [number, number] {
    const halfWidth = worldWidth / 2;
    const halfHeight = worldHeight / 2;

    let dx = target.x - current.x;
    let dy = target.y - current.y;

    // Adjust delta for wrapping
    if (dx > halfWidth) {
        dx -= worldWidth;
    } else if (dx < -halfWidth) {
        dx += worldWidth;
    }
    if (dy > halfHeight) {
        dy -= worldHeight;
    } else if (dy < -halfHeight) {
        dy += worldHeight;
    }

    return [dx, dy];
}

/** Torus-aware version of moveTowards */
function moveTowardsTorus(target: Point, current: Point, distance: number, worldWidth: number, worldHeight: number): Point {
    // Calculate the shortest path delta from current *to* target (away from head)
    const [dx, dy] = torusDelta(current, target, worldWidth, worldHeight); // Swapped target/current

    // Calculate the length of this shortest path vector
    const len = Math.hypot(dx, dy) || 1; // Use || 1 to prevent division by zero

    // Calculate the scale factor to make the vector length exactly 'distance'
    const scale = distance / len;

    // Calculate the new position by adding the scaled shortest path vector to the *target* point's position
    // This ensures the segment is placed 'distance' away from the target (segment ahead)
    return wrap(
      { x: target.x + dx * scale, y: target.y + dy * scale },
      worldWidth, worldHeight
    );
}


// Represents the player-controlled serpent, implementing the SnakeState interface
export class PlayerSerpent implements SnakeState {
    // --- SnakeState Properties ---
    id: string | number;
    segs: Segment[];
    velocity: Velocity;
    speed: number;
    length: number;
    color: number; // Use hex number format directly
    isPlayer: boolean;
    visible: boolean;
    name: string; // Added name property

    // --- Additional Player-Specific Properties ---
    private lastTurnTimestamp: number = 0;
    public eatQueue: { distanceTraveled: number, growthAmount: number }[] = []; // Tracks pulse and associated growth
    public glowFrames: number = 0;  // Counter for temporary post-eating glow effect
    public speedBoostTimer: number = 0; // Timer for temporary speed boost (in seconds) - Made public
    public baseSpeed: number; // To store the speed before boost - Made public
    public score: number = 0; // Added score property
    // Removed growthPending field
    // Removed distAccumulator
    private readonly segmentGrowthDuration = 0.5; // Seconds for a segment to grow fully

    // --- PixiJS Integration ---
    public pixiObject: PIXI.Graphics | null = null; // Reverted to Graphics for now
    // Removed mesh properties as SimpleRope is unavailable/complex for now
    // private bodyMesh: PIXI.SimpleRope | null = null;
    // private outlineMesh: PIXI.SimpleRope | null = null;
    // private glowMesh: PIXI.SimpleRope | null = null;
    // private headGraphics: PIXI.Graphics | null = null;
    // private static whiteTexture: PIXI.Texture | null = null;

    constructor(startX: number, startY: number) {
        this.id = 'player';
        this.isPlayer = true;
        this.visible = true;
        this.color = PLAYER_COLOR;
        this.baseSpeed = PLAYER_INITIAL_SPEED; // Initialize baseSpeed
        this.speed = this.baseSpeed;           // Initialize speed from baseSpeed
        this.length = PLAYER_INITIAL_LENGTH;
        this.velocity = { vx: 1, vy: 0 }; // Start moving right
        this.segs = [];
        this.name = "Player"; // Initialize player name
        this.score = 0; // Initialize score
        // Spread initial segments horizontally to prevent immediate self-collision
        const spacing = segRadius(this.length) * 2; // Space based on segment diameter
        for (let i = 0; i < PLAYER_INITIAL_SEGMENTS; i++) {
            // Offset each segment to the left of the previous one
            this.segs.push({ x: startX - i * spacing, y: startY });
        }
        // Removed collisionImmunityFrames initialization
        console.log(`PlayerSerpent created at (${startX}, ${startY}) with spaced segments.`);
    }

    // --- PixiJS Methods ---

    /** Initializes the PixiJS Graphics object for the serpent (Reverted) */
    initPixi(stage: PIXI.Container): void {
        if (this.pixiObject) {
            this.destroyPixi(); // Clean up if already initialized
        }
        // Reverted to using a single Graphics object
        this.pixiObject = new PIXI.Graphics();
        this.pixiObject.visible = this.visible;
        stage.addChild(this.pixiObject);
        console.log(`PlayerSerpent Pixi Graphics object initialized.`);
    }

    /**
     * Updates the PixiJS Graphics object to match the serpent's current state. (Reverted)
     * Includes dynamic styling for safe neck and eating pulses.
     * @param playerSkipCount The number of neck segments to style differently.
     * @param worldWidth Current dynamic world width.
     * @param worldHeight Current dynamic world height.
     */
    syncPixi(playerSkipCount: number, worldWidth: number, worldHeight: number): void {
        // Reverted to using the single Graphics object
        if (!this.pixiObject) return;

        this.pixiObject.visible = this.visible;
        if (!this.visible || this.segs.length === 0) {
            this.pixiObject.clear(); // Clear if not visible or no segments
            return;
        }

        const graphics = this.pixiObject; // Use the main graphics object
        graphics.clear(); // Clear the graphics object each frame

        const radius = segRadius(this.length);
        const bodyWidth = radius * 2;
        const headRadius = radius * 1.2; // Slightly larger head

        const baseHexColor = this.color; // Base color from state
        const baseAlpha = 1.0; // Base alpha

        // Define base effect properties
        const baseOutlineColor = 0xffffff; // White outline
        const basePlayerGlowColor = 0xFFFF00; // Yellow glow
        const basePlayerGlowStrength = 9; // Glow thickness offset
        const baseGlowAlpha = 0.25;
        const safeNeckColor = 0x0099aa; // Distinct color for safe neck
        const safeNeckGlowStrength = 3; // Reduced glow for safe neck
        const pulseColor = 0xffffff; // White flash for pulse
        const pulseGlowBoost = 4; // Extra glow strength during pulse
        const pulseWidthMultiplier = 0.5; // How much swellFactor affects width (0.5 = 50%)

        // --- Draw Body (Layered Segment Connections) --- Reverted Logic ---
        // Stop one segment earlier to handle the final connection + tail bulb separately
        if (this.segs.length > 1) {
            for (let i = 0; i < this.segs.length - 2; i++) { // Stop at length - 2
                const startSeg = this.segs[i];
                const endSeg = this.segs[i + 1];

                // --- Calculate segment-specific state ---
                // Calculate cumulative distance for pulse checking (simplified, might need torus dist)
                let cumulativeDistanceToStart = 0;
                for(let j = 0; j < i; j++) {
                    cumulativeDistanceToStart += dist(this.segs[j], this.segs[j+1]); // Simple dist for now
                }
                const segmentLength = dist(startSeg, endSeg); // Simple dist for now
                const segmentMidpointDistance = cumulativeDistanceToStart + segmentLength / 2;

                let swellFactor = 0;
                const pulseWaveWidth = segRadius(this.length) * 8;
                for (const pulse of this.eatQueue) {
                    const distFromPulseCenter = Math.abs(segmentMidpointDistance - pulse.distanceTraveled);
                    if (distFromPulseCenter < pulseWaveWidth / 2) {
                        swellFactor = Math.max(swellFactor, 1 - (distFromPulseCenter / (pulseWaveWidth / 2)));
                    }
                }
                const isPulsing = swellFactor > 0.01;
                const isSafePlayerSegment = this.isPlayer && playerSkipCount > 0 && i < playerSkipCount;

                // --- Determine conditional styles --- Reverted Logic ---
                // Get growth progress for the end segment (the one potentially growing)
                // Also consider the start segment's growth for smoother connection appearance
                const startGrowth = startSeg.growthProgress ?? 1.0;
                const endGrowth = endSeg.growthProgress ?? 1.0;
                const avgGrowth = (startGrowth + endGrowth) / 2; // Average growth for the connection

                const finalBaseWidth = bodyWidth * (1 + swellFactor * pulseWidthMultiplier);
                const currentBaseWidth = finalBaseWidth * avgGrowth; // Scale width by average growth
                const currentOutlineWidth = currentBaseWidth + 2 * avgGrowth; // Scale outline addition too
                const currentAlpha = baseAlpha * avgGrowth; // Fade in alpha based on average growth

                let currentGlowWidth: number;
                let currentGlowColor: number;
                let currentBodyColor: number;

                const baseColorWithGlow = this.glowFrames > 0 ? 0xffffff : baseHexColor;

                if (isSafePlayerSegment) {
                    currentBodyColor = safeNeckColor;
                    currentGlowColor = safeNeckColor;
                    // Use avgGrowth for scaling effects based on the connection's average growth
                    currentGlowWidth = currentBaseWidth + safeNeckGlowStrength * avgGrowth * (1 + swellFactor * pulseWidthMultiplier);
                } else {
                    currentBodyColor = isPulsing ? pulseColor : baseColorWithGlow;
                    currentGlowColor = basePlayerGlowColor;
                    const currentGlowStrength = isPulsing ? (basePlayerGlowStrength + pulseGlowBoost) : basePlayerGlowStrength;
                    // Use avgGrowth for scaling effects based on the connection's average growth
                    currentGlowWidth = currentBaseWidth + currentGlowStrength * avgGrowth * (1 + swellFactor * pulseWidthMultiplier);
                }

                // --- Check for World Wrap --- Reverted Logic ---
                const isWrapX = Math.abs(startSeg.x - endSeg.x) > worldWidth / 2;
                const isWrapY = Math.abs(startSeg.y - endSeg.y) > worldHeight / 2;
                const isWrap = isWrapX || isWrapY;

                // --- Draw Layers (only if not wrapping and segment has started growing) --- Reverted Logic ---
                if (!isWrap && currentBaseWidth > 0.1) { // Avoid drawing near-zero width lines
                    // 1. Draw Outline Layer
                    graphics.stroke({
                        width: currentOutlineWidth,
                        color: baseOutlineColor,
                        alpha: currentAlpha, // Use interpolated alpha
                        cap: 'round',
                        join: 'round'
                    });
                    graphics.moveTo(startSeg.x, startSeg.y);
                    graphics.lineTo(endSeg.x, endSeg.y);
                    graphics.stroke();

                    // 2. Draw Glow Layer
                    graphics.stroke({
                        width: currentGlowWidth,
                        color: currentGlowColor,
                        alpha: baseGlowAlpha * avgGrowth, // Scale glow alpha by average growth
                        cap: 'round',
                        join: 'round'
                    });
                    graphics.moveTo(startSeg.x, startSeg.y);
                    graphics.lineTo(endSeg.x, endSeg.y);
                    graphics.stroke();

                    // 3. Draw Main Body Layer
                    graphics.stroke({
                        width: currentBaseWidth,
                        color: currentBodyColor,
                        alpha: currentAlpha, // Use interpolated alpha
                        cap: 'round',
                        join: 'round'
                    });
                    graphics.moveTo(startSeg.x, startSeg.y);
                    graphics.lineTo(endSeg.x, endSeg.y);
                    graphics.stroke();
                }
            } // End of body segment loop
        } else if (this.segs.length === 1) {
            // Handle drawing just the head if only one segment exists (logic below handles this)
        }

        // --- Draw Final Segment Connection & Tail Bulb --- Reverted Logic ---
        if (this.segs.length >= 2) {
            const penultimateSeg = this.segs[this.segs.length - 2];
            const tailSeg = this.segs[this.segs.length - 1];
            const tailGrowth = tailSeg.growthProgress ?? 1.0; // Growth of the *last* segment

            // Calculate styles based *only* on the tail's growth
            const tailBaseWidth = bodyWidth * tailGrowth;
            const tailOutlineWidth = tailBaseWidth + 2 * tailGrowth;
            const tailAlpha = baseAlpha * tailGrowth;
            const tailColor = this.glowFrames > 0 ? 0xffffff : baseHexColor; // Consider glowFrames

            const tailGlowColor = basePlayerGlowColor;
            const tailGlowWidth = tailBaseWidth + basePlayerGlowStrength * tailGrowth;
            const tailGlowAlpha = baseGlowAlpha * tailGrowth;

            // Check for wrap between penultimate and tail
            const isWrapX = Math.abs(penultimateSeg.x - tailSeg.x) > worldWidth / 2;
            const isWrapY = Math.abs(penultimateSeg.y - tailSeg.y) > worldHeight / 2;
            const isWrap = isWrapX || isWrapY;

            // Draw Connection Layers only if the tail segment is mostly grown (> 85%)
            if (!isWrap && tailGrowth > 0.85 && tailBaseWidth > 0.1) {
                // 1. Outline
                graphics.stroke({ width: tailOutlineWidth, color: baseOutlineColor, alpha: tailAlpha, cap: 'round', join: 'round' });
                graphics.moveTo(penultimateSeg.x, penultimateSeg.y);
                graphics.lineTo(tailSeg.x, tailSeg.y);
                graphics.stroke();
                // 2. Glow
                graphics.stroke({ width: tailGlowWidth, color: tailGlowColor, alpha: tailGlowAlpha, cap: 'round', join: 'round' });
                graphics.moveTo(penultimateSeg.x, penultimateSeg.y);
                graphics.lineTo(tailSeg.x, tailSeg.y);
                graphics.stroke();
                // 3. Body
                graphics.stroke({ width: tailBaseWidth, color: tailColor, alpha: tailAlpha, cap: 'round', join: 'round' });
                graphics.moveTo(penultimateSeg.x, penultimateSeg.y);
                graphics.lineTo(tailSeg.x, tailSeg.y);
                graphics.stroke();
            }

            // Draw Tail Bulb (always draw if tail exists and is growing, even if connection wrapped)
            const tailRadius = Math.max(radius * tailGrowth, 1);
            if (tailRadius > 0.1) {
                graphics.circle(tailSeg.x, tailSeg.y, tailRadius);
                graphics.fill({ color: tailColor, alpha: tailAlpha });
            }
        } // End final segment/tail bulb

        // --- Draw Head (Layered) --- Reverted Logic ---
        if (this.segs.length > 0) { // Ensure head exists
            const headSeg = this.segs[0];
            const headGrowth = headSeg.growthProgress ?? 1.0; // Usually 1 for head
            const currentHeadRadius = headRadius * headGrowth;

            if (currentHeadRadius > 0.1) {
                const headColor = this.glowFrames > 0 ? 0xffffff : baseHexColor;
                const headGlowStrength = basePlayerGlowStrength + 2;
                const currentHeadGlowRadius = currentHeadRadius + (headGlowStrength / 2) * headGrowth;
                const currentHeadOutlineRadius = currentHeadRadius + 1 * headGrowth;
                const currentHeadAlpha = baseAlpha * headGrowth;

                // 1. Head Outline
                graphics.circle(headSeg.x, headSeg.y, currentHeadOutlineRadius);
                graphics.stroke({ width: 2 * headGrowth, color: baseOutlineColor, alpha: currentHeadAlpha });

                // 2. Head Glow
                graphics.circle(headSeg.x, headSeg.y, currentHeadGlowRadius);
                graphics.fill({ color: basePlayerGlowColor, alpha: baseGlowAlpha * headGrowth });

                // 3. Head Fill
                graphics.circle(headSeg.x, headSeg.y, currentHeadRadius);
                graphics.fill({ color: headColor, alpha: currentHeadAlpha });

                // --- Draw Eyes (Layered and Oriented) ---
                const finalEyeRadius = Math.max(2 * headGrowth, currentHeadRadius * 0.2);
                const eyeDist = currentHeadRadius * 0.5;
                const eyeAngle = Math.atan2(this.velocity.vy, this.velocity.vx);
                const eyeAnglePerp = eyeAngle + Math.PI / 2;

                const eye1X = headSeg.x + Math.cos(eyeAnglePerp) * eyeDist;
                const eye1Y = headSeg.y + Math.sin(eyeAnglePerp) * eyeDist;
                const eye2X = headSeg.x - Math.cos(eyeAnglePerp) * eyeDist;
                const eye2Y = headSeg.y - Math.sin(eyeAnglePerp) * eyeDist;

                const eyeGlowColor = 0xffffff;
                const eyeGlowAlpha = 0.15 * headGrowth;
                const eyeGlowRadius = finalEyeRadius + 2 * headGrowth;
                const eyeFillColor = 0x000000;
                const eyeFillAlpha = 0.9 * headGrowth;

                // Eye 1 Glow
                graphics.circle(eye1X, eye1Y, eyeGlowRadius);
                graphics.fill({ color: eyeGlowColor, alpha: eyeGlowAlpha });
                // Eye 2 Glow
                graphics.circle(eye2X, eye2Y, eyeGlowRadius);
                graphics.fill({ color: eyeGlowColor, alpha: eyeGlowAlpha });

                // Eye 1 Fill
                graphics.circle(eye1X, eye1Y, finalEyeRadius);
                graphics.fill({ color: eyeFillColor, alpha: eyeFillAlpha });
                // Eye 2 Fill
                graphics.circle(eye2X, eye2Y, finalEyeRadius);
                graphics.fill({ color: eyeFillColor, alpha: eyeFillAlpha });
            }
        } // End head drawing

    } // End syncPixi

    /** Removes the PixiJS Graphics object from the stage and destroys it (Reverted) */
    destroyPixi(): void {
        if (this.pixiObject) {
            this.pixiObject.parent?.removeChild(this.pixiObject);
            // Correct destroy options for Graphics object
            this.pixiObject.destroy({ children: true }); // texture and baseTexture are not applicable here
            this.pixiObject = null;
            console.log("PlayerSerpent Pixi Graphics object destroyed.");
        }
    }


    // --- Core Logic Methods (Keep these public as they are used by Game/AIController) ---

    public setDirection(dx: number, dy: number): void {
        const magnitude = Math.hypot(dx, dy);
        if (magnitude > 0.01) { // Avoid division by zero or near-zero
            this.velocity.vx = dx / magnitude;
            this.velocity.vy = dy / magnitude;
        }
    }

    public attemptTurn(desiredDir: Point, currentTimestamp: number, turnCooldown: number): boolean {
        // Cooldown check
        if (currentTimestamp - this.lastTurnTimestamp <= turnCooldown) {
            return false; // Too soon
        }

        // Prevent 180-degree turns
        const dotProduct = desiredDir.x * this.velocity.vx + desiredDir.y * this.velocity.vy;
        if (dotProduct < -0.9) { // Allow slightly more than perfect opposite
            return false; // Trying to reverse
        }

        // Predictive collision check (simplified)
        const head = this.segs[0];
        const predictStep = this.speed * 1.5; // Look ahead distance
        const nextX = head.x + desiredDir.x * predictStep;
        const nextY = head.y + desiredDir.y * predictStep;
        const skipCount = this.calculateSkipSegments(); // Use helper
        const wouldBite = this.willHitTail(nextX, nextY, skipCount); // Use helper

        if (wouldBite) {
            // console.log("Turn prevented: would bite tail"); // Debug log
            return false; // Collision predicted
        }

        // If all checks pass, apply the turn
        this.velocity.vx = desiredDir.x;
        this.velocity.vy = desiredDir.y;
        this.lastTurnTimestamp = currentTimestamp;
        return true;
    }

    // Made public to be accessible from Game.ts for rendering logic
    public calculateSkipSegments(): number {
        if (this.speed <= 0) return MAX_NECK_SKIP_SEGMENTS;
        // Calculate how many segments fit within the SAFE_PX distance based on current speed
        // This needs refinement - spacing isn't constant if speed changes segment pull
        // Let's use a simpler approach for now: base it on speed directly
        const baseSegmentSpacing = segRadius(PLAYER_INITIAL_LENGTH) * 2;
        const segmentsPerSecond = this.speed / baseSegmentSpacing;
        const safeTime = SAFE_PX / this.speed; // How long it takes to cover safe distance
        const links = Math.round(safeTime * segmentsPerSecond); // Estimate segments in that time

        // const links = Math.round(SAFE_PX / this.speed); // Original simpler calc
        return Math.min(links, MAX_NECK_SKIP_SEGMENTS, this.segs.length -1); // Clamp result
    }

    // Made public for self-collision check in Game.ts
    public willHitTail(checkX: number, checkY: number, skipCount: number): boolean {
        const checkPoint: Point = { x: checkX, y: checkY };
        const threshold = segRadius(this.length) + 1; // Collision radius check

        // Ensure skipCount is valid and doesn't go beyond array bounds
        // Always skip at least the first few segments (e.g., 6)
        const startCheckIndex = Math.max(6, Math.min(skipCount, this.segs.length - 1));

        if (startCheckIndex >= this.segs.length) {
            return false; // Cannot collide if check starts beyond tail
        }

        for (let i = startCheckIndex; i < this.segs.length; i++) {
            const segmentToCheck = this.segs[i];
            if (!segmentToCheck) continue; // Should not happen, but safety check

            // Use toroidal distance if needed, but simple dist is often sufficient for self-check
            const distance = dist(checkPoint, segmentToCheck);
            if (distance < threshold) {
                // console.error(`[willHitTail] Collision DETECTED! Head vs seg[${i}]`); // Debug
                return true; // Collision detected
            }
        }
        return false; // No collision found
    }


    /** Called when the player eats an orb */
    public eatOrb(orbValue: number): void {
        // console.log(`Player ate orb with value: ${orbValue}`); // Less verbose

        // Increase logical length
        const growth = orbValue * PLAYER_LENGTH_PER_ORB;
        this.length += growth; // logical length
        this.score += orbValue; // track points

        // Add pulse wave starting at the head, carrying the growth amount
        this.eatQueue.push({ distanceTraveled: 0, growthAmount: growth });

        // Set glow frames
        this.glowFrames = PLAYER_EAT_GLOW_FRAMES;

        // Apply speed boost
        this.speed = this.baseSpeed * PLAYER_EAT_SPEED_BOOST;
        this.speedBoostTimer = PLAYER_EAT_SPEED_BOOST_DURATION_MS / 1000;
        // console.log(`Speed boosted to ${this.speed.toFixed(1)} for ${this.speedBoostTimer.toFixed(2)}s`); // Less verbose
    }

    public update(deltaTime: number, worldWidth: number, worldHeight: number): void {
        if (!this.visible) return;

        // --- Update Base Speed based on Length ---
        const lengthContribution = PLAYER_MAX_ADDITIONAL_SPEED * (1 - Math.exp(-(this.length - PLAYER_INITIAL_LENGTH) * PLAYER_SPEED_LENGTH_FACTOR));
        const targetBaseSpeed = PLAYER_INITIAL_SPEED + Math.max(0, lengthContribution);
        this.baseSpeed = targetBaseSpeed; // Direct set for now

        // --- Update Effects ---
        // Speed Boost Timer & Tapering
        const maxBoostAmount = this.baseSpeed * (PLAYER_EAT_SPEED_BOOST - 1);
        const totalBoostDuration = PLAYER_EAT_SPEED_BOOST_DURATION_MS / 1000;

        if (this.speedBoostTimer > 0) {
            this.speedBoostTimer -= deltaTime;
            if (this.speedBoostTimer <= 0) {
                this.speed = this.baseSpeed;
                this.speedBoostTimer = 0;
            } else {
                const boostFraction = this.speedBoostTimer / totalBoostDuration;
                this.speed = this.baseSpeed + maxBoostAmount * boostFraction;
            }
        } else {
             this.speed = this.baseSpeed; // Ensure speed matches base if no boost
        }

        // Glow Frames Timer
        if (this.glowFrames > 0) {
            this.glowFrames--;
        }

        // --- Movement ---
        const moveDistance = this.speed * deltaTime;

        // Update Eat Queue and Trigger Growth at Tail
        const currentLengthPixels = this.calculateLengthPixels();
        const completedPulsesIndices: number[] = [];
        this.eatQueue.forEach((pulse, index) => {
            pulse.distanceTraveled += moveDistance;
            if (pulse.distanceTraveled >= currentLengthPixels) {
                // Trigger segment growth
                for (let g = 0; g < pulse.growthAmount; g++) {
                    if (this.segs.length > 0) {
                         const tailIndex = this.segs.length - 1;
                         const tail = this.segs[tailIndex];
                         this.segs.push({ x: tail.x, y: tail.y, isGrowing: true, growthProgress: 0 });
                    }
                }
                completedPulsesIndices.push(index);
            }
        });

        // Remove completed pulses
        for (let i = completedPulsesIndices.length - 1; i >= 0; i--) {
            this.eatQueue.splice(completedPulsesIndices[i], 1);
        }

        // --- Update Segment Growth Animations ---
        const growthIncrement = deltaTime / this.segmentGrowthDuration;
        this.segs.forEach(seg => {
            if (seg.isGrowing) {
                seg.growthProgress = (seg.growthProgress ?? 0) + growthIncrement;
                if (seg.growthProgress >= 1) {
                    seg.growthProgress = 1;
                    seg.isGrowing = false;
                }
            }
        });

        // --- Head Movement ---
        if (this.segs.length === 0) return; // Should not happen after constructor, but safety check
        const originalHead = this.segs[0];
        let newHead: Point = {
            x: originalHead.x + this.velocity.vx * moveDistance,
            y: originalHead.y + this.velocity.vy * moveDistance,
        };
        newHead = wrap(newHead, worldWidth, worldHeight); // Apply world wrapping

        // --- Segment Management (Constant Spacing) ---
        this.segs[0] = newHead; // Update head position

        const baseSegmentSpacing = segRadius(PLAYER_INITIAL_LENGTH) * 2; // Use initial spacing
        for (let i = 1; i < this.segs.length; i++) {
            const currGp = this.segs[i].growthProgress ?? 1;
            const prevGp = this.segs[i - 1]?.growthProgress ?? 1; // Should always exist
            const avgGp = (currGp + prevGp) * 0.5;
            const desiredSpacing = baseSegmentSpacing * avgGp; // Scale spacing by growth

            // Position segment i exactly desiredSpacing behind segment i-1 using torus logic
            const newSegPos = moveTowardsTorus(this.segs[i - 1], this.segs[i], desiredSpacing, worldWidth, worldHeight);
            // Update segment position (moveTowardsTorus handles wrapping)
            this.segs[i].x = newSegPos.x;
            this.segs[i].y = newSegPos.y;
            // Keep growthProgress and isGrowing flags
        }
    }

    /** Calculates the approximate pixel length of the serpent based on segment distances */
    private calculateLengthPixels(): number {
        let totalDistance = 0;
        if (this.segs.length < 2) {
            return 0;
        }
        // Use toroidal distance for calculating length across wraps
        for (let i = 0; i < this.segs.length - 1; i++) {
            // Need world dimensions here if we want accurate length across wraps
            // For pulse checking, simple distance might be okay if wraps are rare pulses
            totalDistance += dist(this.segs[i], this.segs[i+1]); // Using simple dist for now
        }
        return totalDistance;
    }
} // End of PlayerSerpent class

export default PlayerSerpent;
