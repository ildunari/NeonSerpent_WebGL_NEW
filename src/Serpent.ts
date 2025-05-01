// src/Serpent.ts
import * as PIXI from 'pixi.js';
import {
    Point,
    Segment,
    Velocity,
    SnakeState,
    segRadius,
    PLAYER_INITIAL_LENGTH // Using player initial length for base segment spacing, can be adjusted
} from './types'; // Restored missing imports
import { dist, wrap, moveTowardsTorus, lerp } from './utils'; // Ensure lerp is imported

export class Serpent implements SnakeState {
    id: string | number;
    segs: Segment[];
    velocity: Velocity;
    speed: number;       // Current actual speed
    targetSpeed: number; // Speed the snake is interpolating towards
    baseSpeed: number;   // Base speed without boosts
    length: number;
    color: number;
    visible: boolean;
    name: string;
    score: number;
    isPlayer: boolean; // Default to false, subclasses override
    pixiObject: PIXI.Graphics | null = null;
    lastTurnTimestamp: number = 0;
    eatQueue: { distanceTraveled: number, growthAmount: number }[] = [];
    glowFrames: number = 0; // Basic glow tracking
    speedBoostTimer: number = 0; // Basic speed boost tracking
    protected readonly segmentGrowthDuration = 0.5; // Made protected if subclasses need it

    constructor(id: string | number, startX: number, startY: number, initialLength: number, initialSegments: number, initialSpeed: number, color: number, name: string, isPlayer: boolean = false) {
        this.id = id;
        this.isPlayer = isPlayer;
        this.visible = true;
        this.color = color;
        this.baseSpeed = initialSpeed;
        this.speed = this.baseSpeed; // Start at base speed
        this.targetSpeed = this.baseSpeed; // Target speed also starts at base
        this.length = initialLength;
        this.velocity = { vx: 1, vy: 0 }; // Default direction
        this.segs = [];
        this.name = name;
        this.score = 0;

        // Initialize segments
        const spacing = segRadius(this.length) * 2;
        for (let i = 0; i < initialSegments; i++) {
            this.segs.push({ x: startX - i * spacing, y: startY });
        }
        console.log(`Serpent (${this.id}) created at (${startX}, ${startY}).`);
    }

    initPixi(stage: PIXI.Container): void {
        if (this.pixiObject) this.destroyPixi();
        this.pixiObject = new PIXI.Graphics();
        this.pixiObject.visible = this.visible;
        stage.addChild(this.pixiObject);
        console.log(`Serpent (${this.id}) Pixi Graphics object initialized.`);
    }

    destroyPixi(): void {
        if (this.pixiObject) {
            this.pixiObject.parent?.removeChild(this.pixiObject);
            this.pixiObject.destroy({ children: true });
            this.pixiObject = null;
            console.log(`Serpent (${this.id}) Pixi Graphics object destroyed.`);
        }
    }

