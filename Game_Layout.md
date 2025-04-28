## Neon Serpent: Gameplay Overview

**Concept:** Neon Serpent thrusts you into a vibrant, endlessly wrapping world as a glowing serpent. It's a modern evolution of the classic snake game, challenging your reflexes against AI opponents in a visually rich environment.

**Objective:** Your primary goal is survival and growth. Navigate the expansive world, consuming glowing orbs to increase your serpent's length and accumulate score. The longer you survive and the more you consume, the higher your score climbs.

**The World:**

*   **Expansive & Wrapping:** The game takes place in a very large, square arena. There are no walls; moving off one edge instantly transports you to the opposite side, creating a seamless, continuous space.
*   **2.5D Parallax Background:** A dynamic video plays in the background, featuring a scene like a futuristic cave city. This background scrolls at a different rate than the foreground gameplay (parallax effect), creating a sense of depth and a 2.5D visual experience as you move the camera.
*   **World Boundary:** While the world wraps, a faint, dashed red line indicates the world's logical boundaries, helping you orient yourself within the vast space.

**Controlling Your Serpent:**

*   **Continuous Movement:** Your serpent is always in motion, gliding smoothly in its current direction.
*   **Keyboard:** Use `WASD` or the `Arrow Keys` to dictate the direction you want your serpent to turn towards.
*   **Touch (Virtual Joystick):** On touch devices, simply tap and hold anywhere on the screen. A visual joystick base appears at your touch point. Drag your finger away from the center; a knob follows your finger (clamped within a visual radius). The direction you drag determines your serpent's desired heading. Releasing your finger deactivates the joystick but maintains your serpent's last direction. A small deadzone near the center prevents accidental micro-movements.

**Core Mechanics:**

*   **Turning:**
    *   You can't instantly reverse (180 degrees) direction.
    *   There's a brief cooldown period after each turn, preventing overly rapid, zig-zag movements. The cooldown is slightly different and generally shorter for touch input compared to keyboard input, allowing for more responsive touch steering.
    *   **Smart Collision Avoidance:** The game intelligently prevents you from making a turn that would cause your serpent's head to immediately collide with its own body. It looks ahead slightly and ignores a calculated number of segments right behind the head (this "safe neck" length depends on your current speed) before allowing a turn into that space.
*   **Growth:**
    *   **Orbs:** Consume scattered orbs to grow longer and score points. Orbs come in different rarities (common, uncommon, rare), with rarer orbs providing significantly more growth and score.
    *   **Defeating AI:** Eliminating an AI opponent also rewards you with substantial growth and adds their score to yours.
*   **Speed:** Your serpent starts at a base speed and gradually gets faster as it grows longer, increasing the challenge naturally over time.

**AI Opponents:**

*   **Multiple Rivals:** You share the world with several other AI-controlled serpents.
*   **Varied Personalities:** AI serpents exhibit different behaviors:
    *   `Gather`: Primarily focus on collecting nearby orbs.
    *   `Hunt`: Aggressively seek out other serpents (including you).
    *   `Coward`: Tend to flee from larger serpents while gathering orbs when safe.
*   **Skill Levels:** AI serpents have varying skill levels, affecting their reaction speed and how accurately they pursue targets (lower skill AI might "wobble" more). They also have logic to avoid crashing into the player's tail segments.

**Collisions & Death:**

*   **Your Demise:** Your game ends if your serpent's head collides with:
    *   Any part of *your own* body (excluding the safe neck segments).
    *   Any part of an *enemy* serpent's body (excluding their short safe neck segments).
*   **AI Demise:** An AI serpent is destroyed if its head collides with *your* serpent's body (beyond a few initial segments).
*   **Respawning:** Destroyed AI serpents are removed from the game but will eventually respawn elsewhere in the world to maintain pressure.

**Visuals & Feedback:**

*   **Neon Aesthetic:** The game features bright, glowing visuals for serpents, orbs, and effects, set against the darker, detailed background.
*   **Serpent Appearance:** Serpents are rendered smoothly, appearing as continuous, glowing lines with rounded heads. Player eyes indicate the current direction of travel.
*   **Eating Effects:** When you consume an orb, your serpent briefly flashes brighter, and a visible "pulse" or wave travels down its body from head to tail. Particle effects also burst from the point of consumption.
*   **Death Effects:** When a serpent dies, it disappears, often accompanied by a burst of particles.

**Game Flow & UI:**

*   **States:** The game cycles through clear states: `Menu`, `Playing`, `Paused`, and `Game Over`.
*   **Menu:** Start, view controls, or (if applicable) resume/restart. Navigate with keys or clicks/taps.
*   **Pause:** Press `Space` or `Escape` (or tap the pause overlay) during gameplay to pause. The game freezes, and a simple overlay appears. Resume via keypress or tap.
*   **Game Over:** When you die, a "Game Over" screen shows your final score. Press `Space`/`Enter` or tap the overlay to return to the main menu.