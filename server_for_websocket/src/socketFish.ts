import { SpatialHash } from "./grid";
import { SerializedFish } from "./server";
import { distanceBetween } from "./utils";
import { Vector } from "./vector";

export class Fish {
  //THESE ARE THE FISH THAT RUN ON THE NODE SERVER
  acc: Vector = new Vector(0, 0);
  vel: Vector = new Vector(Math.random() - 0.5, Math.random() - 0.5);

  lastVel: Vector = new Vector();
  lastPos: Vector = new Vector();

  fishType: number;
  grid: SpatialHash<Fish>;
  fishICanSee: Fish[] = [];
  fishICanTouch: Fish[] = [];
  fishOfMyTypeICanSee: Fish[] = [];
  fishOfOtherTypeICanSee: Fish[] = [];
  x: number = 0;
  y: number = 0;

  time: number = 0;

  limitX: number;
  limitY: number;
  maxVel: number;
  maxAcc: number;

  worldWidth: number;
  worldHeight: number;
  cohesionFactor: number;
  alignmentFactor: number;
  separationFactor: number;
  escapeFromOtherFishFactor: number;

  constructor(
    x: number,
    y: number,
    tileIndex: number,
    grid: SpatialHash<Fish>,
    worldWidth: number,
    worldHeight: number,
    cohesionFactor: number = 0.22,
    alignmentFactor: number = 0.6,
    separationFactor: number = 0.33,
    escapeFromOtherFishFactor: number = 0.2
  ) {
    this.cohesionFactor = cohesionFactor;
    this.alignmentFactor = alignmentFactor;
    this.separationFactor = separationFactor;
    this.escapeFromOtherFishFactor = escapeFromOtherFishFactor;

    this.x = x;
    this.y = y;
    this.worldHeight = worldHeight;
    this.worldWidth = worldWidth;

    this.grid = grid;

    this.fishType = tileIndex;
    this.maxVel = Math.random() + 1;
    this.maxAcc = Math.random() * 0.066 + 0.066;

    this.limitX = worldWidth;
    this.limitY = worldHeight - 300;
  }

  applyForce(force: Vector): void {
    this.acc.add(force);
  }

  alignment() {
    if (!this.fishOfMyTypeICanSee.length) return;

    const strength = this.alignmentFactor;
    const avgVel = new Vector(0, 0);

    for (const other of this.fishOfMyTypeICanSee) {
      avgVel.add(other.vel);
    }

    avgVel.scale(1 / this.fishOfMyTypeICanSee.length);
    avgVel.normalize().scale(strength);
    this.applyForce(avgVel);
  }

  cohesion() {
    if (!this.fishOfMyTypeICanSee.length) return;
    const strength = this.cohesionFactor;
    const center = new Vector(0, 0);

    for (const other of this.fishOfMyTypeICanSee) {
      center.add(new Vector(other.x, other.y));
    }

    center.scale(1 / this.fishOfMyTypeICanSee.length);
    const steer = center
      .subtract(new Vector(this.x, this.y))
      .normalize()
      .scale(strength);
    this.applyForce(steer);
  }

  separation() {
    if (!this.fishICanTouch.length) return;
    const strength = this.separationFactor;
    const steer = new Vector(0, 0);

    for (const other of this.fishICanTouch) {
      const dist = distanceBetween(this.x, this.y, other.x, other.y);
      if (dist > 0) {
        const diff = new Vector(this.x - other.x, this.y - other.y);
        diff.scale(1 / dist);
        steer.add(diff);
      }
    }

    steer.scale(1 / this.fishICanTouch.length);
    steer.normalize().scale(strength);
    this.applyForce(steer);
  }

