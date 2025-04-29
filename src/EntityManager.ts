import AISerpent from './AISerpent';
import PlayerSerpent from './PlayerSerpent';
import Orb from './Orb';
import { AI_COUNT } from './aiConstants';
import * as PIXI from 'pixi.js';
import { SnakeState } from './types'; // Import SnakeState for type safety

export default class EntityManager {
  player!: PlayerSerpent;
  readonly ai: AISerpent[] = [];
  readonly orbs: Orb[] = [];
  private stage: PIXI.Container;

  constructor(stage: PIXI.Container) { this.stage = stage; }

  spawnPlayer(): void {
    this.player = new PlayerSerpent(0,0);
    this.player.initPixi(this.stage);
  }
  spawnAI(worldW:number, worldH:number): void {
    for(let i=0;i<AI_COUNT;i++){
      const x = (Math.random()-0.5)*worldW;
      const y = (Math.random()-0.5)*worldH;
      // Generate distinct hues, avoiding pure red (0xFF0000) if possible
      // Cycle through hues, ensuring some separation
      const hueStep = 0xFFFFFF / (AI_COUNT + 1); // Divide color space
      const hue = (i + 1) * hueStep; // Start offset from 0
      const s = new AISerpent(x,y, hue);
      s.initPixi(this.stage);
      this.ai.push(s);
    }
  }

  // Method to spawn a single AI serpent
  spawnSingleAI(worldW: number, worldH: number): void {
    // Check if we are already at or above the limit
    if (this.ai.length >= AI_COUNT) {
        console.log("AI count limit reached, not spawning new AI.");
        return;
    }

    const x = (Math.random() - 0.5) * worldW;
    const y = (Math.random() - 0.5) * worldH;
    // Simple random hue for respawned AI for now
    const hue = Math.random() * 0xFFFFFF;
    const s = new AISerpent(x, y, hue);
    s.initPixi(this.stage);
    this.ai.push(s);
    console.log(`Spawned single AI: ${s.id} at (${x.toFixed(0)}, ${y.toFixed(0)}). Total AI: ${this.ai.length}`);
  }

  /* expose flat list for collision queries */
  // Ensure the returned array elements conform to SnakeState
  getAllSnakes(): SnakeState[] {
    // Explicitly cast PlayerSerpent and AISerpent[] to SnakeState[]
    // This assumes both classes correctly implement the SnakeState interface
    return [this.player as unknown as SnakeState, ...this.ai as unknown as SnakeState[]];
  }

  // Method to remove a specific AI serpent
  removeAISerpent(serpentToRemove: AISerpent): void {
    const index = this.ai.indexOf(serpentToRemove);
    if (index > -1) {
      this.ai.splice(index, 1);
    }
  }

  // Method to remove a specific Orb
  removeOrb(orbToRemove: Orb): void {
    const index = this.orbs.indexOf(orbToRemove);
    if (index > -1) {
        this.orbs.splice(index, 1);
    }
  }
}
