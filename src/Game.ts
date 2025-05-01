import * as PIXI from 'pixi.js';
import InputHandler from './InputHandler';
import { UIManager, UIAction } from './UI';
// import PlayerSerpent from './PlayerSerpent'; // Removed unused import based on lint feedback
// import AISerpent from './AISerpent'; // Removed unused import based on lint feedback
import Orb from './Orb';
import EntityManager from './EntityManager';
import { resolveCollisions } from './CollisionSystem';
import { dist } from './utils';
import SpatialHashGrid from './SpatialHashGrid'; // Import the grid
import {
    // Import types from types.ts
    KEYBOARD_TURN_COOLDOWN_MS,
    JOYSTICK_TURN_COOLDOWN_MS,
    segRadius,
    OrbTier,
    ORB_TIER_CONFIG,
    ORB_TOTAL_SPAWN_WEIGHT,
    PLAYER_INITIAL_LENGTH, // Import initial length for orb sizing
    ORB_BASE_RADIUS,       // Import new orb sizing constants
    ORB_RADIUS_MULTIPLIER,
    SnakeState, // Added missing import
    // Import effect constants for absorption feedback
    PLAYER_EAT_GLOW_FRAMES,
    PLAYER_EAT_SPEED_BOOST,
    PLAYER_EAT_SPEED_BOOST_DURATION_MS
 } from './types';
 import {
     // Import constants from constants.ts
     ORB_DENSITY,
     // ORB_RADIUS as CONST_ORB_RADIUS, // No longer needed, calculated dynamically
     WORLD_PADDING
 } from './constants';
 // Removed unused import: import { AI_COUNT } from './aiConstants';

 // --- Constants for Orb Generation (Placeholders - some moved/replaced) ---
 // ORB_COUNT is now dynamic
 // ORB_RADIUS is now calculated based on initial player segment size
 const CLUSTER_PROBABILITY = 0.3; // Increased chance for clusters
 const MIN_CLUSTER_SIZE = 4;
 const MAX_CLUSTER_SIZE = 7;
 const CLUSTER_RADIUS = 50; // Radius for random clusters
 // CLUSTER_LINE_SPACING is now calculated dynamically based on orbR

 // Define Game States
export enum GameState {
    LOADING, // Initial state before assets are ready
    MENU,    // Main menu is visible
    PLAYING, // Game is active
    PAUSED,  // Pause menu is visible
    CONTROLS,// Controls menu is visible (can overlay Pause or Main)
    GAME_OVER // Game over screen is visible
}

class Game {
    // private renderer: Renderer; // Removed
    private pixiApp: PIXI.Application; // Added
    private pixiStage: PIXI.Container; // Added: Reference to the main stage
    private gameContainer: PIXI.Container; // Added: Container for game world objects (player, orbs, AI)

    private inputHandler: InputHandler;
    private uiManager: UIManager;
    private backgroundVideoElement: HTMLVideoElement; // Store the video element
    private gameState: GameState = GameState.LOADING;
    private previousState: GameState = GameState.LOADING;
    // private playerSerpent: PlayerSerpent | null = null; // Replaced by entities.player
    // private orbs: Orb[] = []; // Replaced by entities.orbs
    private entities!: EntityManager; // Added EntityManager
    private cameraX: number = 0; // Camera position X (relative to world origin)
    private cameraY: number = 0; // Camera position Y (relative to world origin)
    private parallaxFactor: number = 0.1;

// Game specific state
/* no stand-alone score field needed */
private scoreText: PIXI.Text | null = null; // Added for score display
private devInfoText: PIXI.Text | null = null; // Added for dev mode display
    private devModeActive: boolean = false; // Flag for dev mode
private borderGraphics: PIXI.Graphics | null = null; // Added for world border
private worldWidth: number = 1000; // Default, will be updated
private worldHeight: number = 1000; // Default, will be updated
private lastMiniBoardUpdate: number = 0;
private spatialGrid: SpatialHashGrid | null = null; // Added spatial grid member
private readonly CELL_SIZE = 100; // Define cell size for the grid
private aiRespawnTimeouts: number[] = []; // Added to track AI respawn timeouts
// Reusable objects for optimization
private _reusableKeyboardDir: { x: number, y: number } = { x: 0, y: 0 };
private _reusableQueryBounds: { x: number, y: number, radius: number } = { x: 0, y: 0, radius: 0 };

    constructor(pixiApp: PIXI.Application, inputHandler: InputHandler, backgroundVideo: HTMLVideoElement) {
        console.log('Game constructor called');
        this.pixiApp = pixiApp; // Store Pixi Application
        this.pixiStage = pixiApp.stage; // Store Pixi Stage
        this.inputHandler = inputHandler;
        this.backgroundVideoElement = backgroundVideo;
        this.uiManager = new UIManager(this.handleUIAction.bind(this));

        // Create the main container for game objects
        this.gameContainer = new PIXI.Container();
        this.pixiStage.addChild(this.gameContainer);

        // Initial world size calculation
        this.updateWorldSize();
    }

