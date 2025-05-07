// src/PlayerSerpent.ts
import * as PIXI from 'pixi.js'; // Import PixiJS for Graphics
import { Serpent } from './Serpent';
import {
    Point,
    // Segment, // Type hint not needed locally anymore
    // Velocity, // Type hint not needed locally anymore
    // SnakeState, // Implemented by Serpent
    PLAYER_INITIAL_SPEED,
    PLAYER_INITIAL_LENGTH,
    PLAYER_INITIAL_SEGMENTS,
    PLAYER_COLOR,
    PLAYER_MAX_ADDITIONAL_SPEED,
    PLAYER_SPEED_LENGTH_FACTOR,
    SAFE_PX,
    MAX_NECK_SKIP_SEGMENTS,
    segRadius,
    PLAYER_EAT_SPEED_BOOST,
    PLAYER_EAT_SPEED_BOOST_DURATION_MS,
    PLAYER_EAT_GLOW_FRAMES,
    PLAYER_LENGTH_PER_ORB
} from './types';
// Import necessary utils
import { dist, lerpColor } from './utils'; // Removed unused wrap, moveTowardsTorus

// Local helper functions are removed as they are now imported from utils.ts or inherited


export class PlayerSerpent extends Serpent {
    // Inherited properties are handled by the base class 'Serpent'
    // Note: Access modifiers for inherited properties like lastTurnTimestamp and segmentGrowthDuration
    // might need adjustment in the base Serpent class if PlayerSerpent needs direct access.
    // For now, assuming they are accessible or logic is adjusted.

    // Graphics for player-specific visuals
    private mouthGraphics!: PIXI.Graphics;
    private eyeGraphics!: PIXI.Graphics;

    constructor(startX: number, startY: number) {
        // Call the Serpent constructor with player-specific defaults
        super(
            'player', // id
            startX,
            startY,
            PLAYER_INITIAL_LENGTH,
            PLAYER_INITIAL_SEGMENTS,
            PLAYER_INITIAL_SPEED,
            PLAYER_COLOR,
            "Player", // name
            true // isPlayer
        );
        console.log(`PlayerSerpent constructor finished for ID: ${this.id}`);
    }

    // Override initPixi to add separate eye and mouth graphics for the player
    override initPixi(stage: PIXI.Container): void {
        super.initPixi(stage);
        // Create separate graphics for mouth and eyes and add to stage (game container)
        this.mouthGraphics = new PIXI.Graphics();
        this.eyeGraphics = new PIXI.Graphics();
        stage.addChild(this.mouthGraphics);
        stage.addChild(this.eyeGraphics);
    }

    // Override destroyPixi to clean up mouth and eye graphics
    override destroyPixi(): void {
        super.destroyPixi();
        if (this.mouthGraphics) {
            this.mouthGraphics.parent?.removeChild(this.mouthGraphics);
            this.mouthGraphics.destroy();
        }
        if (this.eyeGraphics) {
            this.eyeGraphics.parent?.removeChild(this.eyeGraphics);
            this.eyeGraphics.destroy();
        }
    }

