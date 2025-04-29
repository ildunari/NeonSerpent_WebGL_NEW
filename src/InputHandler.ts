import { Point } from './types';
import * as PIXI from 'pixi.js'; // Import PixiJS

// Define a more detailed JoystickState
interface JoystickState {
    active: boolean;
    startPosition: Point | null; // Position where touch began
    currentPosition: Point | null; // Current touch position
    vector: Point; // Calculated direction vector (normalized)
    deadzoneRadius: number; // Radius around start where input is ignored
    maxTravelRadius?: number; // Max distance knob can move from base center
}

class InputHandler {
    private canvas: HTMLCanvasElement;
    // private keys: { [key: string]: boolean }; // Keep generic keys if needed, but use specific flags for movement
    private joystick: JoystickState;

    // PixiJS graphics for joystick visualization
    private joystickContainer: PIXI.Container | null = null;
    private joystickBaseGraphics: PIXI.Graphics | null = null;
    private joystickKnobGraphics: PIXI.Graphics | null = null;

    // Track movement key states
    private moveUp: boolean = false;
    private moveDown: boolean = false;
    private moveLeft: boolean = false;
    private moveRight: boolean = false;

    // Reusable objects to minimize allocation
    private _keyboardDirection: Point = { x: 0, y: 0 };
    private _zeroDirection: Point = { x: 0, y: 0 };

    constructor(canvas: HTMLCanvasElement) {
        console.log('InputHandler constructor called');
        this.canvas = canvas;
        // Store input state
        this.joystick = {
            active: false,
            startPosition: null,
            currentPosition: null,
            vector: { x: 0, y: 0 },
            deadzoneRadius: 20 // Example deadzone radius in pixels
        };
        // No need for void this.joystick anymore

        // Add event listeners
        this.addEventListeners();
        // No need for void this.canvas anymore
    }

    // --- PixiJS Graphics Methods ---

    /** Initializes the PixiJS graphics objects for the joystick */
    initJoystickGraphics(stage: PIXI.Container): void {
        this.joystickContainer = new PIXI.Container();
        this.joystickContainer.visible = false; // Initially hidden

        // Define appearance
        const baseRadius = 50;
        const knobRadius = 25;
        const baseColor = 0xcccccc;
        const knobColor = 0x888888;
        const baseAlpha = 0.3;
        const knobAlpha = 0.5;

        // Create base graphics
        this.joystickBaseGraphics = new PIXI.Graphics();
        this.joystickBaseGraphics.circle(0, 0, baseRadius);
        this.joystickBaseGraphics.fill({ color: baseColor, alpha: baseAlpha });
        this.joystickContainer.addChild(this.joystickBaseGraphics);

        // Create knob graphics
        this.joystickKnobGraphics = new PIXI.Graphics();
        this.joystickKnobGraphics.circle(0, 0, knobRadius);
        this.joystickKnobGraphics.fill({ color: knobColor, alpha: knobAlpha });
        this.joystickContainer.addChild(this.joystickKnobGraphics);

        // Add the container to the main stage
        stage.addChild(this.joystickContainer);

        // Set max travel radius based on base radius
        this.joystick.maxTravelRadius = baseRadius - knobRadius / 2; // Knob center shouldn't go past base edge

        console.log('Joystick graphics initialized.');
    }

    /** Updates the joystick graphics based on the current state */
    updateJoystickGraphics(): void {
        if (!this.joystickContainer || !this.joystickBaseGraphics || !this.joystickKnobGraphics) {
            return;
        }

        this.joystickContainer.visible = this.joystick.active;

        if (this.joystick.active && this.joystick.startPosition && this.joystick.currentPosition) {
            // Position the container (base) at the start position
            this.joystickContainer.position.set(this.joystick.startPosition.x, this.joystick.startPosition.y);

            // Calculate knob position relative to the base center
            let knobX = this.joystick.currentPosition.x - this.joystick.startPosition.x;
            let knobY = this.joystick.currentPosition.y - this.joystick.startPosition.y;
            const distance = Math.hypot(knobX, knobY);

            // Clamp knob position within the max travel radius
            const maxRadius = this.joystick.maxTravelRadius ?? 50; // Use default if not set
            if (distance > maxRadius) {
                const scale = maxRadius / distance;
                knobX *= scale;
                knobY *= scale;
            }

            // Apply deadzone visually (optional, could just snap to center if vector is 0,0)
            if (this.joystick.vector.x === 0 && this.joystick.vector.y === 0) {
                 knobX = 0;
                 knobY = 0;
            }


            this.joystickKnobGraphics.position.set(knobX, knobY);
        }
    }

    /** Cleans up the joystick graphics */
    destroyJoystickGraphics(): void {
        if (this.joystickContainer) {
            this.joystickContainer.parent?.removeChild(this.joystickContainer);
            this.joystickContainer.destroy({ children: true });
            this.joystickContainer = null;
            this.joystickBaseGraphics = null;
            this.joystickKnobGraphics = null;
            console.log('Joystick graphics destroyed.');
        }
    }

    // --- Event Listeners ---

    addEventListeners(): void {
        console.log('InputHandler adding event listeners');
        // Bind listeners correctly to maintain 'this' context
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);