    // Calculate dynamic world size based on video dimensions, zoom factor, and padding
    private updateWorldSize(): void {
        // Base size on video's intrinsic dimensions, fallback if not loaded
        const baseW = this.backgroundVideoElement.videoWidth || 3840;
        const baseH = this.backgroundVideoElement.videoHeight || 2160;

        // Use zoom factor 1.5 ONLY when playing, otherwise use 1.0 for calculations
        const zoom = this.gameState === GameState.PLAYING ? 1.5 : 1.0;

        // Effective size of the video content area after zoom
        const effectiveW = baseW * zoom;
        const effectiveH = baseH * zoom;

        // World size is the effective video area minus padding on each side
        this.worldWidth = effectiveW - WORLD_PADDING * 2;
        this.worldHeight = effectiveH - WORLD_PADDING * 2;

        // Ensure world size is not negative if padding is too large for video size/zoom
        this.worldWidth = Math.max(100, this.worldWidth); // Set a minimum world size
        this.worldHeight = Math.max(100, this.worldHeight);

        console.log(`Updated world size: ${this.worldWidth.toFixed(0)}x${this.worldHeight.toFixed(0)} (Video: ${baseW}x${baseH}, Zoom: ${zoom}, Padding: ${WORLD_PADDING})`);

        // Update border graphics if they exist
        if (this.borderGraphics) {
            this.borderGraphics.clear();
            this.borderGraphics.rect(-this.worldWidth / 2, -this.worldHeight / 2, this.worldWidth, this.worldHeight);
            this.borderGraphics.stroke({ width: 5, color: 0xFFFFFF, alpha: 0.3 });
        }
    }


    init(): void {
        console.log('Game init called');
        this.uiManager.init();

        // Initialize Dev Info Text (always add to stage, visibility controlled later)
        this.devInfoText = new PIXI.Text({
            text: '', // Start empty
            style: {
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: 14,
                fill: 0x00ff00, // Neon green
                align: 'left',
                wordWrap: true, // Enable word wrap
                wordWrapWidth: this.pixiApp.screen.width - 20, // Wrap near screen edge
                lineHeight: 18,
                stroke: { color: 0x000000, width: 2, join: 'round' }, // Black stroke for readability
            }
        });
        this.devInfoText.position.set(10, 30); // Position below FPS counter
        this.devInfoText.visible = false; // Start hidden
        this.pixiStage.addChild(this.devInfoText);

        this.changeState(GameState.MENU);
        console.log('Game initialized, showing main menu.');
    }

    // Central handler for actions triggered by UI buttons
    private handleUIAction(action: UIAction): void {
        console.log(`UI Action received: ${action}`);
        switch (action) {
            case 'startGame':
                this.startGame();
                break;
            case 'showControls':
                this.showControls();
                break;
            case 'hideControls':
                this.hideControls();
                break;
            case 'resumeGame':
                this.resumeGame();
                break;
            case 'newGameFromPause':
            case 'newGameFromGameOver':
                this.returnToMenu();
                break;
            // case 'showScoreboard': // Placeholder for original scoreboard button if needed
            //     console.log('Show scoreboard action');
            //     break;
            case 'toggleDevMode':
                this.toggleDevMode();
                break;
            case 'togglePause': // Added case for the new button
                this.togglePause();
                break;
        }
    }

    // Method to change game state and update UI accordingly
    private changeState(newState: GameState): void {
        if (this.gameState === newState) return;

        if (newState !== GameState.CONTROLS) {
            this.previousState = this.gameState;
        }

        console.log(`Changing state from ${GameState[this.gameState]} to ${GameState[newState]}`);
        this.gameState = newState;

        // Update UI and video zoom
        switch (this.gameState) {
            case GameState.MENU:
                this.uiManager.hideAllMenus();
                this.uiManager.showMainMenu();
                this.setVideoZoom(false);
                this.gameContainer.visible = false; // Hide game objects in menu
                break;
            case GameState.PLAYING:
                this.uiManager.hideAllMenus();
                this.setVideoZoom(true);
                this.gameContainer.visible = true; // Show game objects
                if (this.scoreText) this.scoreText.visible = true; // Show score text
                break;
            case GameState.PAUSED:
                this.uiManager.hideAllMenus();
                this.uiManager.showPauseMenu(); // Will be updated to pass scores
                this.setVideoZoom(false);
                this.gameContainer.visible = true; // Keep game objects visible but static
                break;
            case GameState.CONTROLS:
                // Visibility handled by showControls/hideControls
                this.setVideoZoom(false);
                // Keep gameContainer visibility as it was (usually true if paused, false if menu)
                this.gameContainer.visible = (this.previousState === GameState.PAUSED);
break;
case GameState.GAME_OVER:
this.uiManager.hideAllMenus();
// Use player's score for game over screen
this.uiManager.showGameOverMenu(this.entities?.player?.score ?? 0); // Use optional chaining and nullish coalescing
this.setVideoZoom(false);
this.gameContainer.visible = true; // Show final state
                if (this.scoreText) this.scoreText.visible = false; // Hide score text
                break;
        }
        // Hide score text in non-playing states by default
        if (this.gameState !== GameState.PLAYING && this.scoreText) {
             this.scoreText.visible = false;
        }
    }

 // Helper method to control video zoom (targets the wrapper) and lock transition
 private setVideoZoom(zoomIn: boolean): void {
     const scale = zoomIn ? 1.5 : 1;
     const wrap = document.getElementById('backgroundWrap');
     if (wrap) {
         // Ensure transition is enabled before changing transform
         wrap.style.transition = 'transform .5s ease';
         wrap.style.transform = `scale(${scale})`;
         console.log(`Setting #backgroundWrap zoom to scale(${scale}) with transition`);

         // Function to lock the transition after it ends
         const lockTransition = () => {
             wrap.style.transition = 'none'; // Disable transition after animation
             wrap.removeEventListener('transitionend', lockTransition); // Clean up listener
             console.log("Background zoom transition locked.");
         };

         // Remove any existing listener before adding a new one
         wrap.removeEventListener('transitionend', lockTransition);
         // Add listener to lock transition after it completes
         wrap.addEventListener('transitionend', lockTransition);

     } else {
         console.error("Could not find #backgroundWrap element to apply zoom.");
     }
 }