    /**
     * syncPixi - Player-specific rendering with advanced effects (glow, pulse, safe neck, mouth).
     * This completely overrides the base Serpent.syncPixi rendering.
     */
    override syncPixi(playerSkipCount: number, worldWidth: number, worldHeight: number): void {
        if (!this.pixiObject) return;
        this.pixiObject.visible = this.visible;
        if (!this.visible || this.segs.length === 0) {
            this.pixiObject.clear();
            // Also hide mouth and eyes when not visible
            this.mouthGraphics.visible = false;
            this.eyeGraphics.visible = false;
            return;
        }
        this.mouthGraphics.visible = true;
        this.eyeGraphics.visible = true;

        const graphics = this.pixiObject as PIXI.Graphics;
        graphics.clear();

        // 1. Setup Constants
        const radius = segRadius(this.length);
        const headRadius = radius * 1.2;
        const baseHexColor = this.color;
        const baseAlpha = 1.0;
        const baseOutlineColor = 0xffffff;
        const basePlayerGlowColor = 0xFFFF00; // Yellow base glow
        let basePlayerGlowStrength = 9; // Base strength, will be made dynamic
        const baseGlowAlpha = 0.25;
        const safeNeckColor = 0x0099aa; // Cyan-ish for safe neck segments
        const safeNeckGlowStrength = 3;
        const safeNeckTransitionSegments = 3;
        const pulseColor = 0xffffff;
        const pulseGlowColor = 0xffffff;
        const pulseGlowBoost = 4;
        const pulseWidthMultiplier = 0.5;
        const secondaryPulseWidthFactor = 2.0;
        const secondaryPulseGlowAlpha = 0.05;
        const secondaryPulseGlowBoost = 2;

        // Dynamic Glow Strength based on Speed
        const speedRatio = this.baseSpeed > 0 ? this.speed / this.baseSpeed : 1;
        const dynamicGlowFactor = Math.max(0.8, Math.min(1.5, 1 + (speedRatio - 1) * 0.3));
        const dynamicPlayerGlowStrength = basePlayerGlowStrength * dynamicGlowFactor;

        // 2. Draw Body Segments as Circles (excluding head)
        // Calculate cumulative distances for pulse and transition effects
        let cumulativeDistances: number[] = [0];
        let currentTotalDistance = 0;
        for (let i = 0; i < this.segs.length - 1; i++) {
            const segA = this.segs[i];
            const segB = this.segs[i + 1];
            const wrapDist = Math.abs(segA.x - segB.x) > worldWidth / 2 || Math.abs(segA.y - segB.y) > worldHeight / 2;
            if (!wrapDist) {
                currentTotalDistance += dist(segA, segB);
            }
            cumulativeDistances.push(currentTotalDistance);
        }

        // Draw from tail to head (excluding head index 0) so closer segments overlay farther ones
        for (let i = this.segs.length - 1; i >= 1; i--) {
            const seg = this.segs[i];
            const scaleFactor = seg.growthProgress ?? 1.0;
            const segmentMidpointDistance = cumulativeDistances[i];

            // Calculate pulse swell factors
            let primarySwellFactor = 0;
            let secondarySwellFactor = 0;
            const primaryPulseWaveWidth = segRadius(this.length) * 8;
            const secondaryPulseWaveWidth = primaryPulseWaveWidth * secondaryPulseWidthFactor;
            for (const pulse of this.eatQueue) {
                const distFromPulseCenter = Math.abs(segmentMidpointDistance - pulse.distanceTraveled);
                if (distFromPulseCenter < primaryPulseWaveWidth / 2) {
                    primarySwellFactor = Math.max(primarySwellFactor,
                        Math.cos(distFromPulseCenter / (primaryPulseWaveWidth / 2) * (Math.PI / 2)));
                }
                if (distFromPulseCenter < secondaryPulseWaveWidth / 2) {
                    secondarySwellFactor = Math.max(secondarySwellFactor,
                        Math.cos(distFromPulseCenter / (secondaryPulseWaveWidth / 2) * (Math.PI / 2)));
                }
            }
            const isPulsing = primarySwellFactor > 0.01;
            const isSecondaryPulsing = secondarySwellFactor > 0.01;

            // Determine segment state (safe neck, transitioning, normal)
            const isStrictlySafe = this.isPlayer && playerSkipCount > 0 && i < playerSkipCount;
            const isInTransition = this.isPlayer && playerSkipCount > 0 && i >= playerSkipCount && i < playerSkipCount + safeNeckTransitionSegments;
            let transitionFactor = 0;
            if (isInTransition) {
                transitionFactor = (i - playerSkipCount + 1) / safeNeckTransitionSegments;
            } else if (!isStrictlySafe) {
                transitionFactor = 1;
            }

            // Base colors considering transition
            const normalBodyColor = this.glowFrames > 0 ? 0xffffff : baseHexColor;
            const normalGlowColor = basePlayerGlowColor;
            const normalGlowStrength = dynamicPlayerGlowStrength;
            let baseBodyC = lerpColor(safeNeckColor, normalBodyColor, transitionFactor);
            let baseGlowC = lerpColor(safeNeckColor, normalGlowColor, transitionFactor);
            let baseGlowS = isStrictlySafe ? safeNeckGlowStrength : normalGlowStrength;

            // Apply pulse overrides
            const actualBodyColor = isPulsing ? pulseColor : baseBodyC;
            const actualGlowColor = isPulsing ? pulseGlowColor : baseGlowC;
            const actualGlowStrength = isPulsing ? (baseGlowS + pulseGlowBoost) : baseGlowS;

            // Calculate radii
            const radiusWithSwell = radius * (1 + primarySwellFactor * pulseWidthMultiplier);
            const currentRadius = radiusWithSwell * scaleFactor;
            const currentOutlineRadius = currentRadius + Math.max(0.5, 1 * scaleFactor);
            const currentGlowRadius = currentRadius + (actualGlowStrength / 2) * scaleFactor;
            const secondaryPulseRadiusBoost = (secondaryPulseGlowBoost / 2) * secondarySwellFactor * scaleFactor;
            const currentSecondaryGlowRadius = currentRadius + secondaryPulseRadiusBoost;
            const currentAlpha = baseAlpha * scaleFactor;

            // Draw this segment if visible
            if (currentRadius > 0.1) {
                // Secondary pulse glow (very subtle, drawn first)
                if (isSecondaryPulsing && currentSecondaryGlowRadius > currentRadius) {
                    graphics.fill({ color: pulseGlowColor, alpha: secondaryPulseGlowAlpha * scaleFactor });
                    graphics.circle(seg.x, seg.y, currentSecondaryGlowRadius);
                }
                // Outline
                graphics.setStrokeStyle({ width: Math.max(1, 2 * scaleFactor), color: baseOutlineColor, alpha: currentAlpha });
                graphics.moveTo(seg.x + currentOutlineRadius, seg.y);
                graphics.arc(seg.x, seg.y, currentOutlineRadius, 0, Math.PI * 2);
                graphics.stroke();
                // Primary glow
                graphics.fill({ color: actualGlowColor, alpha: baseGlowAlpha * scaleFactor });
                graphics.circle(seg.x, seg.y, currentGlowRadius);
                // Body fill
                graphics.fill({ color: actualBodyColor, alpha: currentAlpha });
                graphics.circle(seg.x, seg.y, currentRadius);
            }
        }

        // 4. Head & Eyes (head drawn last on base graphics)
        if (this.segs.length > 0) {
            const headSeg = this.segs[0];
            const headGrowth = headSeg.growthProgress ?? 1.0;
            const currentHeadRadius = headRadius * headGrowth;

            if (currentHeadRadius > 0.1) {
                // Head outline
                const headColor = this.glowFrames > 0 ? 0xffffff : baseHexColor;
                const headGlowStrength = dynamicPlayerGlowStrength + 2;
                const currentHeadGlowRadius = currentHeadRadius + (headGlowStrength / 2) * headGrowth;
                const currentHeadOutlineRadius = currentHeadRadius + 1 * headGrowth;
                const currentHeadAlpha = baseAlpha * headGrowth;

                graphics.setStrokeStyle({ width: Math.max(1, 2 * headGrowth), color: baseOutlineColor, alpha: currentHeadAlpha });
                graphics.moveTo(headSeg.x + currentHeadOutlineRadius, headSeg.y);
                graphics.arc(headSeg.x, headSeg.y, currentHeadOutlineRadius, 0, Math.PI * 2);
                graphics.stroke();
                // Head glow
                graphics.fill({ color: basePlayerGlowColor, alpha: baseGlowAlpha * headGrowth });
                graphics.circle(headSeg.x, headSeg.y, currentHeadGlowRadius);
                // Head fill
                graphics.fill({ color: headColor, alpha: currentHeadAlpha });
                graphics.circle(headSeg.x, headSeg.y, currentHeadRadius);

                // Define eye properties (for positioning and drawing)
                const eyeAngle = Math.atan2(this.velocity.vy, this.velocity.vx);
                const eyeFillColor = 0x000000;
                const eyeFillAlpha = 0.9 * headGrowth;
                const finalEyeRadius = Math.max(1, currentHeadRadius * 0.2);
                const eyeDist = currentHeadRadius * 0.5;
                const eyeAnglePerp = eyeAngle + Math.PI / 2;
                const eye1X = headSeg.x + Math.cos(eyeAnglePerp) * eyeDist;
                const eye1Y = headSeg.y + Math.sin(eyeAnglePerp) * eyeDist;
                const eye2X = headSeg.x - Math.cos(eyeAnglePerp) * eyeDist;
                const eye2Y = headSeg.y - Math.sin(eyeAnglePerp) * eyeDist;
                const eyeGlowColor = 0xffffff;
                const eyeGlowAlpha = 0.15 * headGrowth;
                const eyeGlowRadius = finalEyeRadius + Math.max(0.5, 2 * headGrowth);

                // Draw eyes on separate eyeGraphics
                this.eyeGraphics.clear();
                // Eye glow
                this.eyeGraphics.fill({ color: eyeGlowColor, alpha: eyeGlowAlpha });
                this.eyeGraphics.circle(eye1X, eye1Y, eyeGlowRadius);
                this.eyeGraphics.circle(eye2X, eye2Y, eyeGlowRadius);
                // Eye fill
                this.eyeGraphics.fill({ color: eyeFillColor, alpha: eyeFillAlpha });
                this.eyeGraphics.circle(eye1X, eye1Y, finalEyeRadius);
                this.eyeGraphics.circle(eye2X, eye2Y, finalEyeRadius);

                // Draw mouth on separate mouthGraphics
                const mouthAngle = eyeAngle;
                const mouthSpread = Math.PI / 6; // spread angle for mouth corners
                const leftAngle = mouthAngle + mouthSpread;
                const rightAngle = mouthAngle - mouthSpread;
                const leftX = headSeg.x + Math.cos(leftAngle) * currentHeadRadius;
                const leftY = headSeg.y + Math.sin(leftAngle) * currentHeadRadius;
                const rightX = headSeg.x + Math.cos(rightAngle) * currentHeadRadius;
                const rightY = headSeg.y + Math.sin(rightAngle) * currentHeadRadius;
                const frontX = headSeg.x + Math.cos(mouthAngle) * currentHeadRadius;
                const frontY = headSeg.y + Math.sin(mouthAngle) * currentHeadRadius;
                this.mouthGraphics.clear();
                this.mouthGraphics.beginFill(0x000000, 1.0);
                this.mouthGraphics.drawPolygon([frontX, frontY, leftX, leftY, rightX, rightY]);
                this.mouthGraphics.endFill();
            }
        }
    }

