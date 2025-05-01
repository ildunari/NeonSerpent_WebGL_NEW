import * as PIXI from 'pixi.js'; // Need PIXI for graphics override
import { Serpent } from './Serpent'; // Import the base class
import AIController from './AIController';
import {
    Point, // Added missing import
    SnakeState,
    PLAYER_INITIAL_LENGTH,
    PLAYER_INITIAL_SEGMENTS,
    segRadius,
    // Using player constants for AI effects for now - TODO: Create AI-specific constants
    PLAYER_EAT_SPEED_BOOST,
    PLAYER_EAT_SPEED_BOOST_DURATION_MS,
    PLAYER_EAT_GLOW_FRAMES,
    // PLAYER_LENGTH_PER_ORB // AI will use simpler growth for now
} from './types';
import {
  AI_BASE_SPEED, AI_VARIANCE_SPEED, AI_TURN_COOLDOWN_MS
} from './aiConstants';
import Orb from './Orb';
import { generateAiName } from './aiNames';
import { dist, lerpColor } from './utils'; // Import necessary utils

export default class AISerpent extends Serpent {
  private ai: AIController;

  constructor(x: number, y: number, hue: number) {
    const id = `ai-${Math.random().toString(36).slice(2)}`;
    const name = generateAiName();
    const initialSpeed = AI_BASE_SPEED + (Math.random() * AI_VARIANCE_SPEED - AI_VARIANCE_SPEED / 2);
    // Using player initial length/segments for now, could create AI-specific constants later
    const initialLength = PLAYER_INITIAL_LENGTH;
    const initialSegments = PLAYER_INITIAL_SEGMENTS;

    super(
        id,
        x,
        y,
        initialLength,
        initialSegments,
        initialSpeed,
        hue, // color
        name,
        false // isPlayer
    );

    // Initialize AI Controller after super() call
    // Cast 'this' to SnakeState for the AIController constructor
    this.ai = new AIController(this as unknown as SnakeState);
    console.log(`AISerpent constructor finished for ID: ${this.id}`);
  }

  // AI-specific update logic, called separately from the main update loop
  updateAI(now: number, // Removed unused delta parameter
            orbs: Orb[], snakes: SnakeState[], worldW: number, worldH: number): void {

    // --- AI Steering ---
    // AI decides where to go based on the environment
    const desired = this.ai.decide(orbs, snakes, worldW, worldH, now);
    // Use the inherited attemptTurn method
    this.attemptTurn(desired, now, AI_TURN_COOLDOWN_MS);

    // Note: The actual movement, growth, etc., is handled by the base Serpent.update(),
    // which is called separately in Game.ts.
  }

  // Override attemptTurn to prevent instant 180-degree turns
  override attemptTurn(desiredDir: Point, currentTimestamp: number, turnCooldown: number): boolean {
      // Basic cooldown check
      if (currentTimestamp - this.lastTurnTimestamp <= turnCooldown) {
          return false;
      }

      // Prevent 180 turns (copied from PlayerSerpent)
      const dotProduct = desiredDir.x * this.velocity.vx + desiredDir.y * this.velocity.vy;
      if (dotProduct < -0.9) {
          return false; // Prevent sharp reversals
      }

      // If checks pass, update velocity and timestamp
      this.setDirection(desiredDir.x, desiredDir.y); // Use inherited setDirection
      this.lastTurnTimestamp = currentTimestamp;
      return true;
  }


  // Override update to include AI-specific baseSpeed calculation
  override update(deltaTime: number, worldWidth: number, worldHeight: number): void {
      if (!this.visible) return;

      // --- AI-Specific Base Speed Calculation ---
      // Adjust base speed based on length *before* calling super.update()
      // so that the base update uses the correct base speed if resetting from boost.
      this.baseSpeed = AI_BASE_SPEED + Math.min(this.length, 200) * 0.15; // simple scale

      // --- Call Base Update Logic ---
      // Handles movement, segment following, growth animation, basic timer decrements
      super.update(deltaTime, worldWidth, worldHeight);

      // --- Additional AI-Specific Updates After Base ---
      // (None currently needed)
  }

  // Override eatOrb to add effects similar to player, then call base method
  override eatOrb(orbValue: number, growthAmount: number): void {
      // AI uses the growthAmount passed in (usually orb.value from Game.ts)
      // instead of PLAYER_LENGTH_PER_ORB calculation.

      // Call base eatOrb to handle core logic (score, length, queue)
      super.eatOrb(orbValue, growthAmount);

      // AI-specific effects (using player constants as placeholders)
      // TODO: Define AI-specific constants in aiConstants.ts
      this.glowFrames = PLAYER_EAT_GLOW_FRAMES;
      this.targetSpeed = this.baseSpeed * PLAYER_EAT_SPEED_BOOST; // Set target speed
      this.speedBoostTimer = PLAYER_EAT_SPEED_BOOST_DURATION_MS / 1000;
  }