    // --- Game State Control Methods ---

startGame(): void {
    if (this.gameState === GameState.MENU || this.gameState === GameState.GAME_OVER) {
        this.cleanupGameEntities(); // Clean up previous game objects, including grid

// Create entities using EntityManager
            this.entities = new EntityManager(this.gameContainer);
            this.entities.spawnPlayer();
            // Generate orbs and add them to the manager
            const generatedOrbs = this.generateOrbs(); // Generate first
            this.entities.orbs.push(...generatedOrbs); // Then add to manager
            this.entities.orbs.forEach(o => o.initPixi(this.gameContainer)); // Init Pixi for orbs

            // Change state to PLAYING *before* calculating world size, spawning AI, and creating grid
            this.changeState(GameState.PLAYING);

            // Initialize World Border Graphics (now uses PLAYING state zoom)
            // Initialize World Border Graphics (now uses PLAYING state zoom)
            this.updateWorldSize(); // Ensure world size is calculated *after* state change
            // Instantiate the Spatial Hash Grid *after* world size is determined for PLAYING state
            this.spatialGrid = new SpatialHashGrid(this.worldWidth, this.worldHeight, this.CELL_SIZE);

            if (!this.borderGraphics) {
                this.borderGraphics = new PIXI.Graphics();
                // Draw initial border (updateWorldSize will redraw if needed)
                this.borderGraphics.rect(-this.worldWidth / 2, -this.worldHeight / 2, this.worldWidth, this.worldHeight);
                this.borderGraphics.stroke({ width: 5, color: 0xFFFFFF, alpha: 0.3 });
                this.gameContainer.addChild(this.borderGraphics);
            } else {
                 // Ensure border is redrawn with correct size if restarting game
                 this.borderGraphics.clear();
                 this.borderGraphics.rect(-this.worldWidth / 2, -this.worldHeight / 2, this.worldWidth, this.worldHeight);
                 this.borderGraphics.stroke({ width: 5, color: 0xFFFFFF, alpha: 0.3 });
            }


            // Reset camera
            this.cameraX = 0;
            this.cameraY = 0;
            this.updateGameContainerPosition(); // Apply initial camera position

// Initialize Score Text
if (!this.scoreText) {
this.scoreText = new PIXI.Text({
text: `Score: ${this.entities.player.score}`,
style: {
fontFamily: '"Courier New", Courier, monospace',
                        fontSize: 24,
                        fill: 0xffffff, // White
                        align: 'right',
                        stroke: { color: 0x000000, width: 4, join: 'round' }, // Black stroke
                        dropShadow: { color: '#000000', blur: 4, angle: Math.PI / 6, distance: 3 },
                    }
                });
                this.scoreText.anchor.set(1, 0); // Anchor top-right
                this.scoreText.position.set(this.pixiApp.screen.width - 10, 10); // Position top-right
this.pixiStage.addChild(this.scoreText); // Add to main stage
} else {
this.scoreText.text = `Score: ${this.entities.player.score}`; // Reset text
this.scoreText.visible = true; // Ensure visible
}

            // Spawn AI *after* world size is updated based on PLAYING state zoom
            this.updateWorldSize(); // Ensure world size is calculated *after* state change
            this.entities.spawnAI(this.worldWidth, this.worldHeight); // Spawn AI

            // Log after all spawns
            console.log(`Starting new game... Player spawned, ${this.entities.orbs.length} orbs generated, ${this.entities.ai.length} AI spawned.`);
            // this.changeState(GameState.PLAYING); // Moved earlier
        }
    }

    pauseGame(): void {
        if (this.gameState === GameState.PLAYING) {
            // Gather scores before changing state
            if (this.entities) {
                const currentScores = this.entities.getAllSnakes()
                    .filter(s => s.visible) // Only include visible snakes
                    .map(s => ({ name: s.name, score: s.score, isPlayer: s.isPlayer }));
                this.uiManager.updatePauseLeaderboard(currentScores);
            } else {
                this.uiManager.updatePauseLeaderboard([]); // Show empty if no entities
            }
            this.changeState(GameState.PAUSED);
            this.uiManager.updatePauseButton(true); // Update button to show "Resume" icon
        }
    }

    resumeGame(): void {
        if (this.gameState === GameState.PAUSED || this.gameState === GameState.CONTROLS) {
            this.uiManager.hideControlsMenu(); // Ensure controls are hidden if resuming from there
            this.changeState(GameState.PLAYING);
            this.uiManager.updatePauseButton(false); // Update button to show "Pause" icon
        }
    }

    showControls(): void {
        if (this.gameState === GameState.MENU || this.gameState === GameState.PAUSED) {
            this.previousState = this.gameState;
            this.uiManager.hideAllMenus();
            this.uiManager.showControlsMenu();
            this.changeState(GameState.CONTROLS);
        }
    }

    hideControls(): void {
         if (this.gameState === GameState.CONTROLS) {
            this.uiManager.hideControlsMenu();
            // Restore the previous menu/state
            if (this.previousState === GameState.MENU) {
                this.changeState(GameState.MENU); // changeState handles showing the correct menu
            } else if (this.previousState === GameState.PAUSED) {
                this.changeState(GameState.PAUSED); // changeState handles showing the correct menu
            } else {
                this.changeState(GameState.MENU); // Fallback
            }
         }
    }

    // Method to toggle pause state via the button
    private togglePause(): void {
        if (this.gameState === GameState.PLAYING) {
            this.pauseGame();
        } else if (this.gameState === GameState.PAUSED) {
            this.resumeGame();
        }
        // No action if in menu, game over, etc.
    }

     gameOver(): void {
        if (this.gameState === GameState.PLAYING) {
            console.log("Game Over!");
            this.changeState(GameState.GAME_OVER);
            // Entities remain visible but game loop stops updating them
        }
    }

     returnToMenu(): void {
        this.cleanupGameEntities(); // Clean up before returning to menu
        this.changeState(GameState.MENU);
    }

