import * as PIXI from 'pixi.js';
import Game, { GameState } from './Game'; // Import GameState enum
import InputHandler from './InputHandler';

let game: Game | undefined;
let inputHandler: InputHandler | undefined;
let pixiApp: PIXI.Application | undefined;
let fpsText: PIXI.Text | undefined; // Added for FPS counter

// DOM Element References
const pixiContainer = document.getElementById('pixi-container') as HTMLDivElement | null;
const backgroundVideo = document.getElementById('backgroundVideo') as HTMLVideoElement | null;
const loadingScreen = document.getElementById('loadingScreen') as HTMLDivElement | null;

// --- Initialization ---

if (!pixiContainer || !backgroundVideo || !loadingScreen) {
    console.error('Critical DOM elements not found! Need #pixi-container, #backgroundVideo, #loadingScreen.');
    if (loadingScreen) {
        loadingScreen.textContent = 'Error: Missing required page elements. Cannot initialize game.';
    }
} else {
    // Add listeners early
    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('keydown', handleKeyDown);

    // Asynchronous initialization function
    async function initializeGame(): Promise<void> {
        try {
            // 1. Create PixiJS Application
            pixiApp = new PIXI.Application();

            // 2. Initialize PixiJS Application with settings
            await pixiApp.init({
                width: window.innerWidth,
                height: window.innerHeight,
                backgroundAlpha: 0, // Transparent background
                powerPreference: 'high-performance', // Request high performance GPU
                // gcMode: PIXI.GC_MODE.AUTO, // Removed - Not a valid option in v8 ApplicationOptions
                antialias: true,
                resolution: window.devicePixelRatio || 1, // Adjust for device pixel ratio
                autoDensity: true, // Automatically handle resolution changes
            });

            // 3. Append PixiJS canvas to the container
            pixiContainer!.appendChild(pixiApp.canvas); // Use non-null assertion

            // 4. Instantiate Input Handler (pass PixiJS canvas for touch events)
            inputHandler = new InputHandler(pixiApp.canvas); // Pass PixiJS canvas
            inputHandler.initJoystickGraphics(pixiApp.stage); // Initialize joystick visuals

            // Preload orb textures before setting up the game
            console.log("Loading orb assets...");
            await PIXI.Assets.load(['/orb1.png','/orb2.png','/orb3.png']);
            console.log("Orb assets loaded.");

            // 5. Wait for video metadata before instantiating Game
            const setupGame = () => {
                // Instantiate Game (pass PixiJS App and other dependencies)
                game = new Game(pixiApp!, inputHandler!, backgroundVideo!); // Use non-null assertions

                // Initialize game state (creates menus, etc.)
                game.init();

                // Initialize FPS Counter Text
                fpsText = new PIXI.Text({
                    text: 'FPS: 0',
                    style: {
                        fontFamily: 'Arial',
                        fontSize: 18,
                        fill: 0x00ff00, // Neon green
                        align: 'left',
                    }
                });
                fpsText.position.set(10, 10); // Position top-left
                pixiApp!.stage.addChild(fpsText); // Add to the main stage (not gameContainer)

                // Set up PixiJS Ticker for the game loop
                pixiApp!.ticker.maxFPS = 60; // Cap FPS
                pixiApp!.ticker.add((ticker: PIXI.Ticker) => {
                    // Update FPS counter
                    if (fpsText) {
                        fpsText.text = `FPS: ${ticker.FPS.toFixed(2)}`;
                    }

                    // Update game logic if playing
                    if (game && game.getCurrentState() === GameState.PLAYING) {
                        const deltaTimeSeconds = ticker.deltaMS / 1000.0;
                        // Clamp delta time to prevent large jumps (e.g., after tab focus)
                        const clampedDeltaTime = Math.min(deltaTimeSeconds, 1 / 30); // Max ~30 FPS step
                        game.update(clampedDeltaTime);
                        // Rendering is handled by PixiJS automatically based on stage updates in game.update -> entity.syncPixi()
                    }
                    // Update joystick visuals regardless of game state
                    if (inputHandler) {
                        inputHandler.updateJoystickGraphics();
                    }
                });
                // Ticker starts automatically

                // Hide loading screen
                loadingScreen!.style.display = 'none'; // Use non-null assertion

                // Initial resize call to ensure correct sizing
                handleResize();

                // Ensure background video plays (moved here to ensure it plays after setup)
                backgroundVideo!.play().catch(error => {
                    console.warn('Background video autoplay prevented:', error);
                    // Consider adding a user interaction requirement to play video
                });
            };

            // Check if metadata is already loaded
            if (backgroundVideo!.readyState >= backgroundVideo!.HAVE_METADATA) {
                console.log("Video metadata already loaded.");
                setupGame();
            } else {
                console.log("Waiting for video metadata...");
                backgroundVideo!.addEventListener('loadedmetadata', () => {
                    console.log("Video metadata loaded.");
                    setupGame();
                }, { once: true }); // Ensure listener runs only once
            }

            // --- Ticker and Loading Screen logic moved inside setupGame ---
            /*
            // 6.5 Initialize FPS Counter Text
            fpsText = new PIXI.Text({
                text: 'FPS: 0',
                style: {
                    fontFamily: 'Arial',
                    fontSize: 18,
                    fill: 0x00ff00, // Neon green
                    align: 'left',
                }
            });
            fpsText.position.set(10, 10); // Position top-left
            */
        } catch (error) {
            console.error('Game initialization failed:', error);
            if (loadingScreen) {
                const message = (error instanceof Error) ? error.message : String(error);
                loadingScreen.textContent = `Error during initialization: ${message}. Check console.`;
                loadingScreen.style.color = 'red';
            }
            // Clean up PixiJS app if initialization failed partially
            if (pixiApp) {
                inputHandler?.destroyJoystickGraphics(); // Clean up joystick graphics
                // Remove baseTexture, it's not a valid option here
                pixiApp.destroy(true, { children: true, texture: true /*, baseTexture: true */ });
                pixiApp = undefined;
            }
        }
    }

    // Start the initialization process
    initializeGame();
}