    // Player-specific turn logic (override base attemptTurn for additional checks)
    override attemptTurn(desiredDir: Point, currentTimestamp: number, turnCooldown: number): boolean {
        // Basic cooldown check
        if (currentTimestamp - this.lastTurnTimestamp <= turnCooldown) return false;

        // Prevent 180-degree turns and self-collision
        const dotProduct = desiredDir.x * this.velocity.vx + desiredDir.y * this.velocity.vy;
        if (dotProduct < -0.9) return false;
        const head = this.segs[0];
        const predictStep = this.speed * 1.5;
        const nextX = head.x + desiredDir.x * predictStep;
        const nextY = head.y + desiredDir.y * predictStep;
        const skipCount = this.calculateSkipSegments();
        const wouldBite = this.willHitTail(nextX, nextY, skipCount);
        if (wouldBite) return false;

        // If checks pass, update velocity and timestamp
        this.velocity.vx = desiredDir.x;
        this.velocity.vy = desiredDir.y;
        this.lastTurnTimestamp = currentTimestamp;
        this.setDirection(desiredDir.x, desiredDir.y);
        this.lastTurnTimestamp = currentTimestamp;
        return true;
    }

    // Player-specific method (no override)
    calculateSkipSegments(): number {
        if (this.speed <= 0) return MAX_NECK_SKIP_SEGMENTS;
        const baseSegmentSpacing = segRadius(PLAYER_INITIAL_LENGTH) * 2;
        const segmentsPerSecond = this.speed / baseSegmentSpacing;
        const safeTime = SAFE_PX / this.speed;
        const links = Math.round(safeTime * segmentsPerSecond);
        return Math.min(links, MAX_NECK_SKIP_SEGMENTS, this.segs.length -1);
    }

