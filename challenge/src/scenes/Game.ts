import { Scene } from "phaser";
import { Fish } from "../classes/fish";
import { SpatialHash } from "../classes/grid";

export class Game extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  msg_text: Phaser.GameObjects.Text;
  fish: Phaser.GameObjects.Sprite;
  bg: Phaser.GameObjects.Sprite;
  sandLayer1: Phaser.Tilemaps.TilemapLayer | null;
  sandLayer2: Phaser.Tilemaps.TilemapLayer | null;
  sandLayer3: Phaser.Tilemaps.TilemapLayer | null;
  arrOfFish: Fish[] = [];
  worldWidth: number = 3840;
  worldHeight: number = 1080;
  spatialHash: SpatialHash<Fish>;
  scrollX: number = 0;
  numberOfFish: number = 130

  constructor() {
    super("Game");
    window.g = this;
    this.spatialHash = new SpatialHash<Fish>(100);
  }

  // loadFish() {
  //   let size = 70;
  //   for (let i = 1; i < 127; i++) {
  //     let name = "fishTile_" + formatNumber(i) + ".png";
  //     let x = (i % 20) * size + size;
  //     let y = Math.floor(i / 10) * size + size;
  //     this.fish = this.add.sprite(x, y, "spritesheetWithEverything", name);
  //   }
  // }

  addFishFromTheTileSet(x: number, y: number, num: number) {
    let newFish = new Fish(this, x, y, "spritesheet", num, this.spatialHash);

    this.arrOfFish.push(newFish);

    this.spatialHash.insert(newFish);
  }

  preload() {
    this.load.spritesheet("spritesheet", "assets/tilemap/fishTilesheet.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.image("tileset", "assets/tilemap/fishTilesheet.png");
    this.load.tilemapTiledJSON("map", "assets/tilemap/map_editor_file.json");

    // this.textures.get('spritesheet').setFilter(Phaser.Textures.FilterMode.NEAREST);

    // this.textures.get('tileset').setFilter(Phaser.Textures.FilterMode.NEAREST);
  }

  loadTileMap() {
    const map = this.make.tilemap({ key: "map" });

    // Add the tileset image
    const tileset = map.addTilesetImage("fishTilesheet", "tileset")!;

    // Create a layer from the tilemap
    if (tileset) {
      this.sandLayer3 = map.createLayer("darker sand 2", tileset, 0, 0);

      this.sandLayer2 = map.createLayer("darker sand", tileset, 0, 0);
      this.sandLayer1 = map.createLayer("white sand", tileset, 0, 0);

      if (this.sandLayer2) {
        this.sandLayer2.alpha = 0.9;
        this.sandLayer2.setScrollFactor(0.5, 1);
        this.sandLayer2.name = "darker sand";
        this.sandLayer2.y = 200;
      }

      if (this.sandLayer3) {
        this.sandLayer3.alpha = 0.25;
        this.sandLayer3.setScrollFactor(0.25, 1);
        this.sandLayer3.name = "darker sand 2";

        this.sandLayer3.setTint(0x5555ff);
        this.sandLayer3.y = 133;
      }

      if (this.sandLayer1) {
        this.sandLayer1.name = "white sand";
      }
    }
  }

  create() {
    console.log("#game.create()");

    this.camera = this.cameras.main;
    window["camera"] = this.camera;

    // this.camera.setScroll(500,0)
    this.camera.setBackgroundColor(0x000000);

    this.putBG();

    this.input.on("pointerdown", (e: any) => {
      if (e.event.screenX > window.innerWidth * 0.9) {
        this.scrollX = this.camera.scrollX + 250;
      } else if (e.event.screenX < window.innerWidth * 0.1) {
        this.scrollX = this.camera.scrollX - 250;
      }
    });

    this.loadTileMap();
    this.addABunchOfFishAtRandomPosition();
    // this.handleWindowResize();
    // window.onresize = () => {
    //   this.handleWindowResize();
    // };

    this.cameras.main.setBounds(
      0, // -(1920 - window.innerWidth) * 0.5,
      0,
      this.worldWidth,
      this.worldHeight
    );
  }

  // handleWindowResize() {
  //   const canvas = this.game.canvas;
  //   const width = window.innerWidth;
  //   const height = window.innerHeight;

  //   // canvas.style.width = `${width}px`;
  //   // canvas.style.height = `${height}px`;
  //   // this.game.scale.resize(width, height);
  // }

  addABunchOfFishAtRandomPosition(): void {
    const fishInTileMap = [72, 74, 76, 78, 80, 100];
    const margin = 100;
    for (let i = 0; i < this.numberOfFish; i++) {
      this.addFishFromTheTileSet(
        Math.random() * this.worldWidth + margin,
        Math.random() * 600 + margin,
        fishInTileMap[Math.floor(Math.random() * fishInTileMap.length)]
      );
    }
  }

  putBG() {
    // Create a canvas texture
    const gradientTexture = this.textures.createCanvas(
      "gradient",
      this.worldWidth,
      this.worldHeight
    );

    // Get the canvas context
    const ctx = gradientTexture!.getContext()!;

    // Create a linear gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, this.worldHeight);
    gradient.addColorStop(0, "#87CEEB"); // Light blue
    gradient.addColorStop(1, "#00008B"); // Dark blue

    // Fill the canvas with the gradient
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

    // Refresh the texture to apply the gradient
    gradientTexture?.refresh();

    // Add the gradient as an image
    this.bg = this.add.image(0, 0, "gradient").setOrigin(0);
    this.bg.setScrollFactor(0, 1);
  }
  update(time: number) {
    //CLEAR THE GRID

    this.spatialHash.clear();

    this.camera.setScroll(
      Phaser.Math.Interpolation.SmoothStep(
        0.166,
        this.camera.scrollX,
        this.scrollX
      ),
      0
    );

    this.arrOfFish.forEach((fish) => {
      fish.update(time);
    });
  }
}
