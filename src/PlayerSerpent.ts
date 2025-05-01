// src/PlayerSerpent.ts

// PIXI import removed as PIXI.Graphics is inherited via Serpent
import { Serpent } from './Serpent'; // Import the base class
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
    // might need adjustment in the base Serpent class (e.g., to protected) if PlayerSerpent needs direct access.
    // For now, assuming they are accessible or logic is adjusted.

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

    // initPixi and destroyPixi are inherited from Serpent.
    // We keep the player-specific syncPixi override.

    /**
     * syncPixi - Player-specific rendering with advanced effects (pulse, glow, safe neck, mouth).
     * This completely overrides the base Serpent.syncPixi rendering.
     */
    override syncPixi(playerSkipCount: number, worldWidth: number, worldHeight: number): void {
        if (!this.pixiObject) return;
        this.pixiObject.visible = this.visible;
        if (!this.visible || this.segs.length === 0) {
            this.pixiObject.clear();
            return;
        }

        const graphics = this.pixiObject;
        graphics.clear();

        // 1. Setup Constants
        const radius = segRadius(this.length);
        // const bodyWidth = radius * 2; // Unused variable removed
        const headRadius = radius * 1.2;
        const baseHexColor = this.color;
        const baseAlpha = 1.0;
        const baseOutlineColor = 0xffffff;
        const basePlayerGlowColor = 0xFFFF00; // Yellow base glow
        let basePlayerGlowStrength = 9; // Base strength, will be made dynamic
        const baseGlowAlpha = 0.25;
        const safeNeckColor = 0x0099aa; // Cyan-ish
        const safeNeckGlowStrength = 3;
        const safeNeckTransitionSegments = 3; // How many segments to transition color over
        const pulseColor = 0xffffff; // Body color during pulse
        const pulseGlowColor = 0xffffff; // Glow color during pulse (changed from base yellow)
        const pulseGlowBoost = 4;
        const pulseWidthMultiplier = 0.5;
        const secondaryPulseWidthFactor = 2.0; // How much wider the secondary pulse is
        const secondaryPulseGlowAlpha = 0.05; // Alpha for the secondary pulse glow
        const secondaryPulseGlowBoost = 2; // Extra radius for secondary pulse

        // --- Dynamic Glow Strength based on Speed ---
        const speedRatio = this.baseSpeed > 0 ? this.speed / this.baseSpeed : 1;
        // Apply a modest boost/reduction based on speed ratio, clamped
        const dynamicGlowFactor = Math.max(0.8, Math.min(1.5, 1 + (speedRatio - 1) * 0.3));
        const dynamicPlayerGlowStrength = basePlayerGlowStrength * dynamicGlowFactor;

        // 2. Global Line Style Defaults (Not needed for circle fills)

        // 3. --- Draw Body Segments as Circles (excluding head) ---
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
            cumulativeDistances.push(currentTotalDistance); // Store distance *to* segment i+1
        }

        // Draw segments from tail towards head (excluding head itself, index 0)
        // This layering ensures segments closer to the head draw on top
        for (let i = this.segs.length - 1; i >= 1; i--) {
            const seg = this.segs[i];
            const scaleFactor = seg.growthProgress ?? 1.0; // Use growthProgress for smooth scaling (0 to 1)
            const segmentMidpointDistance = cumulativeDistances[i]; // Use pre-calculated distance

            // --- Calculate Swell Factors ---
            let primarySwellFactor = 0;
            let secondarySwellFactor = 0;
            const primaryPulseWaveWidth = segRadius(this.length) * 8;
            const secondaryPulseWaveWidth = primaryPulseWaveWidth * secondaryPulseWidthFactor;

            for (const pulse of this.eatQueue) {
                const distFromPulseCenter = Math.abs(segmentMidpointDistance - pulse.distanceTraveled);
                // Primary Pulse
                if (distFromPulseCenter < primaryPulseWaveWidth / 2) {
                    primarySwellFactor = Math.max(primarySwellFactor, Math.cos(distFromPulseCenter / (primaryPulseWaveWidth / 2) * (Math.PI / 2)));
                }
                // Secondary Pulse
                if (distFromPulseCenter < secondaryPulseWaveWidth / 2) {
                    secondarySwellFactor = Math.max(secondarySwellFactor, Math.cos(distFromPulseCenter / (secondaryPulseWaveWidth / 2) * (Math.PI / 2)));
                }
            }
            const isPulsing = primarySwellFactor > 0.01;
            const isSecondaryPulsing = secondarySwellFactor > 0.01;

            // --- Determine Segment State (Safe, Transitioning, Normal) ---
            const isStrictlySafe = this.isPlayer && playerSkipCount > 0 && i < playerSkipCount;
            const isInTransition = this.isPlayer && playerSkipCount > 0 && i >= playerSkipCount && i < playerSkipCount + safeNeckTransitionSegments;
            let transitionFactor = 0; // 0 = fully safe, 1 = fully normal color
            if (isInTransition) {
                transitionFactor = (i - playerSkipCount + 1) / safeNeckTransitionSegments;
            } else if (!isStrictlySafe) {
                transitionFactor = 1; // Fully normal color
            }

            // --- Base Style Calculation (Considering Transition) ---
            const normalBodyColor = this.glowFrames > 0 ? 0xffffff : baseHexColor; // White if globally glowing, else base color
            const normalGlowColor = basePlayerGlowColor; // Base yellow glow
            const normalGlowStrength = dynamicPlayerGlowStrength; // Use speed-adjusted strength

            let baseBodyC = lerpColor(safeNeckColor, normalBodyColor, transitionFactor);
            let baseGlowC = lerpColor(safeNeckColor, normalGlowColor, transitionFactor); // Glow transitions too
            let baseGlowS = isStrictlySafe ? safeNeckGlowStrength : normalGlowStrength; // Use safe strength only if strictly safe

            // --- Apply Pulse Effects (Overrides base styles) ---
            const actualBodyColor = isPulsing ? pulseColor : baseBodyC; // Pulse overrides body color
            const actualGlowColor = isPulsing ? pulseGlowColor : baseGlowC; // Pulse overrides glow color
            const actualGlowStrength = isPulsing ? (baseGlowS + pulseGlowBoost) : baseGlowS; // Pulse boosts strength

            // --- Calculate Radii (Scaled by Growth and Swell) ---
            const radiusWithSwell = radius * (1 + primarySwellFactor * pulseWidthMultiplier);
            const currentRadius = radiusWithSwell * scaleFactor; // Apply growth scale factor

            // Ensure outline doesn't disappear completely for small segments
            const currentOutlineRadius = currentRadius + Math.max(0.5, 1 * scaleFactor);
            const currentGlowRadius = currentRadius + (actualGlowStrength / 2) * scaleFactor; // Scale glow addition by growth

            // Secondary pulse radius calculation
            const secondaryPulseRadiusBoost = (secondaryPulseGlowBoost / 2) * secondarySwellFactor * scaleFactor;
            const currentSecondaryGlowRadius = currentRadius + secondaryPulseRadiusBoost;

            const currentAlpha = baseAlpha * scaleFactor; // Scale alpha by growth

            // --- Draw Layers (if radius is significant) ---
            if (currentRadius > 0.1) {
                // 0. Secondary Pulse Glow (Very Subtle - Draw First)
                if (isSecondaryPulsing && currentSecondaryGlowRadius > currentRadius) {
                    // graphics.lineStyle(0); // No longer needed
                    graphics.fill({ color: pulseGlowColor, alpha: secondaryPulseGlowAlpha * scaleFactor }); // Use pulse color, very low alpha
                    graphics.circle(seg.x, seg.y, currentSecondaryGlowRadius);
                }

                // 1. Outline (Stroke)
                graphics.setStrokeStyle({ width: Math.max(1, 2 * scaleFactor), color: baseOutlineColor, alpha: currentAlpha }); // Use setStrokeStyle
                graphics.moveTo(seg.x + currentOutlineRadius, seg.y); // Need moveTo before arc for stroke
                graphics.arc(seg.x, seg.y, currentOutlineRadius, 0, Math.PI * 2);
                graphics.stroke(); // Apply the stroke

                // 2. Primary Glow (Fill)
                // graphics.lineStyle(0); // No longer needed
                graphics.fill({ color: actualGlowColor, alpha: baseGlowAlpha * scaleFactor }); // Use actual (pulsed?) glow color
                graphics.circle(seg.x, seg.y, currentGlowRadius);

                // 3. Body (Fill)
                graphics.fill({ color: actualBodyColor, alpha: currentAlpha }); // Use actual (pulsed?) body color
                graphics.circle(seg.x, seg.y, currentRadius);
            }
        } // End of body segment circle loop

        // 4. --- Head & Eyes (Layered) --- (Draw head last so it's on top)
         if (this.segs.length > 0) {
            const headSeg = this.segs[0];
            const headGrowth = headSeg.growthProgress ?? 1.0; // Use head's own growth
            const currentHeadRadius = headRadius * headGrowth; // Scale head radius by its growth

            if (currentHeadRadius > 0.1) {
                // Head color is affected by global glow, but not pulsing swell
                const headColor = this.glowFrames > 0 ? 0xffffff : baseHexColor;
                // Use dynamic glow strength for head too, maybe slightly boosted
                const headGlowStrength = dynamicPlayerGlowStrength + 2;
                const currentHeadGlowRadius = currentHeadRadius + (headGlowStrength / 2) * headGrowth; // Scale glow addition
                const currentHeadOutlineRadius = currentHeadRadius + 1 * headGrowth; // Scale outline addition
                const currentHeadAlpha = baseAlpha * headGrowth; // Scale alpha

                // 1. Head Outline
                graphics.setStrokeStyle({ width: Math.max(1, 2 * headGrowth), color: baseOutlineColor, alpha: currentHeadAlpha }); // Use setStrokeStyle
                graphics.moveTo(headSeg.x + currentHeadOutlineRadius, headSeg.y); graphics.arc(headSeg.x, headSeg.y, currentHeadOutlineRadius, 0, Math.PI * 2); graphics.stroke();
                // 2. Head Glow (Fill)
                // graphics.lineStyle(0); // No longer needed
                graphics.fill({ color: basePlayerGlowColor, alpha: baseGlowAlpha * headGrowth }); graphics.circle(headSeg.x, headSeg.y, currentHeadGlowRadius); // Use scaled glow alpha
                // 3. Head Fill
                graphics.fill({ color: headColor, alpha: currentHeadAlpha }); graphics.circle(headSeg.x, headSeg.y, currentHeadRadius); // Use scaled head alpha
                // --- Draw Eyes (Scaled by headGrowth) ---
                const finalEyeRadius = Math.max(1, currentHeadRadius * 0.2); // Base size on current head radius, min 1px
                const eyeDist = currentHeadRadius * 0.5; // Eye distance scales with head radius
                const eyeAngle = Math.atan2(this.velocity.vy, this.velocity.vx);
                const eyeAnglePerp = eyeAngle + Math.PI / 2;
                const eye1X = headSeg.x + Math.cos(eyeAnglePerp) * eyeDist; const eye1Y = headSeg.y + Math.sin(eyeAnglePerp) * eyeDist;
                const eye2X = headSeg.x - Math.cos(eyeAnglePerp) * eyeDist; const eye2Y = headSeg.y - Math.sin(eyeAnglePerp) * eyeDist;
                const eyeGlowColor = 0xffffff;
                const eyeGlowAlpha = 0.15 * headGrowth; // Scale eye glow alpha
                const eyeGlowRadius = finalEyeRadius + Math.max(0.5, 2 * headGrowth); // Scale eye glow addition
                const eyeFillColor = 0x000000;
                const eyeFillAlpha = 0.9 * headGrowth; // Scale eye fill alpha
                // Eye Glow (Fill)
                graphics.fill({ color: eyeGlowColor, alpha: eyeGlowAlpha }); graphics.circle(eye1X, eye1Y, eyeGlowRadius); graphics.circle(eye2X, eye2Y, eyeGlowRadius);
                // Eye Fill
                // Eye Fill
                graphics.fill({ color: eyeFillColor, alpha: eyeFillAlpha }); graphics.circle(eye1X, eye1Y, finalEyeRadius); graphics.circle(eye2X, eye2Y, finalEyeRadius);

                // --- Draw Mouth (Player Only) ---
                if (this.isPlayer) { // Check if this instance is the player
                    const mouthRadius = currentHeadRadius * 0.6; // Position mouth relative to head center
                    const mouthAngleOffset = Math.PI * 0.8; // How wide the mouth arc is (less than PI)
                    const mouthStartX = headSeg.x + Math.cos(eyeAngle - mouthAngleOffset / 2) * mouthRadius;
                    const mouthStartY = headSeg.y + Math.sin(eyeAngle - mouthAngleOffset / 2) * mouthRadius;
                    const mouthEndX = headSeg.x + Math.cos(eyeAngle + mouthAngleOffset / 2) * mouthRadius;
                    const mouthEndY = headSeg.y + Math.sin(eyeAngle + mouthAngleOffset / 2) * mouthRadius;
                    const mouthControlX = headSeg.x + Math.cos(eyeAngle) * mouthRadius * 0.8; // Control point slightly forward
                    const mouthControlY = headSeg.y + Math.sin(eyeAngle) * mouthRadius * 0.8;

                    graphics.setStrokeStyle({ width: Math.max(1, 2 * headGrowth), color: eyeFillColor, alpha: eyeFillAlpha * 0.8 }); // Use setStrokeStyle
                    graphics.moveTo(mouthStartX, mouthStartY);
                    // Use quadraticCurveTo for a simple arc shape
                    graphics.quadraticCurveTo(mouthControlX, mouthControlY, mouthEndX, mouthEndY);
                    graphics.stroke(); // Apply the stroke for the mouth line
                }
                // Removed duplicated mouth variable definitions from here

            }
        }
    } // End syncPixi

    // destroyPixi is inherited from Serpent

    // --- Player-Specific Logic Methods ---

    // setDirection is inherited from Serpent

    // Player-specific turn logic
    override attemptTurn(desiredDir: Point, currentTimestamp: number, turnCooldown: number): boolean {
        // Basic cooldown check (could call super.attemptTurn for this part if it only did cooldown)
        if (currentTimestamp - this.lastTurnTimestamp <= turnCooldown) return false;

        // Player-specific checks: No 180 turns, check for self-collision
        const dotProduct = desiredDir.x * this.velocity.vx + desiredDir.y * this.velocity.vy;
        if (dotProduct < -0.9) return false;
        const head = this.segs[0];
        const predictStep = this.speed * 1.5;
        const nextX = head.x + desiredDir.x * predictStep;
        const nextY = head.y + desiredDir.y * predictStep;
        const skipCount = this.calculateSkipSegments();
        const wouldBite = this.willHitTail(nextX, nextY, skipCount);
        if (wouldBite) return false;
        this.velocity.vx = desiredDir.x;
        this.velocity.vy = desiredDir.y;
        this.lastTurnTimestamp = currentTimestamp;
        // If checks pass, update velocity and timestamp
        this.setDirection(desiredDir.x, desiredDir.y); // Use inherited setDirection
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
