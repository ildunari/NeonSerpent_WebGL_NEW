import AIController from './AIController';
import PlayerSerpent from './PlayerSerpent';   // default export // Fixed import
import { /* Point, */ SnakeState } from './types'; // Commented out unused Point import
import {
  AI_BASE_SPEED, AI_VARIANCE_SPEED, AI_TURN_COOLDOWN_MS
} from './aiConstants';
import Orb from './Orb'; // Added Orb import for type checking in updateAI
import { generateAiName } from './aiNames'; // Import name generator

export default class AISerpent extends PlayerSerpent {
  private ai: AIController;

  constructor(x: number, y: number, hue: number) {
    super(x, y);
    this.isPlayer = false;
    this.color = hue;
    this.baseSpeed = AI_BASE_SPEED + (Math.random()*AI_VARIANCE_SPEED - AI_VARIANCE_SPEED/2);
    this.speed = this.baseSpeed;
    this.id = `ai-${Math.random().toString(36).slice(2)}`;
    this.name = generateAiName(); // Assign generated name
    // Cast 'this' to SnakeState for the AIController constructor
    // This assumes AISerpent fulfills the SnakeState interface requirements
    this.ai = new AIController(this as unknown as SnakeState);
  }

  // Explicitly type parameters for clarity and type safety
  updateAI(delta: number, now: number,
            orbs: Orb[], snakes: SnakeState[], worldW: number, worldH: number): void {
    // 1. steering
    const desired = this.ai.decide(orbs, snakes, worldW, worldH, now); // Pass worldW and worldH
    this.attemptTurn(desired, now, AI_TURN_COOLDOWN_MS); // Use AI's reaction time? No, keep global constant for now.
    // 2. physics & rendering (reuse parent)
    super.update(delta, worldW, worldH);
    // Optional polish: bump AI speed with length
    this.baseSpeed = AI_BASE_SPEED +
                     Math.min(this.length,200)*0.15;   // simple scale
  }
}
