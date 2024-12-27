export class Vector {
  x: number;
  y: number;

  constructor(x?: number, y?: number) {
    this.x = x || 0;
    this.y = y || 0;
  }

  add(v: Vector): Vector {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  subtract(v: Vector): Vector {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  scale(scalar: number): Vector {
    this.x *= scalar;
    this.y *= scalar;
    return this
    
  }

  magnitude(): number {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }

  normalize(): Vector {
    const mag = this.magnitude();
    return mag === 0 ? new Vector(0, 0) : this.scale(1 / mag);
  }

  dot(v: Vector): number {
    return this.x * v.x + this.y * v.y;
  }
  limit(max: number): Vector {
    const mag = this.magnitude();
    if (mag > max) {
      return this.normalize().scale(max);
    }
    return this;
  }

  toString(): string {
    return `Vector(${this.x}, ${this.y})`;
  }
}