        // Add keyboard listeners
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        // Add touch listeners to the canvas
        this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false }); // passive: false to allow preventDefault
        this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd);
        this.canvas.addEventListener('touchcancel', this.handleTouchEnd); // Treat cancel like end
    }

    removeEventListeners(): void {
        console.log('InputHandler removing event listeners');
        // Remove keyboard listeners
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        // Remove touch listeners
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchmove', this.handleTouchMove);
        this.canvas.removeEventListener('touchend', this.handleTouchEnd);
        this.canvas.removeEventListener('touchcancel', this.handleTouchEnd);
    }

    // Keyboard event handlers
    private handleKeyDown(event: KeyboardEvent): void {
        // Prevent default browser actions for arrow keys, WASD, space
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', ' '].includes(event.key)) {
           // Keep space bar preventDefault in main.ts for game state control
           if (event.key !== ' ') {
                event.preventDefault();
           }
        }

        switch (event.key) {
            case 'w':
            case 'ArrowUp':
                this.moveUp = true;
                break;
            case 's':
            case 'ArrowDown':
                this.moveDown = true;
                break;
            case 'a':
            case 'ArrowLeft':
                this.moveLeft = true;
                break;
            case 'd':
            case 'ArrowRight':
                this.moveRight = true;
                break;
        }
        // Store generic key state if needed elsewhere
        // this.keys[event.key] = true;
    }

    private handleKeyUp(event: KeyboardEvent): void {
         switch (event.key) {
            case 'w':
            case 'ArrowUp':
                this.moveUp = false;
                break;
            case 's':
            case 'ArrowDown':
                this.moveDown = false;
                break;
            case 'a':
            case 'ArrowLeft':
                this.moveLeft = false;
                break;
            case 'd':
            case 'ArrowRight':
                this.moveRight = false;
                break;
        }
         // Store generic key state if needed elsewhere
        // delete this.keys[event.key];
    }

    // --- Touch Event Handlers ---
    private handleTouchStart(event: TouchEvent): void {
        event.preventDefault(); // Prevent scrolling/zooming
        if (event.touches.length > 0) {
            const touch = event.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.joystick.startPosition = {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
            this.joystick.currentPosition = { ...this.joystick.startPosition }; // Start at the same point
            this.joystick.active = true;
            this.joystick.vector = { x: 0, y: 0 }; // Reset vector initially
            // console.log('Touch Start:', this.joystick.startPosition);

            // Update graphics immediately on touch start
            this.updateJoystickGraphics();
        }
    }

    private handleTouchMove(event: TouchEvent): void {
        event.preventDefault();
        if (!this.joystick.active || !this.joystick.startPosition || event.touches.length === 0) {
            return;
        }
        const touch = event.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        this.joystick.currentPosition = {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };

        // Calculate vector from start to current
        let dx = this.joystick.currentPosition.x - this.joystick.startPosition.x;
        let dy = this.joystick.currentPosition.y - this.joystick.startPosition.y;
        const distance = Math.hypot(dx, dy);

        // Apply deadzone
        if (distance < this.joystick.deadzoneRadius) {
            this.joystick.vector = { x: 0, y: 0 };
        } else {
            // Normalize the vector
            this.joystick.vector = { x: dx / distance, y: dy / distance };
        }
         // console.log('Touch Move - Vector:', this.joystick.vector);

         // Update graphics on move
         this.updateJoystickGraphics();
    }

    private handleTouchEnd(/* event: TouchEvent */): void { // Removed unused event parameter
         // Check if the touch ending is the one we were tracking (optional but good practice)
         // For simplicity, we assume any touchend deactivates the joystick if active.
         if (this.joystick.active) {
            this.joystick.active = false;
            this.joystick.startPosition = null;
            this.joystick.currentPosition = null;
            // Keep the last vector? Or reset? Let's keep it for now, serpent continues.
            // this.joystick.vector = { x: 0, y: 0 };
            // console.log('Touch End');

            // Update graphics (will hide the container)
            this.updateJoystickGraphics();
         }
    }

    // Method to get the desired movement direction from keyboard
    // Returns a non-normalized vector, or {x: 0, y: 0} if no direction keys are pressed
    getKeyboardDirection(): Point {
        let dx = 0;
        let dy = 0;

        if (this.moveUp) dy -= 1;
        if (this.moveDown) dy += 1;
        if (this.moveLeft) dx -= 1;
        if (this.moveRight) dx += 1;

        // Update the reusable object instead of creating a new one
        this._keyboardDirection.x = dx;
        this._keyboardDirection.y = dy;
        return this._keyboardDirection;
    }

    // Method to get the desired movement direction from joystick
    // Returns a *normalized* vector, or the reusable zero vector if inactive/deadzone
    getJoystickDirection(): Point {
        // Return the joystick's vector if active AND not in deadzone, otherwise return the zero vector
        return (this.joystick.active && (this.joystick.vector.x !== 0 || this.joystick.vector.y !== 0))
            ? this.joystick.vector
            : this._zeroDirection;
    }

    // Method to get current input state (optional, maybe remove if not needed)
    // getInputState(): { keys: { [key: string]: boolean }, joystick: JoystickState } {
    //     // Return current state of keys and joystick
    //     return {
    //         keys: this.keys,
    //         joystick: this.joystick
    //     };
    // }
}

export default InputHandler;
