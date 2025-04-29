import { Point, SnakeState, segRadius } from './types'; // Added segRadius import
import Orb from './Orb';
import { dist, distTorus } from './utils'; // Added distTorus import
import { createNoise2D } from 'simplex-noise';
import {
  AI_VIEW_RADIUS, /* AI_TURN_COOLDOWN_MS, */ AI_NOISE, // Commented out unused import again
  AIState
} from './aiConstants';

const noise2D = createNoise2D();

export default class AIController {
  private owner: SnakeState;
  private state: AIState = 'GATHER';
  private readonly idBias: number;
  private readonly viewR: number;      // Per-bot view radius

  // Reusable Point objects to minimize allocations
  private _futurePos: Point = { x: 0, y: 0 };
  // private _targetPoint: Point = { x: 0, y: 0 }; // Unused, removed
  private _evadeTarget: Point = { x: 0, y: 0 }; // Specific for evasion calculation
  private _defaultTarget: Point = { x: 0, y: 0 }; // For default forward movement
  private _dirVector: Point = { x: 0, y: 0 };
  private _noiseVector: Point = { x: 0, y: 0 };
  private _combinedVector: Point = { x: 0, y: 0 };
  private _normalizedVector: Point = { x: 0, y: 0 };

  constructor(owner: SnakeState) {
    this.owner = owner;
    this.idBias = Math.random() * 9999;
    // each bot gets its own reflex delay & view range
    // this.reactionMs = AI_TURN_COOLDOWN_MS * (0.7 + Math.random() * 0.6); // Removed assignment
    this.viewR      = AI_VIEW_RADIUS      * (0.8 + Math.random() * 0.4);
  }

  /** Chooses a normalized steering vector once per frame */
  decide(orbs: Orb[], snakes: SnakeState[],
         worldW: number, worldH: number, // Added world dimensions
         now: number): Point {
    // 1. pick visible objects
    const myHead = this.owner.segs[0];
    const inViewOrbs  = orbs.filter(o => o.visible && dist(o, myHead) < this.viewR);
    const otherSnakes = snakes.filter(s => s !== this.owner && s.visible); // Filter out non-visible snakes too

    // 2-A.  Foresight collision check  (~300 ms look-ahead)
    const lookAhead = 0.3 * this.owner.speed; // px
    // Update reusable _futurePos
    this._futurePos.x = myHead.x + this.owner.velocity.vx * lookAhead;
    this._futurePos.y = myHead.y + this.owner.velocity.vy * lookAhead;
    const danger = snakes.some(s => s.segs
      .slice(6) // ignore necks
      .some(seg => distTorus(this._futurePos, seg, worldW, worldH) < // Use _futurePos
                    segRadius(this.owner.length) + 2));
    if (danger) this.state = 'EVADE';

    // 2-B.  Determine state priority: Hunt > Evade Imminent > Gather
    const tgtSnake = this.pickSnakeTarget(otherSnakes, myHead);
    const imminent = otherSnakes.find(s =>
        s.length > this.owner.length &&
        dist(s.segs[0], myHead) < 120 ); // Check distance to *head* of bigger snake

    // Update state based on priority, ensuring EVADE from danger check isn't overwritten unless a higher priority exists
    if (tgtSnake) {
        this.state = 'HUNT'; // HUNT overrides EVADE from danger check
    } else if (imminent) {
        this.state = 'EVADE'; // EVADE from imminent threat overrides EVADE from danger check
    } else if (this.state !== 'EVADE') { // Only change to GATHER if not already EVADING from danger
        if (inViewOrbs.length > 0) {
            this.state = 'GATHER';
        } else {
            // Default state if no targets or threats and not evading
            this.state = 'GATHER'; // Default to seeking orbs
        }
    }
    // If state is still EVADE from the danger check, it remains EVADE

    // 3. Determine target point based on state
    let target: Point | null = null;
    if (this.state === 'HUNT') {
         target = tgtSnake!.segs.at(-2)!; // Aim at tail–1 of target snake
    } else if (this.state === 'GATHER') {
         target = this.pickBestOrb(inViewOrbs); // pickBestOrb handles empty array
    } else if (this.state === 'EVADE') {
         // Steer away from the imminent threat's head or just continue forward?
         if (imminent) {
             // Simple evasion: steer directly away from the threat's head
             const threatHead = imminent.segs[0];
             // Update reusable _evadeTarget
             this._evadeTarget.x = myHead.x + (myHead.x - threatHead.x);
             this._evadeTarget.y = myHead.y + (myHead.y - threatHead.y);
             target = this._evadeTarget; // Assign reference
         } else {
            // If EVADE state was reached from danger check (no imminent threat)
            // Steer opposite current velocity
            // Update reusable _evadeTarget
            this._evadeTarget.x = myHead.x - this.owner.velocity.vx * 100;
            this._evadeTarget.y = myHead.y - this.owner.velocity.vy * 100;
            target = this._evadeTarget; // Assign reference
         }
    }

    // Ensure target is never null (pickBestOrb handles default case)
    if (!target) {
        // This case should ideally not be reached if pickBestOrb is correct
        console.warn(`AI ${this.owner.id} target became null unexpectedly in state ${this.state}. Defaulting.`);
        this._defaultTarget.x = myHead.x + this.owner.velocity.vx;
        this._defaultTarget.y = myHead.y + this.owner.velocity.vy;
        target = this._defaultTarget;
    }

    // 4. Calculate steering vector towards target (updates _dirVector)
    this.vecTo(myHead, target);
    // 5. Calculate noise wobble (updates _noiseVector)
    this.noise(now);

    // 6. Combine direction and wobble into _combinedVector
    this._combinedVector.x = this._dirVector.x + this._noiseVector.x;
    this._combinedVector.y = this._dirVector.y + this._noiseVector.y;

    // 7. Normalize the combined vector (updates and returns _normalizedVector)
    return this.normalize(this._combinedVector);
  }

