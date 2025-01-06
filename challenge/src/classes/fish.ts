import { Game } from "../scenes/Game";
import { fishSounds } from "./fishSounds";
import { SpatialHash } from "./grid";

export class Fish extends Phaser.GameObjects.Sprite {
  highlightSprite: Phaser.GameObjects.Sprite | null;
  fishSoundManager: fishSounds;
  highlighted: boolean = false;
  acc: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  vel: Phaser.Math.Vector2 = new Phaser.Math.Vector2(
    Math.random() - 0.5,
    Math.random() - 0.5
  );

  lastVel: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
  lastPos: Phaser.Math.Vector2 = new Phaser.Math.Vector2();

  fishType: number;
  grid: SpatialHash<Fish>;
  fishICanSee: Fish[] = [];
  fishICanTouch: Fish[] = [];
  fishOfMyTypeICanSee: Fish[] = [];
  fishOfOtherTypeICanSee: Fish[] = [];
  scene: Game;
  time: number;
  bgFish: boolean;
  limitX: number;
  limitY: number;
  maxVel: number;
  maxAcc: number;
  connectedToSocket: boolean;
  // maxLuckyNumbers = 20;
  // myLuckyNumber = Math.floor(Math.random() * this.maxLuckyNumbers);

  constructor(
    scene: Game,
    x: number,
    y: number,
    tilesetKey: string,
    tileIndex: number,
    grid: SpatialHash<Fish>,
    container: Phaser.GameObjects.Container | null,
    connectedToSocket: boolean
  ) {
    super(scene, x, y, tilesetKey, container ? 80 : tileIndex);

    this.fishSoundManager = new fishSounds(this);
    this.connectedToSocket = connectedToSocket;
    this.grid = grid;
    this.scene = scene;

    this.fishType = container ? 80 : tileIndex;
    this.maxVel = Math.random() + 1;
    this.maxAcc = Math.random() * 0.066 + 0.066;

    this.resetFrame();
    if (container) {
      //IT'S A BACKGROUND FISH
      this.bgFish = true;
      this.tint = 0x000055;
      container.add(this);
      this.limitX = this.scene.worldWidth + window.innerWidth;
      this.limitY = (this.scene.worldHeight - 500) * 2;
    } else {
      //IT'S AN INTERACTIVE FISH
      scene.add.existing(this);
      this.limitX = this.scene.worldWidth;
      this.limitY = this.scene.worldHeight - 300;
      this.setInteractive();

      this.on("pointerdown", (e: Event) => {
        this.handlePointerDown();
      });
    }
  }

  handlePointerDown() {
    // this.highlight();
    // console.log(this.fishType)
  }

  unhighlight() {
    if (this.highlightSprite) {
      this.highlightSprite.destroy();
      this.highlightSprite = null;
    }
    this.highlighted = false;
  }

  isSpriteInView() {
    const scroll = this.scene.scrollX;

    return this.x - scroll > 0;

    // return this.x > scroll && this.x < scroll + window.innerWidth;
  }

  highlight() {
    // console.log("#highlight", this);
    if (!this.highlightSprite) {
      this.highlightSprite = new Phaser.GameObjects.Sprite(
        this.scene,
        this.x,
        this.y,
        this.scene.textures.get("highlight")
      );

      this.scene.add.existing(this.highlightSprite);
    }
    this.highlighted = true;
    // this.setTint(0x00ff00);
  }
  resetFrame() {
    let frame = this.frame.clone();
    frame.setCutSize(64, 63);
    frame.setCutPosition(frame.cutX, frame.cutY + 1);
    this.setFrame(frame);
  }

  applyForce(force: Phaser.Math.Vector2): void {
    this.acc.add(force);
  }