    /**
     * Basic syncPixi - Renders segments and head as simple circles.
     * Subclasses should override this to add specific effects.
     * Base implementation doesn't use skipCount or world dimensions, but signature matches override.
     * Prefixing unused parameters with '_' to satisfy TypeScript compiler/linter.
     */
    syncPixi(_playerSkipCount: number, _worldWidth: number, _worldHeight: number): void {
        if (!this.pixiObject) return;
        this.pixiObject.visible = this.visible;
        if (!this.visible || this.segs.length === 0) {
            this.pixiObject.clear();
            return;
        }

        const graphics = this.pixiObject;
        graphics.clear();

        const radius = segRadius(this.length);
        const headRadius = radius * 1.2;
        const baseHexColor = this.color;
        const baseAlpha = 1.0;
        const baseOutlineColor = 0xffffff; // Simple white outline

        // Draw body segments (simple circles) - tail first for layering
        for (let i = this.segs.length - 1; i >= 1; i--) {
            const seg = this.segs[i];
            const scaleFactor = seg.growthProgress ?? 1.0;
            const currentRadius = radius * scaleFactor;
            const currentOutlineRadius = currentRadius + Math.max(0.5, 1 * scaleFactor);
            const currentAlpha = baseAlpha * scaleFactor;

            if (currentRadius > 0.1) {
                // Outline - Use setStrokeStyle (assuming Pixi v8+)
                graphics.setStrokeStyle({ width: Math.max(1, 2 * scaleFactor), color: baseOutlineColor, alpha: currentAlpha });
                graphics.moveTo(seg.x + currentOutlineRadius, seg.y);
                graphics.arc(seg.x, seg.y, currentOutlineRadius, 0, Math.PI * 2);
                graphics.stroke();

                // Body Fill
                graphics.fill({ color: baseHexColor, alpha: currentAlpha });
                graphics.circle(seg.x, seg.y, currentRadius);
            }
        }

        // Draw head (simple circle)
        if (this.segs.length > 0) {
            const headSeg = this.segs[0];
            const headGrowth = headSeg.growthProgress ?? 1.0;
            const currentHeadRadius = headRadius * headGrowth;
            const currentHeadOutlineRadius = currentHeadRadius + 1 * headGrowth;
            const currentHeadAlpha = baseAlpha * headGrowth;

            if (currentHeadRadius > 0.1) {
                // Outline - Use setStrokeStyle (assuming Pixi v8+)
                graphics.setStrokeStyle({ width: Math.max(1, 2 * headGrowth), color: baseOutlineColor, alpha: currentHeadAlpha });
                graphics.moveTo(headSeg.x + currentHeadOutlineRadius, headSeg.y);
                graphics.arc(headSeg.x, headSeg.y, currentHeadOutlineRadius, 0, Math.PI * 2);
                graphics.stroke();

                // Head Fill
                graphics.fill({ color: baseHexColor, alpha: currentHeadAlpha });
                graphics.circle(headSeg.x, headSeg.y, currentHeadRadius);

                // Basic Eyes (optional for base class, could be added in override)
                // const finalEyeRadius = Math.max(1, currentHeadRadius * 0.2);
                // const eyeDist = currentHeadRadius * 0.5;
                // const eyeAngle = Math.atan2(this.velocity.vy, this.velocity.vx);
                // const eyeAnglePerp = eyeAngle + Math.PI / 2;
                // const eye1X = headSeg.x + Math.cos(eyeAnglePerp) * eyeDist; const eye1Y = headSeg.y + Math.sin(eyeAnglePerp) * eyeDist;
                // const eye2X = headSeg.x - Math.cos(eyeAnglePerp) * eyeDist; const eye2Y = headSeg.y - Math.sin(eyeAnglePerp) * eyeDist;
                // const eyeFillColor = 0x000000;
                // const eyeFillAlpha = 0.9 * headGrowth;
                // graphics.fill({ color: eyeFillColor, alpha: eyeFillAlpha }); graphics.circle(eye1X, eye1Y, finalEyeRadius); graphics.circle(eye2X, eye2Y, finalEyeRadius);
            }
        }
    }