    // Helper to remove all game entities and their Pixi objects, and clear the grid
    private cleanupGameEntities(): void {
        console.log("Cleaning up game entities, spatial grid, and pending respawns...");
        // Clear pending AI respawn timeouts first
        this.aiRespawnTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.aiRespawnTimeouts = []; // Reset the array

        // Clear grid
        this.spatialGrid?.clear();
        this.spatialGrid = null;

        if (this.entities) {
            if (this.entities.player) {
                this.entities.player.destroyPixi();
                // No need to null player, EntityManager will be replaced
            }
            this.entities.orbs.forEach(orb => orb.destroyPixi());
            this.entities.ai.forEach(s => s.destroyPixi());
            // Clear arrays within the existing manager instance before potentially replacing it
            this.entities.orbs.length = 0;
            this.entities.ai.length = 0;
            // No need to set this.entities = null, it gets overwritten in startGame
        }
        // Clean up score text
        if (this.scoreText) {
            this.scoreText.destroy();
            this.scoreText = null;
        }
        // Clean up border graphics
        if (this.borderGraphics) {
            this.borderGraphics.destroy();
            this.borderGraphics = null;
        }
        // Clear the container explicitly (might be redundant if destroyPixi removes children)
        // Note: destroyPixi in PlayerSerpent/Orb should handle removing children, but this is safer.
        this.gameContainer.removeChildren();
    }


    // --- Orb Generation ---

    // Helper function for weighted random tier selection
    private getRandomOrbTier(): OrbTier {
        let randomWeight = Math.random() * ORB_TOTAL_SPAWN_WEIGHT;
        for (const tierStr in ORB_TIER_CONFIG) {
            const tier = parseInt(tierStr) as OrbTier; // Convert string key back to enum number
            const config = ORB_TIER_CONFIG[tier];
            if (randomWeight < config.spawnWeight) {
                return tier;
            }
            randomWeight -= config.spawnWeight;
        }
        return OrbTier.LOW; // Fallback to LOW tier
    }

    // Generates orbs based on world size and density constant, attempting to avoid overlaps
    private generateOrbs(): Orb[] {
        const generatedOrbs: Orb[] = [];
        const maxPlacementAttempts = 10; // Max tries to place an orb without overlap

        // Calculate dynamic orb count based on density
        const orbCount = Math.round(this.worldWidth * this.worldHeight * ORB_DENSITY);
        console.log(`Generating approximately ${orbCount} orbs (with overlap avoidance) for world size ${this.worldWidth.toFixed(0)}x${this.worldHeight.toFixed(0)}`);

        // Use dynamic world size for orb generation bounds
        const halfWidth = this.worldWidth / 2;
        const halfHeight = this.worldHeight / 2;

        // Helper to check for overlap - checks center distance against combined radii
        const isOverlapping = (x: number, y: number, radius: number, existingOrbs: Orb[]): boolean => {
            for (const existing of existingOrbs) {
                // Use sum of radii for check to ensure visual separation
                if (dist({ x, y }, existing) < radius + existing.radius) {
                    return true;
                }
            }
            return false;
        };

        // Calculate the desired orb radius once
        const baseSegR = segRadius(PLAYER_INITIAL_LENGTH);
        const orbR = Math.max(ORB_BASE_RADIUS, baseSegR * ORB_RADIUS_MULTIPLIER);
        const adjustedLineSpacing = orbR * 2.5; // Spacing for line clusters based on new radius

        let orbsAttempted = 0; // Track attempts to prevent infinite loops in edge cases
        const maxTotalAttempts = orbCount * maxPlacementAttempts * 2; // Safety break

        while (generatedOrbs.length < orbCount && orbsAttempted < maxTotalAttempts) {
            orbsAttempted++;
            // Decide whether to generate a cluster or single orb
            const isCluster = Math.random() < CLUSTER_PROBABILITY && (orbCount - generatedOrbs.length) >= MIN_CLUSTER_SIZE;

            if (isCluster) {
                const clusterSize = Math.floor(Math.random() * (MAX_CLUSTER_SIZE - MIN_CLUSTER_SIZE + 1)) + MIN_CLUSTER_SIZE;
                let clusterOrbsPlaced = 0;

                // Try finding a center for the cluster first (fewer attempts needed here)
                let clusterCenterX = 0;
                let clusterCenterY = 0;
                let centerFound = false;
                for (let attempt = 0; attempt < maxPlacementAttempts; attempt++) {
                    clusterCenterX = Math.random() * this.worldWidth - halfWidth;
                    clusterCenterY = Math.random() * this.worldHeight - halfHeight;
                    // Check if center itself is clear enough (using orbR as a proxy)
                    if (!isOverlapping(clusterCenterX, clusterCenterY, orbR, generatedOrbs)) {
                        centerFound = true;
                        break;
                    }
                }

                if (!centerFound) continue; // Skip this cluster attempt if center is too crowded

                const isLineCluster = Math.random() < 0.5;

                if (isLineCluster) {
                    const lineAngle = Math.random() * Math.PI * 2;
                    const dx = Math.cos(lineAngle) * adjustedLineSpacing; // Use adjusted spacing
                    const dy = Math.sin(lineAngle) * adjustedLineSpacing;
                    let currentX = clusterCenterX - (dx * (clusterSize - 1)) / 2;
                    let currentY = clusterCenterY - (dy * (clusterSize - 1)) / 2;

                    for (let i = 0; i < clusterSize && generatedOrbs.length < orbCount; i++) {
                        // Check overlap for the specific position in the line
                        if (!isOverlapping(currentX, currentY, orbR, generatedOrbs)) {
                            const tier = this.getRandomOrbTier();
                            generatedOrbs.push(new Orb(currentX, currentY, orbR, tier));
                            clusterOrbsPlaced++;
                        } else {
                            // Optional: Could try slightly nudging position, but skipping is simpler
                            // console.log("Skipping line cluster orb due to overlap.");
                        }
                        currentX += dx;
                        currentY += dy;
                    }
                } else { // Scatter Cluster
                    for (let i = 0; i < clusterSize && generatedOrbs.length < orbCount; i++) {
                        let orbX = 0, orbY = 0;
                        let positionFound = false;
                        for (let attempt = 0; attempt < maxPlacementAttempts; attempt++) {
                            const angle = Math.random() * Math.PI * 2;
                            const radiusOffset = Math.random() * CLUSTER_RADIUS; // Keep original cluster radius
                            orbX = clusterCenterX + Math.cos(angle) * radiusOffset;
                            orbY = clusterCenterY + Math.sin(angle) * radiusOffset;

                            if (!isOverlapping(orbX, orbY, orbR, generatedOrbs)) {
                                positionFound = true;
                                break;
                            }
                        }
                        if (positionFound) {
                            const tier = this.getRandomOrbTier();
                            generatedOrbs.push(new Orb(orbX, orbY, orbR, tier));
                            clusterOrbsPlaced++;
                        } else {
                             // console.log("Skipping scatter cluster orb due to overlap after attempts.");
                        }
                    }
                }
                 // console.log(`Cluster attempt: Placed ${clusterOrbsPlaced}/${clusterSize} orbs.`);

            } else { // Single Orb
                let orbX = 0, orbY = 0;
                let positionFound = false;
                for (let attempt = 0; attempt < maxPlacementAttempts; attempt++) {
                    orbX = Math.random() * this.worldWidth - halfWidth;
                    orbY = Math.random() * this.worldHeight - halfHeight;
                    if (!isOverlapping(orbX, orbY, orbR, generatedOrbs)) {
                        positionFound = true;
                        break;
                    }
                }

                if (positionFound) {
                    const tier = this.getRandomOrbTier();
                    generatedOrbs.push(new Orb(orbX, orbY, orbR, tier));
                } else {
                    // console.log("Skipping single orb due to overlap after attempts.");
                }
            }
             // The main while loop condition (generatedOrbs.length < orbCount) handles stopping.
        }

        if (orbsAttempted >= maxTotalAttempts && generatedOrbs.length < orbCount) {
             console.warn(`Orb generation stopped early after ${maxTotalAttempts} attempts to avoid potential infinite loop. Generated ${generatedOrbs.length}/${orbCount} orbs.`);
        } else {
            console.log(`Successfully generated ${generatedOrbs.length} orbs.`);
        }

        return generatedOrbs;
    }


