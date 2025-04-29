// Define a simple bounding box interface for entities
interface Bounds {
    x: number;
    y: number;
    radius?: number; // For circular objects like heads, orbs
    width?: number;  // For rectangular objects (optional)
    height?: number; // For rectangular objects (optional)
}

// Define the type for entities stored in the grid
// Using 'any' for now, but could be refined to specific entity types (Orb, PlayerSerpent, AISerpent, Segment)
type Entity = any;

export class SpatialHashGrid {
    private worldWidth: number;
    private worldHeight: number;
    private halfWidth: number;
    private halfHeight: number;
    private cellSize: number;
    private grid: Map<string, Set<Entity>>;

    /**
     * Creates a Spatial Hash Grid.
     * @param worldWidth The total width of the toroidal world.
     * @param worldHeight The total height of the toroidal world.
     * @param cellSize The size of each grid cell. Should be large enough to contain typical interacting objects.
     */
    constructor(worldWidth: number, worldHeight: number, cellSize: number) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.halfWidth = worldWidth / 2;
        this.halfHeight = worldHeight / 2;
        this.cellSize = cellSize;
        this.grid = new Map<string, Set<Entity>>();
        console.log(`SpatialHashGrid created: ${worldWidth}x${worldHeight}, CellSize: ${cellSize}`);
    }

    /** Clears all entities from the grid. Call this at the beginning of each update cycle. */
    clear(): void {
        this.grid.clear();
    }

    /** Helper to wrap coordinates for toroidal world */
    private wrapCoord(value: number, max: number, halfMax: number): number {
        if (value > halfMax) return value - max;
        if (value < -halfMax) return value + max;
        return value;
    }

    /** Helper to get cell coordinates from world coordinates */
    private getCellCoords(x: number, y: number): { cellX: number; cellY: number } {
        // Wrap coordinates first to handle entities near the edge correctly
        const wrappedX = this.wrapCoord(x, this.worldWidth, this.halfWidth);
        const wrappedY = this.wrapCoord(y, this.worldHeight, this.halfHeight);
        // Calculate cell index based on wrapped coordinates
        const cellX = Math.floor((wrappedX + this.halfWidth) / this.cellSize);
        const cellY = Math.floor((wrappedY + this.halfHeight) / this.cellSize);
        return { cellX, cellY };
    }

    /** Helper to generate the grid key string */
    private getKey(cellX: number, cellY: number): string {
        return `${cellX}_${cellY}`;
    }

    /**
     * Inserts an entity into the grid based on its bounds.
     * Handles world wrapping by inserting into cells across edges if necessary.
     * @param entity The entity to insert (can be any type).
     * @param bounds The bounding area of the entity.
     */
    insert(entity: Entity, bounds: Bounds): void {
        const radius = bounds.radius ?? Math.max(bounds.width ?? 0, bounds.height ?? 0) / 2; // Use radius or estimate from width/height
        const minX = bounds.x - radius;
        const maxX = bounds.x + radius;
        const minY = bounds.y - radius;
        const maxY = bounds.y + radius;

        const startCell = this.getCellCoords(minX, minY);
        const endCell = this.getCellCoords(maxX, maxY);

        for (let cx = startCell.cellX; cx <= endCell.cellX; cx++) {
            for (let cy = startCell.cellY; cy <= endCell.cellY; cy++) {
                const key = this.getKey(cx, cy);
                if (!this.grid.has(key)) {
                    this.grid.set(key, new Set<Entity>());
                }
                this.grid.get(key)!.add(entity); // Use non-null assertion
            }
        }

        // --- Handle World Wrapping ---
        // Check if the bounds cross the world edges and insert into wrapped cells if needed.
        // This basic implementation might double-insert if an object spans more than half the world width/height in a dimension,
        // but that's unlikely for snake segments/orbs. A more robust solution might check wrap explicitly.

        // Example: If minX < -halfWidth and maxX > -halfWidth (crosses left edge)
        // Need to calculate wrapped coordinates and insert into cells on the right side too.
        // Similar logic for right, top, and bottom edges.

        // Simplified wrap check: If start/end cells are far apart, assume wrap
        const maxCellX = Math.floor(this.worldWidth / this.cellSize);
        const maxCellY = Math.floor(this.worldHeight / this.cellSize);

        const checkWrap = (start: number, end: number, maxCell: number): boolean => {
             // A large difference might indicate wrapping, especially if cellSize is small relative to world
             // This is a heuristic and might need refinement.
             return Math.abs(end - start) > maxCell / 2;
        };

        const wrapX = checkWrap(startCell.cellX, endCell.cellX, maxCellX);
        const wrapY = checkWrap(startCell.cellY, endCell.cellY, maxCellY);

        if (wrapX || wrapY) {
            // If wrapping is detected, iterate through all potentially wrapped cells
            // This is less efficient but simpler than precise wrap calculation for now.
            const wrappedMinX = this.wrapCoord(minX, this.worldWidth, this.halfWidth);
            const wrappedMaxX = this.wrapCoord(maxX, this.worldWidth, this.halfWidth);
            const wrappedMinY = this.wrapCoord(minY, this.worldHeight, this.halfHeight);
            const wrappedMaxY = this.wrapCoord(maxY, this.worldHeight, this.halfHeight);

            const wrappedStartCell = this.getCellCoords(wrappedMinX, wrappedMinY);
            const wrappedEndCell = this.getCellCoords(wrappedMaxX, wrappedMaxY);

            // Iterate potentially wrapped cells (might overlap with non-wrapped loop)
            for (let cx = wrappedStartCell.cellX; cx <= wrappedEndCell.cellX; cx++) {
                for (let cy = wrappedStartCell.cellY; cy <= wrappedEndCell.cellY; cy++) {
                     // Handle cell index wrapping if necessary (e.g., cx < 0 or cx >= maxCellX)
                     const finalCX = (cx + maxCellX) % maxCellX;
                     const finalCY = (cy + maxCellY) % maxCellY;
                     const key = this.getKey(finalCX, finalCY);
                     if (!this.grid.has(key)) {
                         this.grid.set(key, new Set<Entity>());
                     }
                     this.grid.get(key)!.add(entity);
                }
            }
        }
    }

    /**
     * Queries the grid to find potential colliders within the given bounds.
     * Handles world wrapping for the query area.
     * @param bounds The bounding area to query.
     * @returns A Set of unique entities found in the overlapping cells.
     */
    query(bounds: Bounds): Set<Entity> {
        const results = new Set<Entity>();
        const radius = bounds.radius ?? Math.max(bounds.width ?? 0, bounds.height ?? 0) / 2;
        const minX = bounds.x - radius;
        const maxX = bounds.x + radius;
        const minY = bounds.y - radius;
        const maxY = bounds.y + radius;

        const startCell = this.getCellCoords(minX, minY);
        const endCell = this.getCellCoords(maxX, maxY);

        const maxCellX = Math.floor(this.worldWidth / this.cellSize);
        const maxCellY = Math.floor(this.worldHeight / this.cellSize);

        for (let cx = startCell.cellX; cx <= endCell.cellX; cx++) {
            for (let cy = startCell.cellY; cy <= endCell.cellY; cy++) {
                 // Handle cell index wrapping for the query
                 const finalCX = (cx + maxCellX) % maxCellX;
                 const finalCY = (cy + maxCellY) % maxCellY;
                 const key = this.getKey(finalCX, finalCY);

                if (this.grid.has(key)) {
                    this.grid.get(key)!.forEach(entity => results.add(entity));
                }
            }
        }
        return results;
    }
}

export default SpatialHashGrid;