  alignment() {
    if (!this.fishOfMyTypeICanSee.length) return;

    const strength = 0.3;
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
    const strength = 0.1;
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
    const strength = 0.33;
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
    this.fishICanTouch = this.grid
      .query(this.x, this.y, 10)
      .filter((k) => k != this && k.bgFish == this.bgFish);
    this.fishICanSee = this.grid
      .query(this.x, this.y, 266)
      .filter((k) => k != this)
      .filter((k) => k != this && k.bgFish == this.bgFish);

    //BACKGROUND FISH DONT CARE ABOUT FISH THEIR TYPE
    this.fishOfMyTypeICanSee = this.bgFish
      ? this.fishICanSee
      : this.fishICanSee.filter((k) => k.fishType == this.fishType);

    this.fishOfOtherTypeICanSee = this.bgFish
      ? []
      : this.fishICanSee.filter((k) => !this.fishOfMyTypeICanSee.includes(k));
  }

  stayWithinBounds(minX: number, minY: number, maxX: number, maxY: number) {
    const marginX = 0;
    const marginY = 0;
    const turnForce = 0.41;

    const force = new Phaser.Math.Vector2(0, 0);

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

    if (!this.connectedToSocket) {
      //AS A WAY TO OPTIMIZE THESE CALCULATIONS, I COULD HAVE ASSIGNED A NUMBER FROM 1 TO 4 TO EACH FISH
      //AND ONLY DO THE EXPENSIVE CALCULATIONS IF THE this.scene.frameCount%this.myNum==0
      //BUT I THINK IT'S NOT NECESSARY FOR THIS EXAMPLE
      // if (this.scene.frameCount % 2 == 0) {
      this.getFishCloseToMe();
      this.alignment();

      this.separation();
      this.cohesion();

      this.repelOtherFish();

      this.moveRandomly();
      // }

      this.stayWithinBounds(-50, -50, this.limitX, this.limitY);
      this.move();
    }
    if (this.highlighted && this.highlightSprite) {
      this.highlightSprite.x = this.x;
      this.highlightSprite.y = this.y;
    }

    this.adjustAngle();
    // if(this.vel.x<0.00001 && time>5000){
    //   debugger
    // }

    this.emitBubblesAndSound();
  }

  // emitBubblesAndSound(): void {
  //   // if (Math.random() < 0.999) return;
  //   this.playSoundOnceAWhile();
  // }

  emitBubblesAndSound() {
    if ((this.scene.frameCount + this.fishType) % 2 == 0) return;
    if (Math.random() < 0.996) return;

    // const changeVelLimit = 1.9;

    // const didChangeVelFast =
    //   Math.abs(this.lastVel.x - this.vel.x) > changeVelLimit ||
    //   Math.abs(this.lastVel.y - this.vel.y) > changeVelLimit;

    // const isItVisible=this.x

    if (this.amIInTheFrame()) {
      this.fishSoundManager.playSoundWithRandomPitch();
      this.scene.emitBubbles(this.x, this.y, Math.floor(Math.random() * 3));
    }
  }

  amIInTheFrame() {
    return this.scene.camera.worldView.contains(this.x, this.y);
  }

  repelOtherFish() {
    if (!this.fishOfOtherTypeICanSee.length) return;
    const strength = 0.3;
    const center = new Phaser.Math.Vector2(0, 0);

    for (const other of this.fishOfOtherTypeICanSee) {
      center.add(new Phaser.Math.Vector2(other.x, other.y));
    }

    center.scale(1 / this.fishOfOtherTypeICanSee.length);
    const steer = center
      .subtract(new Phaser.Math.Vector2(this.x, this.y))
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

    let x =
      Math.sin(this.time * 0.001 + Math.random()) +
      (Math.random() - 0.5) * 0.01;
    let y = Math.cos(this.time * 0.001) + (Math.random() - 0.5) * 0.01;

    this.applyForce(new Phaser.Math.Vector2(x, y));
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

  updatePositionFromSocket(data: any) {
    //I SAVE THE LAST POSITION AND VELOCITY TO INTERPOLATE
    this.lastPos.x = this.x;
    this.lastPos.y = this.y;

    this.lastVel.x = this.vel.x;
    this.lastVel.y = this.vel.y;

    this.x = data.x;
    this.y = data.y;

    this.vel.x = data.vx;
    this.vel.y = data.vy;
  }
}