  /**
   * syncPixi - AI-specific rendering override, based on PlayerSerpent's advanced effects.
   * Renders head with eyes, body with pulse/glow, but no mouth or safe-neck coloring.
   */
  override syncPixi(_playerSkipCount: number, worldWidth: number, worldHeight: number): void {
      // _playerSkipCount is unused for AI rendering logic, but kept for signature match
      if (!this.pixiObject) return;
      this.pixiObject.visible = this.visible;
      if (!this.visible || this.segs.length === 0) {
          this.pixiObject.clear();
          return;
      }

      const graphics = this.pixiObject;
      graphics.clear();

      // 1. Setup Constants (mostly copied from PlayerSerpent, removed safe-neck)
      const radius = segRadius(this.length);
      const headRadius = radius * 1.2;
      const baseHexColor = this.color;
      const baseAlpha = 1.0;
      const baseOutlineColor = 0xffffff;
      const basePlayerGlowColor = 0xFFFF00; // Yellow base glow (use same for AI for now)
      let basePlayerGlowStrength = 9; // Base strength, will be made dynamic
      const baseGlowAlpha = 0.25;
      // Removed safeNeckColor, safeNeckGlowStrength, safeNeckTransitionSegments
      const pulseColor = 0xffffff; // Body color during pulse
      const pulseGlowColor = 0xffffff; // Glow color during pulse
      const pulseGlowBoost = 4;
      const pulseWidthMultiplier = 0.5;
      const secondaryPulseWidthFactor = 2.0;
      const secondaryPulseGlowAlpha = 0.05;
      const secondaryPulseGlowBoost = 2;

      // --- Dynamic Glow Strength based on Speed ---
      const speedRatio = this.baseSpeed > 0 ? this.speed / this.baseSpeed : 1;
      const dynamicGlowFactor = Math.max(0.8, Math.min(1.5, 1 + (speedRatio - 1) * 0.3));
      const dynamicPlayerGlowStrength = basePlayerGlowStrength * dynamicGlowFactor;

      // 2. Calculate cumulative distances for pulse effects
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

      // 3. --- Draw Body Segments as Circles (excluding head) ---
      for (let i = this.segs.length - 1; i >= 1; i--) {
          const seg = this.segs[i];
          const scaleFactor = seg.growthProgress ?? 1.0;
          const segmentMidpointDistance = cumulativeDistances[i];

          // --- Calculate Swell Factors ---
          let primarySwellFactor = 0;
          let secondarySwellFactor = 0;
          const primaryPulseWaveWidth = segRadius(this.length) * 8;
          const secondaryPulseWaveWidth = primaryPulseWaveWidth * secondaryPulseWidthFactor;

          for (const pulse of this.eatQueue) {
              const distFromPulseCenter = Math.abs(segmentMidpointDistance - pulse.distanceTraveled);
              if (distFromPulseCenter < primaryPulseWaveWidth / 2) {
                  primarySwellFactor = Math.max(primarySwellFactor, Math.cos(distFromPulseCenter / (primaryPulseWaveWidth / 2) * (Math.PI / 2)));
              }
              if (distFromPulseCenter < secondaryPulseWaveWidth / 2) {
                  secondarySwellFactor = Math.max(secondarySwellFactor, Math.cos(distFromPulseCenter / (secondaryPulseWaveWidth / 2) * (Math.PI / 2)));
              }
          }
          const isPulsing = primarySwellFactor > 0.01;
          const isSecondaryPulsing = secondarySwellFactor > 0.01;

          // --- Determine Segment State (AI doesn't have safe neck) ---
          // const isStrictlySafe = false; // AI doesn't use this
          // const isInTransition = false; // AI doesn't use this
          const transitionFactor = 1; // Always fully normal color for AI

          // --- Base Style Calculation (Simplified for AI) ---
          const normalBodyColor = this.glowFrames > 0 ? 0xffffff : baseHexColor;
          const normalGlowColor = basePlayerGlowColor; // Use same base glow for now
          const normalGlowStrength = dynamicPlayerGlowStrength;

          let baseBodyC = lerpColor(normalBodyColor, normalBodyColor, transitionFactor); // Simplified lerp
          let baseGlowC = lerpColor(normalGlowColor, normalGlowColor, transitionFactor); // Simplified lerp
          let baseGlowS = normalGlowStrength; // AI uses normal strength

          // --- Apply Pulse Effects ---
          const actualBodyColor = isPulsing ? pulseColor : baseBodyC;
          const actualGlowColor = isPulsing ? pulseGlowColor : baseGlowC;
          const actualGlowStrength = isPulsing ? (baseGlowS + pulseGlowBoost) : baseGlowS;

          // --- Calculate Radii ---
          const radiusWithSwell = radius * (1 + primarySwellFactor * pulseWidthMultiplier);
          const currentRadius = radiusWithSwell * scaleFactor;
          const currentOutlineRadius = currentRadius + Math.max(0.5, 1 * scaleFactor);
          const currentGlowRadius = currentRadius + (actualGlowStrength / 2) * scaleFactor;
          const secondaryPulseRadiusBoost = (secondaryPulseGlowBoost / 2) * secondarySwellFactor * scaleFactor;
          const currentSecondaryGlowRadius = currentRadius + secondaryPulseRadiusBoost;
          const currentAlpha = baseAlpha * scaleFactor;

            // --- Draw Layers ---
            if (currentRadius > 0.1) {
                // 0. Secondary Pulse Glow
                if (isSecondaryPulsing && currentSecondaryGlowRadius > currentRadius) {
                    // graphics.lineStyle(0); // No longer needed
                    graphics.fill({ color: pulseGlowColor, alpha: secondaryPulseGlowAlpha * scaleFactor });
                    graphics.circle(seg.x, seg.y, currentSecondaryGlowRadius);
                }
                // 1. Outline
                graphics.setStrokeStyle({ width: Math.max(1, 2 * scaleFactor), color: baseOutlineColor, alpha: currentAlpha }); // Use setStrokeStyle
                graphics.moveTo(seg.x + currentOutlineRadius, seg.y);
                graphics.arc(seg.x, seg.y, currentOutlineRadius, 0, Math.PI * 2);
                graphics.stroke();
                // 2. Primary Glow
                // graphics.lineStyle(0); // No longer needed
                graphics.fill({ color: actualGlowColor, alpha: baseGlowAlpha * scaleFactor });
                graphics.circle(seg.x, seg.y, currentGlowRadius);
                // 3. Body
                graphics.fill({ color: actualBodyColor, alpha: currentAlpha });
              graphics.circle(seg.x, seg.y, currentRadius);
          }
      } // End of body segment circle loop

      // 4. --- Head & Eyes (Layered) --- (Copied from Player, removed mouth)
       if (this.segs.length > 0) {
          const headSeg = this.segs[0];
          const headGrowth = headSeg.growthProgress ?? 1.0;
          const currentHeadRadius = headRadius * headGrowth;

          if (currentHeadRadius > 0.1) {
              const headColor = this.glowFrames > 0 ? 0xffffff : baseHexColor;
              const headGlowStrength = dynamicPlayerGlowStrength + 2;
              const currentHeadGlowRadius = currentHeadRadius + (headGlowStrength / 2) * headGrowth;
              const currentHeadOutlineRadius = currentHeadRadius + 1 * headGrowth;
              const currentHeadAlpha = baseAlpha * headGrowth;

              // 1. Head Outline
              graphics.setStrokeStyle({ width: Math.max(1, 2 * headGrowth), color: baseOutlineColor, alpha: currentHeadAlpha }); // Use setStrokeStyle
              graphics.moveTo(headSeg.x + currentHeadOutlineRadius, headSeg.y); graphics.arc(headSeg.x, headSeg.y, currentHeadOutlineRadius, 0, Math.PI * 2); graphics.stroke();
              // 2. Head Glow
              // graphics.lineStyle(0); // No longer needed
              graphics.fill({ color: basePlayerGlowColor, alpha: baseGlowAlpha * headGrowth }); graphics.circle(headSeg.x, headSeg.y, currentHeadGlowRadius);
              // 3. Head Fill
              graphics.fill({ color: headColor, alpha: currentHeadAlpha }); graphics.circle(headSeg.x, headSeg.y, currentHeadRadius);
              // --- Draw Eyes ---
              const finalEyeRadius = Math.max(1, currentHeadRadius * 0.2);
              const eyeDist = currentHeadRadius * 0.5;
              const eyeAngle = Math.atan2(this.velocity.vy, this.velocity.vx);
              const eyeAnglePerp = eyeAngle + Math.PI / 2;
              const eye1X = headSeg.x + Math.cos(eyeAnglePerp) * eyeDist; const eye1Y = headSeg.y + Math.sin(eyeAnglePerp) * eyeDist;
              const eye2X = headSeg.x - Math.cos(eyeAnglePerp) * eyeDist; const eye2Y = headSeg.y - Math.sin(eyeAnglePerp) * eyeDist;
              const eyeGlowColor = 0xffffff;
              const eyeGlowAlpha = 0.15 * headGrowth;
              const eyeGlowRadius = finalEyeRadius + Math.max(0.5, 2 * headGrowth);
              const eyeFillColor = 0x000000;
              const eyeFillAlpha = 0.9 * headGrowth;
              // Eye Glow
              graphics.fill({ color: eyeGlowColor, alpha: eyeGlowAlpha }); graphics.circle(eye1X, eye1Y, eyeGlowRadius); graphics.circle(eye2X, eye2Y, eyeGlowRadius);
              // Eye Fill
              graphics.fill({ color: eyeFillColor, alpha: eyeFillAlpha }); graphics.circle(eye1X, eye1Y, finalEyeRadius); graphics.circle(eye2X, eye2Y, finalEyeRadius);

              // --- Mouth Removed for AI ---
              // if (this.isPlayer) { ... } // Removed block
          }
      }
  } // End syncPixi override

}
