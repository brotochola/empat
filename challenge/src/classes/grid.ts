type GameObject = { x: number; y: number; [key: string]: any };

export class SpatialHash<T extends GameObject> {
  private cellSize: number;
  private grid: Map<string, T[]>;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  // Compute the key for a given position
  private getKey(x: number, y: number): string {
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    return `${col},${row}`;
  }

  // Add an object to the spatial hash
  insert(obj: T): void {
    const key = this.getKey(obj.x, obj.y);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key)!.push(obj); // Non-null assertion since we initialize if missing
    
  }

  // Retrieve objects near a position
  query(x: number, y: number, radius: number = this.cellSize): T[] {
    const minCol = Math.floor((x - radius) / this.cellSize);
    const maxCol = Math.floor((x + radius) / this.cellSize);
    const minRow = Math.floor((y - radius) / this.cellSize);
    const maxRow = Math.floor((y + radius) / this.cellSize);

    const result: T[] = [];
    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const key = `${col},${row}`;
        if (this.grid.has(key)) {
          result.push(...this.grid.get(key)!);
        }
      }
    }
    return result;
  }

  // Clear the hash (e.g., before re-inserting updated positions)
  clear(): void {
    this.grid.clear();
  }
}
