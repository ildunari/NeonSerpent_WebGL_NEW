## Neon Serpent: Gameplay Overview

**Concept:** Neon Serpent thrusts you into a vibrant, endlessly wrapping world as a glowing serpent. It's a modern evolution of the classic snake game, challenging your reflexes against AI opponents in a visually rich environment.

**Objective:** Your primary goal is survival and growth. Navigate the expansive world, consuming glowing orbs to increase your serpent's length and accumulate score. The longer you survive and the more you consume, the higher your score climbs.

**The World:**

* **Expansive & Wrapping:** The game takes place in a very large, square arena. There are no walls; moving off one edge instantly transports you to the opposite side ([`wrap()` in `src/utils.ts`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/utils.ts), used in [`Serpent.update()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Serpent.ts#L197)), creating a seamless, continuous space.
* **2.5D Parallax Background:** A dynamic video plays in the background ([`index.html`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/index.html#L15)), featuring a scene like a futuristic cave city. This background scrolls at a different rate than the foreground gameplay (parallax effect), creating a sense of depth.

**Controlling Your Serpent:**

* **Continuous Movement:** Your serpent is always in motion ([`Game.update()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Game.ts#L707) calls [`player.update()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/PlayerSerpent.ts#L337)), gliding smoothly in its current direction.
* **Keyboard:** Use `WASD` or the `Arrow Keys` to dictate the direction you want your serpent to turn towards (handled by [`InputHandler`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/InputHandler.ts)).
* **Touch (Virtual Joystick):** On touch devices, tap and hold to activate a virtual joystick. Drag to set the desired heading. Releasing maintains the last direction (handled by [`InputHandler`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/InputHandler.ts) and [`UIManager`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/UI.ts)). A small deadzone prevents micro-movements.

**Core Mechanics:**

* **Turning:**
  * You can't instantly reverse (180 degrees) direction (checked in [`PlayerSerpent.attemptTurn()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/PlayerSerpent.ts)).
  * There's a brief cooldown period after each turn ([`KEYBOARD_TURN_COOLDOWN_MS`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/types.ts), [`JOYSTICK_TURN_COOLDOWN_MS`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/types.ts)) preventing overly rapid movements.
  * **Smart Collision Avoidance (Safe Neck):** The game prevents turns that would cause immediate self-collision. A number of segments behind the head ([`MAX_NECK_SKIP_SEGMENTS`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/types.ts)) are ignored during collision checks ([`resolveCollisions`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/CollisionSystem.ts)). The player serpent visually renders these segments differently ([`safeNeckColor`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/PlayerSerpent.ts#L77) in [`PlayerSerpent.syncPixi()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/PlayerSerpent.ts#L151)). AI has a similar, though not visually distinct, safe zone.
* **Growth:**
  * **Orbs:** Consume scattered orbs ([`Orb.ts`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Orb.ts)) to grow longer and score points. Orbs have different tiers ([`ORB_TIER_CONFIG`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/types.ts)) providing varying growth ([`PLAYER_LENGTH_PER_ORB`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/types.ts)) and score. AI growth per orb is simpler ([`AISerpent.eatOrb()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/AISerpent.ts)).
  * **Defeating AI:** Eliminating an AI opponent rewards the player with growth and score (handled in [`Game.absorbSnake()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Game.ts) called by [`resolveCollisions`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/CollisionSystem.ts)).
* **Speed:**
  * Your serpent starts at a base speed ([`PLAYER_INITIAL_SPEED`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/types.ts)) and gets faster as it grows longer ([`PlayerSerpent.update()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/PlayerSerpent.ts#L337) adjusts [`baseSpeed`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Serpent.ts#L13) based on length).
  * AI speed also scales with length ([`AISerpent.update()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/AISerpent.ts#L84)).
  * Eating orbs grants a temporary speed boost ([`PLAYER_EAT_SPEED_BOOST`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/types.ts), [`PLAYER_EAT_SPEED_BOOST_DURATION_MS`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/types.ts)) managed by [`targetSpeed`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Serpent.ts#L13) and [`speedBoostTimer`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Serpent.ts#L13) in [`Serpent.update()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Serpent.ts#L224).

**AI Opponents:**

* **Multiple Rivals:** You share the world with several AI-controlled serpents ([`AI_COUNT`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/aiConstants.ts), spawned in [`EntityManager.spawnAI()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/EntityManager.ts#L8)).
* **Varied Behaviors:** AI serpents exhibit different behaviors controlled by states like `GATHER`, `HUNT`, `EVADE` ([`AIController.ts`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/AIController.ts#L105)).
* **Skill Levels:** AI uses noise ([`AI_NOISE`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/aiConstants.ts)) for less predictable movement and has logic to avoid collisions ([`AIController.avoidCollisions()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/AIController.ts)).

**Collisions & Death:**

* **Your Demise:** Your game ends if your serpent's head collides with:
  * Any part of *your own* body (excluding the safe neck segments).
  * Any part of an *enemy* serpent's body.
    (Handled by [`resolveCollisions`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/CollisionSystem.ts#L123) calling [`killCb`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Game.ts#L991)).
* **AI Demise:** An AI serpent is destroyed if its head collides with *your* serpent's body or another AI's body (Handled by [`resolveCollisions`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/CollisionSystem.ts#L123)).
* **Removal:** Destroyed AI serpents are removed from the game ([`Game.killSnake()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Game.ts#L991) calls [`EntityManager.removeAISerpent()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/EntityManager.ts)). (Note: Respawning logic is not currently detailed in the provided codebase).

**Visuals & Feedback:**

* **Neon Aesthetic:** Bright, glowing visuals for serpents ([`PlayerSerpent.syncPixi()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/PlayerSerpent.ts#L60), [`AISerpent.syncPixi()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/AISerpent.ts#L122)), orbs, and effects against a darker background.
* **Serpent Appearance:** Rendered as smooth, glowing lines with rounded heads and eyes indicating direction ([`PlayerSerpent.syncPixi()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/PlayerSerpent.ts#L224), [`AISerpent.syncPixi()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/AISerpent.ts#L264)).
* **Eating Effects:** Consuming an orb triggers a brief glow/flash ([`glowFrames`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Serpent.ts#L13) used in `syncPixi`) and a visual pulse effect travels down the body ([`PlayerSerpent.syncPixi()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/PlayerSerpent.ts#L103) calculates pulse based on `eatQueue`). Particle effects might also occur (implementation details not fully shown).
* **Death Effects:** Dying serpents are removed visually ([`Serpent.destroyPixi()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Serpent.ts#L54)). Particle effects might accompany this.

**Game Flow & UI:**

* **States:** The game likely cycles through states like `Menu`, `Playing`, `Paused`, `Game Over` (managed within [`Game.ts`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Game.ts)).
* **Menu:** Handled by [`UIManager`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/UI.ts).
* **Pause:** Triggered by `Space`/`Escape` or UI button, handled by [`InputHandler`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/InputHandler.ts) and [`UIManager`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/UI.ts).
* **Game Over:** Triggered on player death ([`Game.gameOver()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Game.ts)), displays score via [`UIManager`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/UI.ts).

```//
## Neon Serpent: Gameplay Overview

**Concept:** Neon Serpent thrusts you into a vibrant, endlessly wrapping world as a glowing serpent. It's a modern evolution of the classic snake game, challenging your reflexes against AI opponents in a visually rich environment.

**Objective:** Your primary goal is survival and growth. Navigate the expansive world, consuming glowing orbs to increase your serpent's length and accumulate score. The longer you survive and the more you consume, the higher your score climbs.

**The World:**

*   **Expansive & Wrapping:** The game takes place in a very large, square arena. There are no walls; moving off one edge instantly transports you to the opposite side ([`wrap()` in `src/utils.ts`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/utils.ts), used in [`Serpent.update()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Serpent.ts#L197)), creating a seamless, continuous space.
*   **2.5D Parallax Background:** A dynamic video plays in the background ([`index.html`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/index.html#L15)), featuring a scene like a futuristic cave city. This background scrolls at a different rate than the foreground gameplay (parallax effect), creating a sense of depth.

**Controlling Your Serpent:**

*   **Continuous Movement:** Your serpent is always in motion ([`Game.update()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Game.ts#L707) calls [`player.update()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/PlayerSerpent.ts#L337)), gliding smoothly in its current direction.
*   **Keyboard:** Use `WASD` or the `Arrow Keys` to dictate the direction you want your serpent to turn towards (handled by [`InputHandler`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/InputHandler.ts)).
*   **Touch (Virtual Joystick):** On touch devices, tap and hold to activate a virtual joystick. Drag to set the desired heading. Releasing maintains the last direction (handled by [`InputHandler`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/InputHandler.ts) and [`UIManager`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/UI.ts)). A small deadzone prevents micro-movements.

**Core Mechanics:**

*   **Turning:**
    *   You can't instantly reverse (180 degrees) direction (checked in [`PlayerSerpent.attemptTurn()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/PlayerSerpent.ts)).
    *   There's a brief cooldown period after each turn ([`KEYBOARD_TURN_COOLDOWN_MS`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/types.ts), [`JOYSTICK_TURN_COOLDOWN_MS`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/types.ts)) preventing overly rapid movements.
    *   **Smart Collision Avoidance (Safe Neck):** The game prevents turns that would cause immediate self-collision. A number of segments behind the head ([`MAX_NECK_SKIP_SEGMENTS`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/types.ts)) are ignored during collision checks ([`resolveCollisions`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/CollisionSystem.ts)). The player serpent visually renders these segments differently ([`safeNeckColor`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/PlayerSerpent.ts#L77) in [`PlayerSerpent.syncPixi()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/PlayerSerpent.ts#L151)). AI has a similar, though not visually distinct, safe zone.
*   **Growth:**
    *   **Orbs:** Consume scattered orbs ([`Orb.ts`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Orb.ts)) to grow longer and score points. Orbs have different tiers ([`ORB_TIER_CONFIG`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/types.ts)) providing varying growth ([`PLAYER_LENGTH_PER_ORB`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/types.ts)) and score. AI growth per orb is simpler ([`AISerpent.eatOrb()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/AISerpent.ts)).
    *   **Defeating AI:** Eliminating an AI opponent rewards the player with growth and score (handled in [`Game.absorbSnake()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Game.ts) called by [`resolveCollisions`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/CollisionSystem.ts)).
*   **Speed:**
    *   Your serpent starts at a base speed ([`PLAYER_INITIAL_SPEED`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/types.ts)) and gets faster as it grows longer ([`PlayerSerpent.update()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/PlayerSerpent.ts#L337) adjusts [`baseSpeed`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Serpent.ts#L13) based on length).
    *   AI speed also scales with length ([`AISerpent.update()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/AISerpent.ts#L84)).
    *   Eating orbs grants a temporary speed boost ([`PLAYER_EAT_SPEED_BOOST`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/types.ts), [`PLAYER_EAT_SPEED_BOOST_DURATION_MS`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/types.ts)) managed by [`targetSpeed`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Serpent.ts#L13) and [`speedBoostTimer`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Serpent.ts#L13) in [`Serpent.update()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Serpent.ts#L224).

**AI Opponents:**

*   **Multiple Rivals:** You share the world with several AI-controlled serpents ([`AI_COUNT`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/aiConstants.ts), spawned in [`EntityManager.spawnAI()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/EntityManager.ts#L8)).
*   **Varied Behaviors:** AI serpents exhibit different behaviors controlled by states like `GATHER`, `HUNT`, `EVADE` ([`AIController.ts`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/AIController.ts#L105)).
*   **Skill Levels:** AI uses noise ([`AI_NOISE`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/aiConstants.ts)) for less predictable movement and has logic to avoid collisions ([`AIController.avoidCollisions()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/AIController.ts)).

**Collisions & Death:**

*   **Your Demise:** Your game ends if your serpent's head collides with:
    *   Any part of *your own* body (excluding the safe neck segments).
    *   Any part of an *enemy* serpent's body.
    (Handled by [`resolveCollisions`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/CollisionSystem.ts#L123) calling [`killCb`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Game.ts#L991)).
*   **AI Demise:** An AI serpent is destroyed if its head collides with *your* serpent's body or another AI's body (Handled by [`resolveCollisions`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/CollisionSystem.ts#L123)).
*   **Removal:** Destroyed AI serpents are removed from the game ([`Game.killSnake()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Game.ts#L991) calls [`EntityManager.removeAISerpent()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/EntityManager.ts)). (Note: Respawning logic is not currently detailed in the provided codebase).

**Visuals & Feedback:**

*   **Neon Aesthetic:** Bright, glowing visuals for serpents ([`PlayerSerpent.syncPixi()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/PlayerSerpent.ts#L60), [`AISerpent.syncPixi()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/AISerpent.ts#L122)), orbs, and effects against a darker background.
*   **Serpent Appearance:** Rendered as smooth, glowing lines with rounded heads and eyes indicating direction ([`PlayerSerpent.syncPixi()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/PlayerSerpent.ts#L224), [`AISerpent.syncPixi()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/AISerpent.ts#L264)).
*   **Eating Effects:** Consuming an orb triggers a brief glow/flash ([`glowFrames`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Serpent.ts#L13) used in `syncPixi`) and a visual pulse effect travels down the body ([`PlayerSerpent.syncPixi()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/PlayerSerpent.ts#L103) calculates pulse based on `eatQueue`). Particle effects might also occur (implementation details not fully shown).
*   **Death Effects:** Dying serpents are removed visually ([`Serpent.destroyPixi()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Serpent.ts#L54)). Particle effects might accompany this.

**Game Flow & UI:**

*   **States:** The game likely cycles through states like `Menu`, `Playing`, `Paused`, `Game Over` (managed within [`Game.ts`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Game.ts)).
*   **Menu:** Handled by [`UIManager`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/UI.ts).
*   **Pause:** Triggered by `Space`/`Escape` or UI button, handled by [`InputHandler`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/InputHandler.ts) and [`UIManager`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/UI.ts).
*   **Game Over:** Triggered on player death ([`Game.gameOver()`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/Game.ts)), displays score via [`UIManager`](/Users/kosta/Documents/ProjectsCode/NeonSerpent_WebGL/src/UI.ts).
```
