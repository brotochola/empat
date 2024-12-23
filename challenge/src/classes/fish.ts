import { Game } from "../scenes/Game";
import { SpatialHash } from "./grid";

export class Fish extends Phaser.GameObjects.Sprite {
  acc: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  vel: Phaser.Math.Vector2 = new Phaser.Math.Vector2(
    Math.random() - 0.5,
    Math.random() - 0.5
  );
  fishType: number;
  grid: SpatialHash<Fish>;
  fishICanSee: Fish[] = [];
  fishICanTouch: Fish[] = [];
  fishOfMyTypeICanSee: Fish[] = [];
  scene: Game;

  constructor(
    scene: Game,
    x: number,
    y: number,
    tilesetKey: string,
    tileIndex: number,
    grid: SpatialHash<Fish>
  ) {
    super(scene, x, y, tilesetKey, tileIndex);
    this.grid = grid;
    this.scene = scene;

    this.fishType = tileIndex;

    scene.add.existing(this);
  }

  applyForce(force: Phaser.Math.Vector2): void {
    this.acc.add(force);
  }

  alignment() {
    if (!this.fishOfMyTypeICanSee.length) return;

    const strength = 0.09;
    const avgVel = new Phaser.Math.Vector2(0, 0);

    for (const other of this.fishOfMyTypeICanSee) {
      avgVel.add(other.vel);
    }

    avgVel.scale(1 / this.fishOfMyTypeICanSee.length);
    avgVel.normalize().scale(strength); // Adjust strength of alignment force
    this.applyForce(avgVel);
  }

  cohesion() {
    if (!this.fishOfMyTypeICanSee.length) return;
    const strength = 0.025;
    const center = new Phaser.Math.Vector2(0, 0);

    for (const other of this.fishOfMyTypeICanSee) {
      center.add(new Phaser.Math.Vector2(other.x, other.y));
    }

    center.scale(1 / this.fishOfMyTypeICanSee.length);
    const steer = center
      .subtract(new Phaser.Math.Vector2(this.x, this.y))
      .normalize()
      .scale(strength);
    this.applyForce(steer);
  }

  separation() {
    if (!this.fishICanTouch.length) return;
    const strength = 0.2;
    const steer = new Phaser.Math.Vector2(0, 0);

    for (const other of this.fishICanTouch) {
      const dist = Phaser.Math.Distance.Between(
        this.x,
        this.y,
        other.x,
        other.y
      );
      if (dist > 0) {
        const diff = new Phaser.Math.Vector2(
          this.x - other.x,
          this.y - other.y
        );
        diff.scale(1 / dist); // Weight by distance
        steer.add(diff);
      }
    }

    steer.scale(1 / this.fishICanTouch.length);
    steer.normalize().scale(strength);
    this.applyForce(steer);
  }

  getFishCloseToMe() {
    this.fishICanTouch = this.grid.query(this.x, this.y, 10);
    this.fishICanSee = this.grid.query(this.x, this.y, 300);
    this.fishICanSee = this.fishICanSee.filter(
      (k) => !this.fishICanTouch.includes(k)
    );

    this.fishOfMyTypeICanSee = this.fishICanSee.filter(
      (k) => k.fishType == this.fishType
    );
  }

  stayWithinBounds(minX: number, minY: number, maxX: number, maxY: number) {
    const margin = 50; // Margin from the edges to start applying the force
    const turnForce = 1; // Strength of the force

    const force = new Phaser.Math.Vector2(0, 0);

    if (this.x < minX + margin) {
      force.x = turnForce;
    } else if (this.x > maxX - margin) {
      force.x = -turnForce;
    }

    if (this.y < minY + margin) {
      force.y = turnForce;
    } else if (this.y > maxY - margin) {
      force.y = -turnForce;
    }

    this.applyForce(force);
  }

  move() {
    //ADD THE ACCELERATION TO THE VELOCITY VECTOR, THEN THE VEL TO THE POSITION.
    //ACCELERATION RESETS ON EACH FRAME BC THIS IS A SIMPLIFICAION :)
    //MASS IS ALWAYS THE SAME, AND FORCE WON'T BE APPLIED CONTINUOUSLY
    this.acc.limit(0.25);
    this.vel.add(this.acc);
    this.acc.set(0, 0);
    this.vel.limit(2.5);
    this.x += this.vel.x;
    this.y += this.vel.y;
    this.vel.scale(0.99);
  }

  update(time: number) {
    //EACH FISH RE INSERTS ITSELF IN THE GRID
    this.grid.insert(this);

    this.getFishCloseToMe();
    this.alignment();
    this.separation();
    this.cohesion();

    this.stayWithinBounds(
      0,
      0,
      this.scene.worldWidth,
      this.scene.worldHeight - 300
    );

    this.move();
    this.adjustAngle();
  }

  adjustAngle() {
    // Flip horizontally based on velocity direction
    this.scaleX = this.vel.x < 0 ? -1 : 1;

    // Ensure rotation stays within ±90 degrees
    const angle = Math.atan2(this.vel.y, Math.abs(this.vel.x));
    this.rotation =
      Phaser.Math.Clamp(angle, -Math.PI / 2, Math.PI / 2) * this.scaleX;

    // if (this.vel.x > 0) this.scaleX = -1;
    // this.rotation = Math.atan2(this.vel.y, this.vel.x) % Math.PI*0.5;
  }
}