// --- Event Handlers ---

function handleResize(): void {
    if (pixiApp && game) {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;

        // Resize the PixiJS renderer
        pixiApp.renderer.resize(newWidth, newHeight);

        // Optionally notify the game about the resize if it needs to adjust layout
        game.resize(newWidth, newHeight);
    }
}

function handleVisibilityChange(): void {
    if (!pixiApp || !game) return;

    if (document.hidden) {
        // Tab is hidden
        pixiApp.ticker.stop(); // Stop the PixiJS ticker
        game.pause(); // Pause game logic (handles state change)
        console.log("Game paused - Tab hidden");
    } else {
        // Tab is visible
        pixiApp.ticker.start(); // Start the PixiJS ticker
        // game.resume(); // Game resume logic should be handled by user interaction (e.g., clicking resume button)
        console.log("Game active - Tab visible");
        // Note: We don't automatically resume the game's *state* here,
        // only the rendering loop. The game remains paused until the user resumes it via UI.
        // If the game wasn't paused by the user before hiding, it might need explicit resume.
        // Let's rely on the game's internal state management triggered by UI.
    }
}

function handleKeyDown(event: KeyboardEvent): void {
    if (!game) return; // Game not initialized yet

    // const currentState = game.getCurrentState(); // Removed unused variable

    // Let the game instance handle keydown events for state changes (pause/resume)
    game.handleKeyDown(event);

    // Example of direct handling (could be moved into Game class):
    // switch (event.key) {
    //     case 'Escape':
    //         if (currentState === GameState.PLAYING) {
    //             game.pauseGame();
    //         } else if (currentState === GameState.PAUSED) {
    //             game.resumeGame();
    //         } else if (currentState === GameState.CONTROLS) {
    //             game.hideControls();
    //         }
    //         break;
    //     case ' ': // Space bar
    //         event.preventDefault(); // Prevent page scroll
    //         if (currentState === GameState.PLAYING) {
    //             game.pauseGame();
    //         } else if (currentState === GameState.PAUSED) {
    //             game.resumeGame();
    //         } else if (currentState === GameState.GAME_OVER) {
    //             game.returnToMenu();
    //         }
    //         break;
    // }
}