    /**
     * Core update logic - Handles movement, segment following, basic growth.
     * Subclasses should call super.update() and add specific logic.
     */
    update(deltaTime: number, worldWidth: number, worldHeight: number): void {
        if (!this.visible) return;

        // --- Speed Interpolation ---
        // Interpolate current speed towards target speed
        // Adjust the interpolation factor (e.g., 0.1) for faster/slower transitions
        const speedLerpFactor = 0.1;
        this.speed = lerp(this.speed, this.targetSpeed, speedLerpFactor);
        // Optional: Snap to target speed if very close to avoid tiny fluctuations
        if (Math.abs(this.speed - this.targetSpeed) < 0.1) {
            this.speed = this.targetSpeed;
        }

        // --- Core Movement ---
        // Use the (potentially interpolated) speed for movement calculation
        const moveDistance = this.speed * deltaTime;

        // --- Eat Queue & Growth Processing (Basic) ---
        // Note: Player/AI might have different growth amounts/effects, handled in overrides
        const currentLengthPixels = this.calculateLengthPixels();
        const completedPulsesIndices: number[] = [];
        this.eatQueue.forEach((pulse, index) => {
            pulse.distanceTraveled += moveDistance;
            // Basic growth: Add segments when pulse reaches end
            if (pulse.distanceTraveled >= currentLengthPixels) {
                for (let g = 0; g < pulse.growthAmount; g++) {
                    if (this.segs.length > 0) {
                        const tail = this.segs[this.segs.length - 1];
                        // Add segment with growth state
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

        // --- Segment Growth Animation ---
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

        // --- Head Movement & Wrapping ---
        if (this.segs.length === 0) return;
        const originalHead = this.segs[0];
        let newHead: Point = {
            x: originalHead.x + this.velocity.vx * moveDistance,
            y: originalHead.y + this.velocity.vy * moveDistance
        };
        newHead = wrap(newHead, worldWidth, worldHeight);
        this.segs[0] = newHead; // Update head position

        // --- Segment Following Logic ---
        // Using PLAYER_INITIAL_LENGTH for base spacing, adjust if needed
        const baseSegmentSpacing = segRadius(PLAYER_INITIAL_LENGTH) * 2;
        for (let i = 1; i < this.segs.length; i++) {
            const currGp = this.segs[i].growthProgress ?? 1;
            const prevGp = this.segs[i - 1]?.growthProgress ?? 1; // Use previous segment's growth
            const avgGp = (currGp + prevGp) * 0.5; // Average growth affects spacing
            const desiredSpacing = baseSegmentSpacing * avgGp; // Scale spacing by growth

            // Move current segment towards the previous one, maintaining desired spacing
            const newSegPos = moveTowardsTorus(this.segs[i - 1], this.segs[i], desiredSpacing, worldWidth, worldHeight);
            this.segs[i].x = newSegPos.x;
            this.segs[i].y = newSegPos.y;
        }

        // --- Basic Effect Timers (Subclasses might modify speed/glow differently) ---
        if (this.speedBoostTimer > 0) {
            this.speedBoostTimer -= deltaTime;
            if (this.speedBoostTimer <= 0) {
                // When boost ends, set target speed back to base speed
                this.targetSpeed = this.baseSpeed;
                this.speedBoostTimer = 0;
            }
            // Note: Subclasses now set targetSpeed, not speed directly
        }
        if (this.glowFrames > 0) {
            this.glowFrames--;
        }
    }

    setDirection(dx: number, dy: number): void {
        const magnitude = Math.hypot(dx, dy);
        if (magnitude > 0.01) { // Avoid division by zero or near-zero
            this.velocity.vx = dx / magnitude;
            this.velocity.vy = dy / magnitude;
        }
    }

    calculateLengthPixels(): number {
        let totalDistance = 0;
        if (this.segs.length < 2) return 0;
        for (let i = 0; i < this.segs.length - 1; i++) {
            // Basic distance calculation, assuming no wrapping between segments for length calculation
            // More complex logic might be needed if segments can wrap significantly
             const segA = this.segs[i];
             const segB = this.segs[i+1];
             // Simple distance, ignoring wrap for length calculation simplicity
             totalDistance += dist(segA, segB);
        }
        return totalDistance;
    }

    // Basic eatOrb - Handles core logic: adding score, length, and queuing growth.
    // Subclasses override to calculate specific growthAmount, set targetSpeed/glowFrames, then call super.eatOrb().
    eatOrb(orbValue: number, growthAmount: number): void {
        // Basic logic using the provided growthAmount
        this.length += growthAmount;
        this.score += orbValue; // Score still based on original orb value
        this.eatQueue.push({ distanceTraveled: 0, growthAmount: growthAmount }); // Use calculated growthAmount
        // console.log(`Serpent (${this.id}) ate orb, score: ${this.score}, length: ${this.length}`); // Logging can be done in subclass override
    }

    // Basic turn logic placeholder - Player/AI implement specific checks
    attemptTurn(desiredDir: Point, currentTimestamp: number, turnCooldown: number): boolean {
        // Basic cooldown check
        if (currentTimestamp - this.lastTurnTimestamp <= turnCooldown) {
            return false;
        }
        // Basic direction change (no collision checks here)
        this.setDirection(desiredDir.x, desiredDir.y);
        this.lastTurnTimestamp = currentTimestamp;
        return true;
    }
}

export default Serpent;