    public willHitTail(checkX: number, checkY: number, skipCount: number): boolean {
        const checkPoint: Point = { x: checkX, y: checkY };
        const threshold = segRadius(this.length) + 1;
        const startCheckIndex = Math.max(6, Math.min(skipCount, this.segs.length - 1));
        if (startCheckIndex >= this.segs.length) return false;
        for (let i = startCheckIndex; i < this.segs.length; i++) {
            const segmentToCheck = this.segs[i];
            if (!segmentToCheck) continue;
            if (dist(checkPoint, segmentToCheck) < threshold) return true;
        }
        return false;
    }

    // Override eatOrb to calculate player-specific growth and add effects, then call base method
    override eatOrb(orbValue: number): void {
        // Player-specific growth calculation
        const growthAmount = orbValue * PLAYER_LENGTH_PER_ORB;

        // Call base eatOrb to handle core logic (score, length, queue)
        super.eatOrb(orbValue, growthAmount);

        // Player-specific effects: Set target speed for boost
        this.glowFrames = PLAYER_EAT_GLOW_FRAMES;
        this.targetSpeed = this.baseSpeed * PLAYER_EAT_SPEED_BOOST; // Set target speed
        this.speedBoostTimer = PLAYER_EAT_SPEED_BOOST_DURATION_MS / 1000;
    }

    // Override update to add player-specific logic after base logic
    override update(deltaTime: number, worldWidth: number, worldHeight: number): void {
        if (!this.visible) return;

        // --- Player-Specific Updates First ---
        // Update Base Speed based on length
        const lengthContribution = PLAYER_MAX_ADDITIONAL_SPEED * (1 - Math.exp(-(this.length - PLAYER_INITIAL_LENGTH) * PLAYER_SPEED_LENGTH_FACTOR));
        this.baseSpeed = PLAYER_INITIAL_SPEED + Math.max(0, lengthContribution);

        // Update Target Speed if not boosting (base class handles boost ending)
        // If the boost timer is NOT active, ensure targetSpeed matches the calculated baseSpeed.
        if (this.speedBoostTimer <= 0) {
             this.targetSpeed = this.baseSpeed;
        }
        // Speed interpolation and glow frame decrement are handled in base update

        // --- Call Base Update Logic ---
        // This handles movement, segment following, growth animation, basic timer decrements
        super.update(deltaTime, worldWidth, worldHeight);

        // --- Additional Player-Specific Updates After Base ---
        // (None currently needed after restructuring)
    }

    // calculateLengthPixels is inherited from Serpent
}

export default PlayerSerpent;
