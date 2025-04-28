import Game from './Game';
import Renderer from './Renderer';
import InputHandler from './InputHandler';

let game;
let renderer;
let inputHandler;
let gl;
let animationFrameId = null;
let lastTimestamp = 0;

const canvas = document.getElementById('gameCanvas');
const backgroundVideo = document.getElementById('backgroundVideo');
const loadingScreen = document.getElementById('loadingScreen');

if (!canvas || !backgroundVideo || !loadingScreen) {
    console.error('Critical DOM elements not found!');
    // Optionally display a user-friendly error message on the page
    if (loadingScreen) {
        loadingScreen.textContent = 'Error: Game elements not found. Please ensure your browser is up to date and try again.';
    }
    } else {
        // Attempt to get WebGL2 context
        gl = canvas.getContext('webgl2');

        // If WebGL2 is not available, try WebGL1
        if (!gl) {
            console.warn('WebGL2 not available, falling back to WebGL1');
            gl = canvas.getContext('webgl');
        }

    if (!gl) {
        console.error('WebGL is not supported in this browser.');
        // Display a user-friendly error message
        if (loadingScreen) {
            loadingScreen.textContent = 'Error: WebGL is not supported in your browser. Please update your browser or check your graphics card drivers.';
        }
    } else {
        // WebGL context obtained, proceed with initialization
        console.log(`WebGL context obtained: ${gl.constructor.name}`);

        // Initial resize setup
        handleResize();

        // Add resize listener
        window.addEventListener('resize', handleResize);

        // Add visibility listener
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Asynchronous initialization function
        async function initializeGame() {
            try {
                // Instantiate core modules
                renderer = new Renderer(gl, canvas);
                inputHandler = new InputHandler(canvas); // Pass canvas for event listeners
                game = new Game(renderer, inputHandler); // Pass dependencies

                // Initialize renderer (e.g., load shaders)
                await renderer.init();

                // Initialize game state
                game.init();

                // Hide loading screen
                loadingScreen.style.display = 'none';

                // Start the game loop
                animationFrameId = requestAnimationFrame(gameLoop);

            } catch (error) {
                console.error('Game initialization failed:', error);
                if (loadingScreen) {
                     loadingScreen.textContent = `Error during initialization: ${error.message}`;
                }
            }
        }

        // Start the initialization process
        initializeGame();
    }
}

function gameLoop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const deltaTime = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    // Clamp deltaTime to prevent large jumps after tab focus change
    const clampedDeltaTime = Math.min(deltaTime, 1 / 30); // Max 30 FPS equivalent

    if (game) {
        game.update(clampedDeltaTime);
        game.render(clampedDeltaTime);
    }

    animationFrameId = requestAnimationFrame(gameLoop);
}

function handleResize() {
    if (canvas && renderer) {
        const displayWidth = canvas.clientWidth;
        const displayHeight = canvas.clientHeight;

        // Check if canvas size needs to be updated
        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width = displayWidth;
            canvas.height = displayHeight;
            renderer.resize(displayWidth, displayHeight); // Notify renderer
            if (game) {
                game.resize(displayWidth, displayHeight); // Notify game if needed
            }
        }
    }
}

function handleVisibilityChange() {
    if (document.hidden) {
        // Tab is hidden, pause the game loop
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        // Optionally pause audio or other resource-intensive tasks
        if (game) {
             game.pause(); // Assuming a pause method exists
        }
    } else {
        // Tab is visible, resume the game loop
        lastTimestamp = 0; // Reset timestamp to prevent large deltaTime spike
        animationFrameId = requestAnimationFrame(gameLoop);
        // Optionally resume audio or other tasks
         if (game) {
             game.resume(); // Assuming a resume method exists
         }
    }
}

// Ensure background video plays
if (backgroundVideo) {
    backgroundVideo.play().catch(error => {
        console.warn('Background video autoplay prevented:', error);
        // Handle autoplay issues, e.g., show a play button
    });
}