    // --- Core Game Loop Methods ---

    update(deltaTime: number): void {
        // Update Dev Info Text regardless of game state if active
        if (this.devModeActive && this.devInfoText && this.entities?.player) {
            this.updateDevInfoText();
            this.devInfoText.visible = true;
        } else if (this.devInfoText) {
            this.devInfoText.visible = false;
        }

        // Game logic update only happens when PLAYING
        if (this.gameState !== GameState.PLAYING || !this.entities) {
            // Still update camera and parallax even if paused, to allow looking around?
            // Or maybe only update if paused? Let's keep it simple for now: only update if PLAYING.
            return;
        }

        // --- START of PLAYING state logic ---
        // Get entities for easier access
        const { player, ai, orbs } = this.entities;
        const now = performance.now(); // Get current time once

        // --- Update Spatial Grid ---
        // Use optional chaining for safety, although grid should exist in PLAYING state
        this.spatialGrid?.clear();

        if (this.spatialGrid) { // Keep the block check for insertions
            // Insert Player
            if (player.visible) {
                    const playerRadius = segRadius(player.length);
                    // Insert head
                    this.spatialGrid?.insert(player, { x: player.segs[0].x, y: player.segs[0].y, radius: playerRadius }); // Add optional chaining
                    // Insert relevant body segments (skip neck)
                    const skipCount = player.calculateSkipSegments(); // Player has this method
                    for (let i = skipCount; i < player.segs.length; i++) {
                        // Store the player object itself for segments, maybe add index later if needed
                        this.spatialGrid?.insert(player, { x: player.segs[i].x, y: player.segs[i].y, radius: playerRadius }); // Add optional chaining
                }
            }

            // Insert AI Snakes
            ai.forEach(s => {
                if (s.visible) {
                    const aiRadius = segRadius(s.length);
                    // Insert head
                    this.spatialGrid?.insert(s, { x: s.segs[0].x, y: s.segs[0].y, radius: aiRadius }); // Add optional chaining
                    // Insert relevant body segments (skip neck)
                    const skipCount = 6; // Use a fixed skip count for AI grid insertion
                    for (let i = skipCount; i < s.segs.length; i++) {
                        this.spatialGrid?.insert(s, { x: s.segs[i].x, y: s.segs[i].y, radius: aiRadius }); // Add optional chaining
                    }
                }
            });

            // Insert Orbs
            orbs.forEach(orb => {
                if (orb.visible) {
                    this.spatialGrid?.insert(orb, { x: orb.x, y: orb.y, radius: orb.radius });
                }
            });
        } // End of spatialGrid check block

        // --- Player Input & Physics ---
        // Extracted logic for getting desired direction (can be refactored later)
        let desiredDir = this.inputHandler.getJoystickDirection();
        let turnCooldown = JOYSTICK_TURN_COOLDOWN_MS;
        let isJoystickActive = desiredDir.x !== 0 || desiredDir.y !== 0;
        if (!isJoystickActive) {
            const keyboardDir = this.inputHandler.getKeyboardDirection(); // Gets a potentially non-zero vector
            if (keyboardDir.x !== 0 || keyboardDir.y !== 0) {
                const magnitude = Math.hypot(keyboardDir.x, keyboardDir.y);
                // Update and use the reusable object
                this._reusableKeyboardDir.x = keyboardDir.x / magnitude;
                this._reusableKeyboardDir.y = keyboardDir.y / magnitude;
                desiredDir = this._reusableKeyboardDir;
                turnCooldown = KEYBOARD_TURN_COOLDOWN_MS;
            } else {
                // Input handler now returns a reusable zero vector if no keys pressed
                desiredDir = keyboardDir; // Use the zero vector returned by inputHandler
            }
        }
        // Apply turn if there's input
        if (desiredDir.x !== 0 || desiredDir.y !== 0) {
            player.attemptTurn(desiredDir, now, turnCooldown);
        }
        // Update player physics
        player.update(deltaTime, this.worldWidth, this.worldHeight);
        // Update camera to follow player
        this.cameraX = player.segs[0].x;
        this.cameraY = player.segs[0].y;
        // Update parallax and container position based on camera
        this.updateBackgroundParallax();
        this.updateGameContainerPosition();
        // Sync player graphics
        player.syncPixi(player.calculateSkipSegments(), this.worldWidth, this.worldHeight);

        // --- AI Update & Sync ---
        ai.forEach(s => {
            if (!s.visible) return; // Skip dead AI
            // 1. Call AI-specific logic (decision making, turning)
            s.updateAI(now, orbs, this.entities.getAllSnakes(), this.worldWidth, this.worldHeight);
            // 2. Call the base update method for physics (movement, growth, etc.)
            s.update(deltaTime, this.worldWidth, this.worldHeight);
            // 3. Sync graphics (AI uses base syncPixi which doesn't need skip count, pass 0)
            s.syncPixi(0, this.worldWidth, this.worldHeight);
        });

        // ---- AI eats orbs ---- // Refactored to use spatial grid
        ai.forEach(bot => {
            if (!bot.visible) return; // Skip dead bots
            const head = bot.segs[0];
            const botRad = segRadius(bot.length);
            const orbsToRemoveAI: Orb[] = [];

            if (this.spatialGrid) {
                // Update and use reusable query bounds
                this._reusableQueryBounds.x = head.x;
                this._reusableQueryBounds.y = head.y;
                this._reusableQueryBounds.radius = botRad * 2;
                const potentialOrbsAI = this.spatialGrid.query(this._reusableQueryBounds);

                potentialOrbsAI.forEach(entity => {
                    if (entity instanceof Orb && entity.visible) {
                        const orb = entity;
                        if (dist(head, orb) < botRad + orb.radius) {
                            // AI uses the base eatOrb, pass orbValue and simple growthAmount
                            const growthAmount = orb.value; // AI growth = orb value
                            bot.eatOrb(orb.value, growthAmount);
                            orb.visible = false;
                            orb.destroyPixi();
                            orbsToRemoveAI.push(orb);
                        }
                    }
                });
            } else {
                // Fallback: Iterate all orbs if grid is not available
                for (let k = orbs.length - 1; k >= 0; k--) {
                    const orb = orbs[k];
                    if (!orb.visible) continue;
                    if (dist(head, orb) < botRad + orb.radius) {
                        // AI uses the base eatOrb, pass orbValue and simple growthAmount
                        const growthAmount = orb.value; // AI growth = orb value
                        bot.eatOrb(orb.value, growthAmount);
                        orb.visible = false;
                        orb.destroyPixi();
                        orbsToRemoveAI.push(orb); // Still collect for removal below
                    }
                }
            }
            // Remove collected orbs from the main list
            orbsToRemoveAI.forEach(orb => this.entities.removeOrb(orb));
        });

        // --- Orb Sync --- (Update logic removed as they are static for now)
        orbs.forEach(o => o.syncPixi()); // Sync remaining orbs

        // --- Collisions --- (Pass grid to collision functions if available)
        resolveCollisions(this.entities,
                          this.worldWidth, this.worldHeight,
                          (snake) => this.killSnake(snake),
                          (winner, loser) => this.absorb(winner, loser),
                          this.spatialGrid); // Pass the grid instance (can be null)

        // --- Check Orb Collisions (Player Head vs Orbs) ---
        this.checkOrbCollisions(); // Separate check for player eating orbs

// --- Update Score Text ---
if (this.scoreText) {
this.scoreText.text = `Score: ${this.entities.player.score}`;
}

// --- Mini-leaderboard (update each ½ sec) ---
if (now - (this.lastMiniBoardUpdate ?? 0) > 500) {
this.lastMiniBoardUpdate = now;
const scores = this.entities.getAllSnakes()
.filter(s => s.visible)
.map(s => ({ name: s.name, score: s.score, isPlayer: s.isPlayer }));
this.uiManager.updateMiniLeaderboard(scores);
}

// --- Update Dev Info Display ---
        // Ensure player exists before accessing properties for dev info
        if (this.devModeActive && this.devInfoText && player) {
            this.updateDevInfoText();
            this.devInfoText.visible = true;
        } else if (this.devInfoText) {
            this.devInfoText.visible = false;
        }

        // Example: Check for game over condition
        // if (some_condition) {
        //     this.gameOver();
        // }
    }

