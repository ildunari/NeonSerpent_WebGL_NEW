import { SnakeState, segRadius } from './types';
import { dist, distTorus } from './utils';
import EntityManager from './EntityManager';
import SpatialHashGrid from './SpatialHashGrid'; // Import the grid
import PlayerSerpent from './PlayerSerpent'; // Import for instanceof check
import AISerpent from './AISerpent'; // Import for instanceof check

// Define callback function types for clarity
type KillCallback = (snake: SnakeState) => void;
type AbsorbCallback = (winner: SnakeState, loser: SnakeState) => void;

/**
 * Resolves collisions between snake heads and bodies.
 * @param manager The EntityManager instance containing all game entities.
 * @param worldW The width of the game world.
 * @param worldH The height of the game world.
 * @param killCb Callback function to execute when a snake should be killed.
 * @param absorbCb Callback function to execute when a snake absorbs another.
 * @param grid Optional SpatialHashGrid for optimized querying.
 */
export function resolveCollisions(
    manager: EntityManager,
    worldW: number, // No longer prefixed as unused
    worldH: number, // No longer prefixed as unused
    killCb: KillCallback,
    absorbCb: AbsorbCallback,
    grid?: SpatialHashGrid | null // Make grid optional
): void {
    const snakes = manager.getAllSnakes();
    const checkedPairs = new Set<string>(); // For head-on checks

    // --- Head vs Body Collisions ---
    snakes.forEach(attacker => {
        if (!attacker.visible) return;

        const head = attacker.segs[0];
        const atkRad = segRadius(attacker.length);
        const queryBounds = { x: head.x, y: head.y, radius: atkRad * 2 }; // Query slightly larger area

        // Query potential colliders using the grid if available, otherwise check all snakes
        const potentialColliders = grid ? grid.query(queryBounds) : new Set(snakes);

        potentialColliders.forEach(collider => {
            // Ensure collider is a snake, is visible, and is not the attacker itself
            if (!(collider instanceof PlayerSerpent || collider instanceof AISerpent) || !collider.visible || collider === attacker) {
                return;
            }

            const victim = collider as SnakeState; // Cast to SnakeState for segment access

            // Check collision against victim's body segments (skip neck)
            const victimRad = segRadius(victim.length);
            // Determine skipCount based on victim type
            const skipCount = (victim instanceof PlayerSerpent)
                                ? victim.calculateSkipSegments() // Player uses its method
                                : 6; // AI uses a fixed skip count

            for (let idx = skipCount; idx < victim.segs.length; idx++) {
                const seg = victim.segs[idx];
                if (!seg) continue; // Safety check

                if (distTorus(head, seg, worldW, worldH) < atkRad + victimRad) {
                    // Determine outcome based on attacker/victim types
                    if (attacker.isPlayer) { // Player head hits AI body
                        killCb(attacker);
                    } else if (victim.isPlayer) { // AI head hits Player body
                        killCb(attacker);
                        absorbCb(victim, attacker);
                    } else { // AI head hits other AI body
                        killCb(attacker);
                        absorbCb(victim, attacker);
                    }
                    // Exit loops for this attacker once a collision is resolved
                    return; // Exit potentialColliders.forEach for this attacker
                }
            }
             // If attacker died during the inner loop, stop checking further victims for this attacker
             if (!attacker.visible) return; // Exit potentialColliders.forEach early
        });
    });

    // --- Head-on Collisions ---
    snakes.forEach(s1 => {
        if (!s1.visible) return;

        const head1 = s1.segs[0];
        const rad1 = segRadius(s1.length);
        const queryBoundsHead = { x: head1.x, y: head1.y, radius: rad1 * 2 };

        const potentialHeadColliders = grid ? grid.query(queryBoundsHead) : new Set(snakes);

        potentialHeadColliders.forEach(collider => {
            // Ensure collider is a snake, is visible, and not s1 itself
            if (!(collider instanceof PlayerSerpent || collider instanceof AISerpent) || !collider.visible || collider === s1) {
                return;
            }
            const s2 = collider as SnakeState;

            // Prevent double-checking pairs
            const pairKey = s1.id < s2.id ? `${s1.id}-${s2.id}` : `${s2.id}-${s1.id}`;
            if (checkedPairs.has(pairKey)) {
                return;
            }
            checkedPairs.add(pairKey);

            const head2 = s2.segs[0];
            const rad2 = segRadius(s2.length);

            // Use simple distance for head-on check (torus might be overkill here)
            if (dist(head1, head2) < rad1 + rad2) {
                // Head-on collision: Determine outcome
                if (s1.length > s2.length + 5) { // s1 significantly longer
                    killCb(s2);
                    absorbCb(s1, s2);
                } else if (s2.length > s1.length + 5) { // s2 significantly longer
                    killCb(s1);
                    absorbCb(s2, s1);
                } else { // Similar length or exact tie: both die
                    killCb(s1);
                    killCb(s2);
                }
                 // Exit early if s1 died
                 if (!s1.visible) return;
            }
        });
    });
}
