import { Scene } from "phaser";
import { Fish } from "../classes/fish";
import { SpatialHash } from "../classes/grid";
import { Plant } from "../classes/plant";
import { WebSocketConnection } from "../webSocketConnection";
import { Toast } from "../classes/toast";
import { getURLWithNoPortAndProtocol, mobileCheck } from "../utils";

type Question = {
  question: string;
  answer: string;
  fishToHighlight: string;
};

type FishFromSocket = {
  x: number;
  y: number;
  vx: number;
  type: number;
  yx: number;
};

type Level = {
  numberOfPlants: number;
  worldWidth: number;
  worldHeight: number;
  numberOfFish: number;
  numberOfBgFish: number;
  questions: Question[];
  fish: FishFromSocket[];
};

export class Game extends Scene {
  toast: Toast = new Toast();
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  msg_text: Phaser.GameObjects.Text;
  fish: Phaser.GameObjects.Sprite;
  bg: Phaser.GameObjects.Sprite;
  sandLayer1: Phaser.Tilemaps.TilemapLayer | null;
  sandLayer2: Phaser.Tilemaps.TilemapLayer | null;
  sandLayer3: Phaser.Tilemaps.TilemapLayer | null;
  waterNoise: Phaser.GameObjects.TileSprite;
  waterNoise2: Phaser.GameObjects.TileSprite;
  arrOfFish: Fish[] = [];
  arrOfBGFish: Fish[] = [];
  arrOfPlants: Plant[] = [];
  worldWidth: number = 3840; //THESE ARE DEFAULT VALUES THAT WILL BE OVERRITEN BY THE SOCKET CONNECTION
  worldHeight: number = 1080;
  spatialHash: SpatialHash<Fish>;
  scrollX: number = 0;
  wsConnection: WebSocketConnection;
  created: boolean = false;
  ready: boolean = false;

  level: Level;

  furtherAwayFish: Phaser.GameObjects.Container;
  plantsContainer: Phaser.GameObjects.Container;

  // shader: Phaser.GameObjects.Shader;

  fx: Phaser.FX.Displacement;
  // waterNoisefX: Phaser.FX.Displacement;

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

  addFishFromTheTileSet(
    x: number,
    y: number,
    num: number,
    container: Phaser.GameObjects.Container | null,
    connectedToSocket: boolean
  ) {
    let newFish = new Fish(
      this,
      x,
      y,
      "spritesheet",
      num,
      this.spatialHash,
      container,
      connectedToSocket
    );

    if (container) {
      this.arrOfBGFish.push(newFish);
    } else {
      newFish.depth = 1;
      this.arrOfFish.push(newFish);
    }

    this.spatialHash.insert(newFish);
  }

  addPlant(
    x: number,
    y: number,
    type: number,
    container: Phaser.GameObjects.Container | null,
    connectedToSocket: boolean
  ) {
    if (this.arrOfPlants.length > 20) return;
    let newPlant = new Plant(
      this,
      x,
      y,
      "spritesheet",
      type,
      container,
      connectedToSocket
    );

    this.arrOfPlants.push(newPlant);
  }

  addAFewRandomPlants(numberOfPlants: number, connectedToSocket: boolean) {
    for (let i = 0; i < numberOfPlants; i++) {
      this.addPlant(
        Math.random() * this.worldWidth,
        850,
        Math.floor(Math.random() * 2),
        this.plantsContainer,
        connectedToSocket
      );
    }
  }

  preload() {
    this.load.spritesheet("spritesheet", "assets/tilemap/fishTilesheet.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.image("tileset", "assets/tilemap/fishTilesheet.png");
    this.load.tilemapTiledJSON("map", "assets/tilemap/map_editor_file.json");

    this.load.image("noise", "assets/noise.png");
    this.load.image("noiseSmall", "assets/noisesmall.png");
    this.load.image("waterOverlay", "assets/overlay.png");

    // this.load.glsl("waterShader", "assets/shader/waterShader.glsl");

    // this.textures.get('spritesheet').setFilter(Phaser.Textures.FilterMode.NEAREST);

    this.connectToWebSocket();
  }

  connectToWebSocket() {
    // this.textures.get('tileset').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.wsConnection = new WebSocketConnection(
      "ws://"+getURLWithNoPortAndProtocol()+":8080",
      (data: any) => {
        this.onMessageFromSocket(data);
      },
      () => {
        console.warn(
          "# COULD NOT CONNECT TO WEBSOCKET, YOU'RE PLAYING OFFLINE"
        );
        this.whatToDoIfWebSocketDidntWork();
      }
    );
  }