  getFishCloseToMe() {
    this.fishICanTouch = this.grid
      .query(this.x, this.y, 20)
      .filter((k) => k != this);

    this.fishICanSee = this.grid
      .query(this.x, this.y, 266)
      .filter((k) => k != this);

    //BACKGROUND FISH DONT CARE ABOUT FISH THEIR TYPE
    this.fishOfMyTypeICanSee = this.fishICanSee.filter(
      (k) => k.fishType == this.fishType
    );

    this.fishOfOtherTypeICanSee = this.fishICanSee.filter(
      (k) => !this.fishOfMyTypeICanSee.includes(k)
    );

    // console.log(this.fishOfMyTypeICanSee)
  }

  stayWithinBounds(minX: number, minY: number, maxX: number, maxY: number) {
    const marginX = 0;
    const marginY = 0;
    const turnForce = 1.41;

    const force = new Vector(0, 0);

    if (this.x < minX + marginX) {
      force.x = turnForce;
    } else if (this.x > maxX - marginX) {
      force.x = -turnForce;
    }

    if (this.y < minY + marginY) {
      force.y = turnForce;
    } else if (this.y > maxY - marginY) {
      force.y = -turnForce;
    }

    this.applyForce(force);
  }

  move() {
    //ADD THE ACCELERATION TO THE VELOCITY VECTOR, THEN THE VEL TO THE POSITION.
    //ACCELERATION RESETS ON EACH FRAME BC THIS IS A SIMPLIFICAION :)
    //MASS IS ALWAYS THE SAME, AND FORCE WON'T BE APPLIED CONTINUOUSLY

    this.acc.limit(this.maxAcc);
    this.vel.add(this.acc);

    this.acc.scale(0.5); //IF I SET IT TO 0 THEY TURN TOO FAST
    this.vel.limit(this.maxVel);
    this.x += this.vel.x;
    this.y += this.vel.y;
    this.vel.scale(0.99);
  }

  update(time: number) {
    this.time = time;
    //EACH FISH RE INSERTS ITSELF IN THE GRID
    this.grid.insert(this);

    // if (!this.connectedToSocket) {
    this.getFishCloseToMe();

    //BOIDS ALGORITHM / CLOCKING SIMULATOR / FISH SCHOOLING
    this.alignment();
    this.separation();
    this.cohesion();

    //ALSO THE FISH WILL REPEL FISH THAT ARE NOT THEIR TYPE
    this.repelOtherFish();
    //AND MOVE RANDOMLY IF THERE'S NO OTHER FISH CLOSE TO THEM
    this.moveRandomly();
    //IF THEY'RE LEAVING THE WORLD, MAKE THEM COME BACK
    this.stayWithinBounds(-50, -50, this.limitX, this.limitY);
    //APPLY THE FORCES, UPDATE VELOCITY VECTOR, POSITION VECTOR, ETC, NEWTON STUFF
    this.move();
  }

  repelOtherFish() {
    if (!this.fishOfOtherTypeICanSee.length) return;
    const strength = this.escapeFromOtherFishFactor;
    const center = new Vector(0, 0);

    for (const other of this.fishOfOtherTypeICanSee) {
      center.add(new Vector(other.x, other.y));
    }

    center.scale(1 / this.fishOfOtherTypeICanSee.length);
    const steer = center
      .subtract(new Vector(this.x, this.y))
      .normalize()
      .scale(-strength);
    this.applyForce(steer);
  }

  moveRandomly() {
    if (
      this.fishOfMyTypeICanSee.length ||
      this.fishOfOtherTypeICanSee.length ||
      this.fishICanTouch.length
    )
      return;

      // console.log("moveRandomly")
    let x = Math.sin(this.time * 0.001) + (Math.random() - 0.5) * 0.01;
    let y = Math.cos(this.time * 0.001) + (Math.random() - 0.5) * 0.01;

    this.applyForce(new Vector(x, y));
  }

  serialize(): SerializedFish {
    return {
      x: this.x,
      y: this.y,
      vx: this.vel.x,
      vy: this.vel.y,
      type: this.fishType,
    };
  }


}