    // render(deltaTime: number): void { // REMOVED - PixiJS handles rendering via ticker
    // }

    // --- Collision Detection --- (REMOVED - Handled by resolveCollisions and checkOrbCollisions)
    // private checkCollisions(): void { ... }

    // --- Orb Collision Check (Player only) ---
    private checkOrbCollisions(): void {
        if (!this.entities || !this.entities.player || !this.entities.player.visible) return;

        const player = this.entities.player;
        const head = player.segs[0];
        const playerRadius = segRadius(player.length);

        // Use spatial grid for orb collisions if available, otherwise fallback to iteration
        if (this.spatialGrid) {
            // Update and use reusable query bounds
            this._reusableQueryBounds.x = head.x;
            this._reusableQueryBounds.y = head.y;
            this._reusableQueryBounds.radius = playerRadius * 2;
            const potentialOrbs = this.spatialGrid.query(this._reusableQueryBounds);
            const orbsToRemove: Orb[] = []; // Collect orbs to remove after iteration

            potentialOrbs.forEach(entity => {
                // Check if the entity is a visible Orb
                if (entity instanceof Orb && entity.visible) {
                    const orb = entity;
                    const distance = dist(head, orb);
                    const collisionThreshold = playerRadius + orb.radius;

                    if (distance < collisionThreshold) {
                        // Collision detected!
                        // console.log("Player ate orb!"); // Less verbose
                        // Player.eatOrb override handles growth calculation and calls super.
                        // We only need to pass the original orbValue here.
                        player.eatOrb(orb.value);

                        // Mark orb for removal
                        orb.visible = false;
                        orb.destroyPixi();
                        orbsToRemove.push(orb); // Add to removal list
                    }
                }
            });
            // Remove collected orbs from the main list
            orbsToRemove.forEach(orb => this.entities.removeOrb(orb));

        } else {
            // Fallback: Iterate backwards to safely remove orbs while looping
            for (let i = this.entities.orbs.length - 1; i >= 0; i--) {
                const orb = this.entities.orbs[i];
                if (!orb.visible) continue; // Skip already invisible orbs

                const distance = dist(head, orb);
                const collisionThreshold = playerRadius + orb.radius;

                if (distance < collisionThreshold) {
                        // Collision detected!
                        // console.log("Player ate orb!"); // Less verbose
                        // Player.eatOrb override handles growth calculation and calls super.
                        // We only need to pass the original orbValue here.
                        player.eatOrb(orb.value);

                        // Mark orb for removal, destroy its Pixi object, and remove from manager
                        orb.visible = false;
                    orb.destroyPixi();
                    this.entities.removeOrb(orb); // Use EntityManager method
                }
            }
        }


        // Self-collision check (moved from old checkCollisions)
        const skipCount = player.calculateSkipSegments();
        if (player.willHitTail(head.x, head.y, skipCount)) {
            this.killSnake(player); // Use killSnake for consistency
        }
    }


