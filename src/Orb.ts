import * as PIXI from 'pixi.js'; // Import PixiJS
import { OrbTier, ORB_TIER_CONFIG, ORB_TEXTURE } from './types'; // Import Orb tier types and texture map

// Represents a collectible orb
export class Orb {
    public x: number;
    public y: number;
    public radius: number; // Represents the collision radius (circle inside sprite)
    public tier: OrbTier; // Store the tier
    public value: number; // Value derived from tier
    public visible: boolean = true; // Added visibility state

    // --- PixiJS Integration ---
    public pixiSprite: PIXI.Sprite | null = null; // Changed from pixiObject (Graphics) to pixiSprite

    constructor(x: number, y: number, radius: number, tier: OrbTier) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.tier = tier;
        this.value = ORB_TIER_CONFIG[tier].value; // Get value from config
        // Removed console log for brevity during generation
    }

    // --- PixiJS Methods ---

    /** Initializes the PixiJS Sprite object for the orb */
    initPixi(stage: PIXI.Container): void {
        if (this.pixiSprite) {
            this.destroyPixi(); // Clean up existing sprite if any
        }
        // Get texture from the preloaded assets based on tier
        const texturePath = ORB_TEXTURE[this.tier];
        const texture = PIXI.Assets.get(texturePath); // Use PIXI.Assets.get

        if (!texture) {
            console.error(`Orb texture not found: ${texturePath}`);
            return; // Cannot create sprite without texture
        }

        // Set scale mode for crisp pixels (optional polish)
        texture.source.scaleMode = 'nearest'; // Updated to use Texture.source and string value

        this.pixiSprite = new PIXI.Sprite(texture);
        this.pixiSprite.anchor.set(0.5); // Center the anchor

        // Set initial size based on the provided radius and tier's radiusMultiplier
        const tierRadiusMultiplier = ORB_TIER_CONFIG[this.tier].radiusMultiplier;
        this.pixiSprite.width = this.radius * 2 * tierRadiusMultiplier;
        this.pixiSprite.height = this.radius * 2 * tierRadiusMultiplier;

        // Set initial position and visibility
        this.pixiSprite.position.set(this.x, this.y);
        this.pixiSprite.visible = this.visible;

        // Add to the stage
        stage.addChild(this.pixiSprite);
    }

    /** Updates the PixiJS Sprite object to match the orb's current state */
    syncPixi(): void {
        if (!this.pixiSprite) return;

        // Update visibility first
        this.pixiSprite.visible = this.visible;

        if (this.visible) { // Corrected syntax: added parentheses
            // Update position if visible
            this.pixiSprite.position.set(this.x, this.y);
            // Update size if needed (e.g., if player segment size changes dynamically)
            // For now, size is set at init based on initial player segment size.
            // If we want dynamic orb size matching player size, we'd need to pass
            // the current player segment radius here and update width/height.
            // this.pixiSprite.width = currentSegmentRadius * 2;
            // this.pixiSprite.height = currentSegmentRadius * 2;
        }
    }

    /** Removes the PixiJS Sprite object from the stage and destroys it */
    destroyPixi(): void {
        if (this.pixiSprite) {
            this.pixiSprite.parent?.removeChild(this.pixiSprite);
            this.pixiSprite.destroy(); // Destroy the sprite
            this.pixiSprite = null;
        }
    }

    // Orbs are likely static, so no update method needed for now
    // update(deltaTime: number): void {
    //     void deltaTime;
    // }
}

export default Orb;
