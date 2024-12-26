import { Game } from "../scenes/Game";

export class Plant extends Phaser.GameObjects.Sprite {
  plantType: number;
  startingNumber: number = Math.random();
  scene: Game;
  time: number;
  bgPlant: boolean;
  tilesetKey: string;
  age = 0;
  growingStage: number = 0;
  dead: boolean = false;
  numberOfFramesToChangeSprite = Math.random() * 3 + 3;
  static sequence: number[][] = [
    [17, 15, 16, 14],
    [35, 33, 34, 32],
    [53, 51, 52, 50],
    [71, 69, 70, 68],
  ];

  fx: Phaser.FX.Displacement;
  connectedToSocket: boolean;

  constructor(
    scene: Game,
    x: number,
    y: number,
    tilesetKey: string,
    type: number,
    container: Phaser.GameObjects.Container | null,
    connectedToSocket: boolean
  ) {
    super(scene, x, y, tilesetKey, Plant.sequence[type][0]);
    this.connectedToSocket = connectedToSocket;
    this.tilesetKey = tilesetKey;
    this.scene = scene;

    this.plantType = type;

    this.resetFrame();
    if (container) {
      //IT'S A BACKGROUND PLANT
      this.bgPlant = true;
      container.add(this);
    } else {
      //IT'S AN INTERACTIVE PLANT
      scene.add.existing(this);

      this.setInteractive();

      this.on("pointerdown", (e: Event) => {
        this.handlePointerDown();
      });
    }

    this.setOrigin(0.5, 1);
    //ADD DISPLACEMENT FILTER
    this.fx = this.postFX.addDisplacement("noiseSmall", 0.0, 0.0);
  }
  handlePointerDown() {
    console.log(this);
  }
  resetFrame() {
    let frame = this.frame.clone();
    frame.setCutSize(64, 62);
    frame.setCutPosition(frame.cutX, frame.cutY + 2);
    this.setFrame(frame);
  }

  update(time: number) {
    if (this.dead) return;
    this.time = time;

    this.updateFilter();
    this.updateRotation();
    this.grow();
  }

  die() {
    //WHEN A PLANT DIES, TWO MORE APPEAR
    this.scene.addPlant(
      this.x - (Math.random() * 20 + 20),
      this.y,
      this.plantType,
      this.parentContainer,
      this.connectedToSocket
    );

    this.scene.addPlant(
      this.x + (Math.random() * 20 + 20),
      this.y,
      this.plantType,
      this.parentContainer,
      this.connectedToSocket
    );

    this.dead = true;
    this.scene.arrOfPlants = this.scene.arrOfPlants.filter((k) => k != this);

    //WHEN PLANTS DIE, THEY TRANSITION TO VERY SMALL AND DARKER

    this.tint = 0xffffff;
    this.scene.tweens.add({
      targets: this, // The object to animate
      scale: 0.001, // Final value for the x position
      duration: 1000, // Duration in milliseconds
      tint: 0xaaaaff,
      ease: "Power1", // Easing function
      onComplete: () => {
        this.destroy();
      },
      repeat: 0,
    });
  }

  grow() {
    this.age += 0.01;
    if (this.age > this.numberOfFramesToChangeSprite) {
      this.growingStage++;
      if (this.growingStage >= 4) {
        this.die();
      } else {
        this.changeSprite(this.growingStage);
        this.age = 0;
      }
    }

    const scale =
      (this.growingStage + 1 + this.age / this.numberOfFramesToChangeSprite) *
      0.5;
    this.setScale(scale * 0.66, scale);
  }
  updateRotation() {
    this.rotation = Math.sin(this.time * this.startingNumber * 0.0005) * 0.166;
  }
  changeSprite(which: number) {
    this.setTexture(this.tilesetKey, Plant.sequence[this.plantType][which]);
  }

  updateFilter() {
    this.fx.x = Math.sin(this.time * 0.0005) * 0.33;
    this.fx.y = Math.cos(this.time * 0.001) * 0.01;
  }
}