    // --- Camera Simulation ---
    private updateGameContainerPosition(): void {
        // To simulate the camera, we move the game container *opposite* to the camera's logical position.
        // The container's top-left corner should be positioned such that the camera's logical center
        // aligns with the screen's center.
        const screenWidth = this.pixiApp.screen.width;
        const screenHeight = this.pixiApp.screen.height;

        // Calculate the desired top-left position of the container
        const containerX = screenWidth / 2 - this.cameraX;
        const containerY = screenHeight / 2 - this.cameraY;

        this.gameContainer.position.set(containerX, containerY);
    }


    resize(width: number, height: number): void {
        console.log('Game resize called with dimensions:', width, height);
        // Recalculate world size based on new screen dimensions
        this.updateWorldSize();
        // Re-center the game container based on the new screen size
        this.updateGameContainerPosition();

        // Reposition score text and dev info text on resize
        if (this.scoreText) {
            this.scoreText.position.set(width - 10, 10);
        }
        if (this.devInfoText) {
            this.devInfoText.position.set(10, 30); // Keep below FPS
            // Adjust wrap width if needed
            if (this.devInfoText.style.wordWrapWidth !== width - 20) {
                 this.devInfoText.style.wordWrapWidth = width - 20;
            }
        }
    }

    // Pause/Resume called by main.ts on visibility change
    pause(): void {
        console.log('Game focus lost (pause)');
        if (this.gameState === GameState.PLAYING) {
             this.pauseGame(); // Automatically pause if tab loses focus while playing
        }
    }

    resume(): void {
        console.log('Game focus gained (resume)');
        // Don't automatically resume gameplay state, let user do it via UI.
        // Ticker is restarted in main.ts's visibility handler.
    }

    // Public getter for the current state
    public getCurrentState(): GameState {
        return this.gameState;
    }

    // --- Dev Mode ---
    private toggleDevMode(): void {
        this.devModeActive = !this.devModeActive;
        console.log(`Dev Mode ${this.devModeActive ? 'Activated' : 'Deactivated'}`);
        // Visibility of devInfoText is handled in the update loop
    }

    private updateDevInfoText(): void {
        // Check entities and player exist
        if (!this.devInfoText || !this.entities || !this.entities.player) {
            return;
        }
        const player = this.entities.player; // Use player from entities

        // Access player properties (ensure they are public or have getters)
        const segCount = player.segs.length;
        const currentSpeed = player.speed.toFixed(1);
        // Access public properties directly
        const baseSpeed = player.baseSpeed.toFixed(1);
        const boostTimer = player.speedBoostTimer.toFixed(2);
        const logicalLength = player.length.toFixed(0);
        const headX = player.segs[0].x.toFixed(0);
        const headY = player.segs[0].y.toFixed(0);
        const cameraX = this.cameraX.toFixed(0);
        const cameraY = this.cameraY.toFixed(0);
        const worldW = this.worldWidth.toFixed(0);
        const worldH = this.worldHeight.toFixed(0);

        this.devInfoText.text = `Segments: ${segCount} (Logical: ${logicalLength})\n` +
                                `Speed: ${currentSpeed} (Base: ${baseSpeed})\n` +
                                `Boost Time: ${boostTimer}s\n` +
                                `Head Pos: (${headX}, ${headY})\n` +
                                `Camera: (${cameraX}, ${cameraY})\n` +
                                `World: ${worldW}x${worldH}`;
    }