  /* ---------- helpers ---------- */
  private pickSnakeTarget(snakes: SnakeState[], head: Point): SnakeState | null {
    let best: SnakeState | null = null, bestD = Infinity;
    snakes.forEach(s => {
      // Ensure target snake has enough segments to aim at segs.at(-2)
      if (s.segs.length < 3) return;
      const targetPoint = s.segs.at(-2)!; // Use the segment before the tail tip
      const d = dist(targetPoint, head);
      // Use this bot's specific viewR
      if (d < this.viewR && s.length < this.owner.length && d < bestD)
        { best = s; bestD = d; }
    });
    return best;
  }

  private pickBestOrb(orbs: Orb[]): Point { // Returns a reference to an Orb or _defaultTarget
    // Handle case where orbs array might be empty after filtering
    if (orbs.length === 0) {
        // Default behavior: update and return the reusable _defaultTarget
        this._defaultTarget.x = this.owner.segs[0].x + this.owner.velocity.vx;
        this._defaultTarget.y = this.owner.segs[0].y + this.owner.velocity.vy;
        return this._defaultTarget;
    }
    // Find the orb with the highest value (returns the Orb object itself)
    // The caller will use its x, y properties.
    return orbs.reduce((p, c) => (c.value > p.value ? c : p));
  }

  // Updates and returns the reusable _dirVector
  private vecTo(from: Point, to: Point): Point {
    this._dirVector.x = to.x - from.x;
    this._dirVector.y = to.y - from.y;
    return this._dirVector;
  }

  // Updates and returns the reusable _normalizedVector
  private normalize(v: Point): Point {
    const l = Math.hypot(v.x, v.y) || 1;
    this._normalizedVector.x = v.x / l;
    this._normalizedVector.y = v.y / l;
    return this._normalizedVector;
  }

  // Updates and returns the reusable _noiseVector
  private noise(t: number): Point {
    this._noiseVector.x = (noise2D(this.idBias, t * 0.0005)) * AI_NOISE;
    this._noiseVector.y = (noise2D(this.idBias + 1111, t * 0.0005)) * AI_NOISE;
    return this._noiseVector;
  }
}