  whatToDoIfWebSocketDidntWork() {
    //  HAVING THE WIDTH AND HEIGHT I CAN CREATE THE BG AND THE OTHER ELEMENTS OF THE SCENE:

    this.putBG();
    this.loadTileMap();
    this.putPerlinNoiseOnTopOfBg();
    this.setCameraBounds();

    this.ready = true;

    this.addABunchOfFishAtRandomPosition(null, 100, false);
    this.addABunchOfFishAtRandomPosition(this.furtherAwayFish, 100, false);
    this.addAFewRandomPlants(20, false);
  }

  onMessageFromSocket(data: any) {
    if (data.type == "level") {
      this.level = data as Level;
      console.log("#GOT LEVEL", this.level);
      this.toast.show("Level loaded from the cloud!");
      this.initLevelWithDataFromSocket();
    } else if (data.type == "fishPosition") {
      this.updateFishPositionFromSocket(data);
    }
  }
  updateFishPositionFromSocket(data: any) {
    for (let i = 0; i < data.fish.length; i++) {
      let fish = this.arrOfFish[i];
      if (fish) fish.updatePositionFromSocket(data.fish[i]);
    }
  }

  initLevelWithDataFromSocket() {
    if (this.created) {
      //SET WORLDWIDTH AND HEIGHT BEFORE ADDING FISH AND PLANTS
      this.worldWidth = this.level.worldWidth;
      this.worldHeight = this.level.worldHeight;

      //  HAVING THE WIDTH AND HEIGHT I CAN CREATE THE BG AND THE OTHER ELEMENTS OF THE SCENE:
      this.putBG();
      this.loadTileMap();
      this.putPerlinNoiseOnTopOfBg();
      this.setCameraBounds();

      this.ready = true;

      //ADD FISH AND PLANTS:
      // this.addABunchOfFishAtRandomPosition(null, this.level.numberOfFish, true);

      //ADD FISH FROM SOCKET'S LEVEL
      for (let i = 0; i < this.level.numberOfFish; i++) {
        this.addFishFromTheTileSet(
          this.level.fish[i].x,
          this.level.fish[i].y,
          this.level.fish[i].type,
          null,
          true
        );
      }

      this.addABunchOfFishAtRandomPosition(
        this.furtherAwayFish,
        this.level.numberOfBgFish,
        false
      );
      this.addAFewRandomPlants(this.level.numberOfPlants, true);
    } else {
      //RETRY
      setTimeout(() => {
        this.initLevelWithDataFromSocket();
      }, 200);
    }
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
        this.sandLayer1.depth = 10;
      }
    }
  }

  createShader() {
    if (mobileCheck()) return;
    this.fx = this.camera.postFX.addDisplacement("noise", -0.1, -0.1);
  }

  putListeners() {
    this.input.on("pointerdown", (e: any) => {
      console.log(e)
      let x=e.event.screenX || e.downX
      let y=e.event.screenY || e.downY
      if (x> window.innerWidth * 0.9) {
        this.scrollX = this.camera.scrollX + 250;
      } else if (x < window.innerWidth * 0.1) {
        this.scrollX = this.camera.scrollX - 250;
      }
    });
  }

  create() {
    console.log("#game.create()");

    this.camera = this.cameras.main;

    // this.camera.setScroll(500,0)
    this.camera.setBackgroundColor(0x000000);

    this.createContainerForFurtherAwayFish();
    this.createContainerForPlants();

    this.createShader();
    this.putListeners();
    this.created = true;
  }

  setCameraBounds() {
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
  }

  putPerlinNoiseOnTopOfBg() {
    if (mobileCheck()) return;
    this.waterNoise = this.add.tileSprite(
      0,
      500, // x, y position (center of the TileSprite)
      this.worldWidth * 2,
      this.worldHeight, // width and height of the TileSprite
      "noise" // texture key
    );
    this.waterNoise.tileScaleX = 4;
    this.waterNoise.tileScaleY = 4;
    this.waterNoise.blendMode = Phaser.BlendModes.MULTIPLY;
    this.waterNoise.alpha = 0.22;
    this.waterNoise.depth = 1;

    this.waterNoise2 = this.add.tileSprite(
      0,
      500, // x, y position (center of the TileSprite)
      this.worldWidth * 2,
      this.worldHeight, // width and height of the TileSprite
      "waterOverlay" // texture key
    );
    this.waterNoise.tileScaleX = 2;
    this.waterNoise.tileScaleY = 2;
    this.waterNoise2.blendMode = Phaser.BlendModes.ADD;
    this.waterNoise2.alpha = 0.12;
    this.waterNoise2.depth = 2;
  }
  createContainerForPlants(): void {
    this.plantsContainer = this.add.container();
    this.plantsContainer.name = "plantsContainer";
    this.plantsContainer.depth = 2;
  }
  createContainerForFurtherAwayFish(): void {
    this.furtherAwayFish = this.add.container();
    this.furtherAwayFish.setScrollFactor(0.5, 1);
    this.furtherAwayFish.setScale(0.5, 0.5);
    // this.furtherAwayFish.blendMode=Phaser.BlendModes.DARKEN
    this.furtherAwayFish.alpha = 0.1;
    this.furtherAwayFish.name = "furtherAwayFish";
    this.furtherAwayFish.depth = 1;
  }
  // handleWindowResize() {
  //   const canvas = this.game.canvas;
  //   const width = window.innerWidth;
  //   const height = window.innerHeight;

  //   // canvas.style.width = `${width}px`;
  //   // canvas.style.height = `${height}px`;
  //   // this.game.scale.resize(width, height);
  // }

  addABunchOfFishAtRandomPosition(
    container: Phaser.GameObjects.Container | null,
    num: number,
    connectedToSocket: boolean
  ): void {
    const fishInTileMap = [72, 74, 76, 78, 80, 100];
    const margin = 100;
    for (let i = 0; i < num; i++) {
      this.addFishFromTheTileSet(
        Math.random() * this.worldWidth + margin,
        Math.random() * 600 + margin,
        fishInTileMap[Math.floor(Math.random() * fishInTileMap.length)],
        container,
        connectedToSocket
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
    gradient.addColorStop(0, "#97dEfB"); // Light blue
    gradient.addColorStop(1, "#00008B"); // Dark blue

    // Fill the canvas with the gradient
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

    // Refresh the texture to apply the gradient
    gradientTexture?.refresh();

    // Add the gradient as an image
    this.bg = this.add.image(0, 0, "gradient");
    this.bg.setOrigin(0);
    this.bg.setScrollFactor(0, 1);
  }
  update(time: number) {
    if (!this.ready) return;

    this.spatialHash.clear();

    this.camera.setScroll(
      Phaser.Math.Interpolation.SmoothStep(
        0.166,
        this.camera.scrollX,
        this.scrollX
      ),
      0
    );

    this.arrOfBGFish.forEach((fish) => {
      fish.update(time);
    });

    this.arrOfFish.forEach((fish) => {
      fish.update(time);
    });

    this.arrOfPlants.forEach((plant) => {
      plant.update(time);
    });

    this.updateFilter();
  }

  updateFilter() {
    if (this.fx) {
      this.fx.x = Math.sin(this.time.now * 0.001) * 0.036;
      this.fx.y = Math.cos(this.time.now * 0.001) * 0.046;
    }
    // this.waterNoisefX.x=Math.sin(this.time.now * 0.001) * 0.166;
    // this.waterNoisefX.y=Math.sin(this.time.now * 0.001) * 0.166;
    if (this.waterNoise) {
      this.waterNoise.setTileScale(
        4 + 0.5 * Math.abs(Math.cos(this.time.now * 0.0001))
      );
      this.waterNoise.tilePositionX = this.time.now * 0.04;
    }
    if (this.waterNoise2) {
      this.waterNoise2.tilePositionX = -this.time.now * 0.05;
      this.waterNoise2.tilePositionY = -Math.sin(this.time.now * 0.0002) * 35;
    }
  }
}