 // --- Parallax Update ---
 private updateBackgroundParallax(): void {
     const parallaxX = -this.cameraX * this.parallaxFactor;
     const parallaxY = -this.cameraY * this.parallaxFactor;
     const parallaxWrap = document.getElementById('parallaxWrap') as HTMLElement | null;
     if (parallaxWrap) {
         // Apply only translation to the parallax wrapper
         parallaxWrap.style.transform = `translate3d(${parallaxX}px, ${parallaxY}px, 0)`;
     } else {
         // console.warn("Could not find #parallaxWrap element for parallax update."); // Keep commented unless debugging
     }
     // The video element itself no longer needs per-frame transform updates
     // this.backgroundVideoElement.style.transform = `...`; // Removed
 }

 // --- Collision Resolution Helpers --- Added
 private killSnake(s: SnakeState): void { // Accept SnakeState
    if (!s.visible) return; // Already dead

    console.log(`Killing snake: ${s.id}`);
    s.visible = false; // Mark state as not visible

    // Find the actual instance to call destroyPixi on
    const instanceToDestroy = s.isPlayer ? this.entities.player : this.entities.ai.find(aiSnake => aiSnake.id === s.id);

    if (instanceToDestroy) {
        instanceToDestroy.destroyPixi(); // Call destroyPixi on the actual instance
    } else {
         console.error(`Could not find instance with ID ${s.id} to destroy Pixi object.`);
    }


    if (s.isPlayer) {
        this.gameOver();
    } else {
        // Remove AI snake from the manager - Need to find the AISerpent instance
        // Find the corresponding AISerpent instance in the manager's list
        const aiToRemove = this.entities.ai.find(aiSnake => aiSnake.id === s.id);
        if (aiToRemove) {
            this.entities.removeAISerpent(aiToRemove);
            // ✅  respawn replacement after 3 s, storing timeout ID
            // Cast setTimeout result to number for browser environment compatibility
            const timeoutId = setTimeout(() => {
                // Check if entities still exist AND game is still playing
                if (this.entities && this.gameState === GameState.PLAYING) {
                    console.log(`Respawning AI after snake ${s.id} was killed.`);
                    // Need to call spawnSingleAI on the instance, not the class
                    this.entities.spawnSingleAI(this.worldWidth, this.worldHeight); // Call the new method
                    // Remove this timeout ID from the list once executed successfully
                    this.aiRespawnTimeouts = this.aiRespawnTimeouts.filter(id => id !== timeoutId);
                } else {
                    console.log(`Skipping AI respawn for ${s.id} due to game state change or missing entities.`);
                    // Also remove from list if skipped
                    // Ensure comparison is number vs number
                    this.aiRespawnTimeouts = this.aiRespawnTimeouts.filter(id => id !== timeoutId as unknown as number);
                }
            }, 3000) as unknown as number; // Cast the timeoutId itself
            this.aiRespawnTimeouts.push(timeoutId); // Store the timeout ID (already cast)
        } else {
            console.warn(`Could not find AI serpent with ID ${s.id} to remove.`);
        }
    }
 }

 private absorb(winnerState: SnakeState, loserState: SnakeState): void { // Accept SnakeState
    if (!winnerState.visible || !loserState.visible) return; // Ensure both are 'alive' at the moment of absorption

    // Find the actual winner/loser instances in the entity manager
    const winner = winnerState.isPlayer ? this.entities.player : this.entities.ai.find(s => s.id === winnerState.id);
    const loser = loserState.isPlayer ? this.entities.player : this.entities.ai.find(s => s.id === loserState.id);

    // Ensure both instances were found
    if (!winner || !loser) {
        console.error("Could not find winner or loser instance for absorption.", { winnerId: winnerState.id, loserId: loserState.id });
        return;
    }


    console.log(`Snake ${winner.id} absorbing snake ${loser.id}`);
    winner.length += loser.length; // Add logical length
    winner.score += loser.score; // Add score (assuming score property exists or is added)

    // Append segments (skip neck of loser)
    // Ensure loser.segs exists and has enough segments
    if (loser.segs && loser.segs.length > 6) {
        winner.segs.push(...loser.segs.slice(6));
    }
    // Winner's graphics will update automatically based on new segs array in syncPixi

    // --- Add Absorption Effects ---
    // TODO: Consider creating specific absorption effect constants later
    winner.glowFrames = PLAYER_EAT_GLOW_FRAMES * 2; // Longer glow for absorption
    winner.speed = winner.baseSpeed * PLAYER_EAT_SPEED_BOOST; // Apply speed boost
    winner.speedBoostTimer = (PLAYER_EAT_SPEED_BOOST_DURATION_MS / 1000) * 1.5; // Longer boost duration
 }

    // --- KeyDown Handler --- Added to satisfy main.ts
    public handleKeyDown(event: KeyboardEvent): void {
        // Handle global keys like Pause (Space, Esc)
        switch (event.key) {
            case 'Escape':
                if (this.gameState === GameState.PLAYING) {
                    this.pauseGame();
                } else if (this.gameState === GameState.PAUSED) {
                    this.resumeGame(); // Allow Esc to resume from pause
                } else if (this.gameState === GameState.CONTROLS) {
                    this.hideControls(); // Allow Esc to exit controls
                }
                break;

            // case ' ': // Space bar - Functionality removed, will be used for firing later
            //     event.preventDefault();
            //     // Fire action will be handled in the update loop via inputHandler.isFireButtonPressed()
            //     break;
        }
        // Note: Movement keys (WASD/Arrows) are handled by InputHandler polling in the update loop
    }
}

export default Game;
