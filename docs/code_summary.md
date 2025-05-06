# Neon Serpent Code Summary

This document provides a summary of the main TypeScript files and their roles in the Neon Serpent WebGL game.

## Core Logic & Orchestration

### `src/main.ts`
*   **Purpose:** The main entry point of the application. Initializes the PixiJS rendering engine, loads assets, sets up the game loop (`PIXI.Ticker`), creates the `InputHandler` and `Game` instances, and manages browser events like resize and visibility changes.
*   **Key Functions:** `initializeGame()`, `setupGame()`, `handleResize()`, `handleVisibilityChange()`, `handleKeyDown()`.

### `src/Game.ts`
*   **Class:** `Game`
*   **Purpose:** Central orchestrator for the game. Manages the game state machine (Loading, Menu, Playing, Paused, Controls, Game Over), the main game loop (`update`), entity management (via `EntityManager`), collision detection (via `CollisionSystem`), camera simulation, background effects (video zoom/parallax), UI interaction (via `UIManager`), and input handling (via `InputHandler`).
*   **Key Methods:** `constructor()`, `init()`, `changeState()`, `startGame()`, `pauseGame()`, `resumeGame()`, `gameOver()`, `update()`, `generateOrbs()`, `checkOrbCollisions()`, `killSnake()`, `absorb()`, `handleUIAction()`, `handleKeyDown()`.

## Entity Management

### `src/EntityManager.ts`
*   **Class:** `EntityManager`
*   **Purpose:** Creates, stores, and provides access to all active game entities (Player, AI Serpents, Orbs). Acts as a central registry.
*   **Key Methods:** `constructor()`, `spawnPlayer()`, `spawnAI()`, `spawnSingleAI()`, `getAllSnakes()`, `removeAISerpent()`, `removeOrb()`.

## Game Entities

### `src/Serpent.ts`
*   **Class:** `Serpent` (Base Class)
*   **Purpose:** Defines the fundamental properties and behaviors common to all snake entities (Player and AI). Includes segment management, core movement physics (velocity, speed interpolation, segment following), basic growth logic, scoring, and PixiJS object handling.
*   **Key Methods:** `constructor()`, `initPixi()`, `destroyPixi()`, `syncPixi()` (basic rendering, meant to be overridden), `update()` (core physics/growth), `setDirection()`, `eatOrb()` (base logic), `attemptTurn()` (base logic).

### `src/PlayerSerpent.ts`
*   **Class:** `PlayerSerpent` (extends `Serpent`)
*   **Purpose:** Represents the player-controlled serpent. Adds player-specific rendering effects (glow, pulse, safe neck, mouth), input-driven turning logic with self-collision avoidance, dynamic base speed based on length, and specific effects upon eating orbs (speed boost, glow).
*   **Key Methods:** `constructor()`, `syncPixi()` (override for advanced visuals), `attemptTurn()` (override with player constraints), `calculateSkipSegments()`, `willHitTail()`, `eatOrb()` (override for player effects), `update()` (override for dynamic speed).

### `src/AISerpent.ts`
*   **Class:** `AISerpent` (extends `Serpent`)
*   **Purpose:** Represents AI-controlled opponents. Includes an `AIController` for decision-making. Overrides base methods for AI-specific behavior and rendering.
*   **Key Methods:** `constructor()`, `updateAI()` (uses `AIController` to decide direction), `attemptTurn()` (override to prevent 180s), `update()` (override for AI base speed calc), `eatOrb()` (override for AI effects), `syncPixi()` (override for AI visuals - similar to player but simpler).

### `src/Orb.ts`
*   **Class:** `Orb`
*   **Purpose:** Represents the static, collectible orbs. Stores position, radius, tier, value, and manages its `PIXI.Sprite`.
*   **Key Methods:** `constructor()`, `initPixi()`, `syncPixi()`, `destroyPixi()`.

## Systems & Controllers

### `src/AIController.ts`
*   **Class:** `AIController`
*   **Purpose:** Encapsulates the decision-making logic for an `AISerpent`. Determines the AI's state (Gather, Hunt, Evade) based on nearby orbs and snakes, calculates a target point, adds noise for unpredictability, and returns a steering vector.
*   **Key Methods:** `constructor()`, `decide()` (core logic), `pickSnakeTarget()`, `pickBestOrb()`, `vecTo()`, `normalize()`, `noise()`.

### `src/CollisionSystem.ts`
*   **Purpose:** Contains the logic for detecting and resolving collisions between snakes (head-vs-body, head-vs-head), using toroidal distance checks and optionally a `SpatialHashGrid`. Uses callbacks provided by `Game` to enact consequences (killing, absorbing).
*   **Key Function:** `resolveCollisions()`.

### `src/InputHandler.ts`
*   **Class:** `InputHandler`
*   **Purpose:** Captures and processes user input (keyboard WASD/Arrows, touch for virtual joystick, fire button). Translates inputs into directional commands and action states for the `Game`. Manages the visual joystick graphics.
*   **Key Methods:** `constructor()`, `addEventListeners()`, `removeEventListeners()`, `handleKeyDown()`, `handleKeyUp()`, `handleTouchStart()`, `handleTouchMove()`, `handleTouchEnd()`, `initJoystickGraphics()`, `updateJoystickGraphics()`, `getKeyboardDirection()`, `getJoystickDirection()`, `isFireButtonPressed()`.

### `src/UI.ts`
*   **Class:** `UIManager`
*   **Purpose:** Manages the HTML-based UI overlay. Controls visibility of menus, updates leaderboards, attaches listeners to buttons, and uses a callback to notify the `Game` of UI actions.
*   **Key Methods:** `constructor()`, `init()`, `hideAllMenus()`, `showMainMenu()`, `showControlsMenu()`, etc., `updatePauseLeaderboard()`, `updateMiniLeaderboard()`, `updatePauseButton()`.

### `src/SpatialHashGrid.ts`
*   **Class:** `SpatialHashGrid`
*   **Purpose:** Provides a spatial hashing data structure to optimize collision detection and proximity queries in the toroidal world by dividing the space into cells.
*   **Key Methods:** `constructor()`, `clear()`, `insert()`, `query()`.

## Utilities & Types

### `src/utils.ts`
*   **Purpose:** A collection of standalone utility functions for math (distance, lerp), toroidal coordinate manipulation (wrap, distance, delta, moveTowards), and color interpolation.
*   **Key Functions:** `dist()`, `distTorus()`, `wrap()`, `torusDelta()`, `moveTowardsTorus()`, `lerpColor()`, `lerp()`.

### `src/types.ts` (Not explicitly read, but referenced)
*   **Purpose:** Defines shared TypeScript interfaces and types (like `Point`, `Segment`, `Velocity`, `SnakeState`, `OrbTier`) and potentially constants used across multiple modules.

### `src/constants.ts` / `src/aiConstants.ts` (Not explicitly read, but referenced)
*   **Purpose:** Likely define game-wide or AI-specific constants (like world size factors, speeds, counts, behavior parameters).
