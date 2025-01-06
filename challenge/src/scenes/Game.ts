import { Scene } from "phaser";
import { Fish } from "../classes/fish";
import { SpatialHash } from "../classes/grid";
import { Plant } from "../classes/plant";
import { WebSocketConnection } from "../webSocketConnection";
import { Toast } from "../classes/toast";
import {
  getColorFromRange,
  getURLWithNoPortAndProtocol,
  interpolate,
  mobileCheck,
} from "../utils";
import { QuestionManager } from "../classes/questionManager";

export type Question = {
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
  timeOfDay = 0.5;
  dayColor: any;
  nightColor: any;
  frameCount = 0;

  gradientTexture: Phaser.Textures.CanvasTexture | null;
  ctx: CanvasRenderingContext2D;
  //With the QuestionManager class i manage the game logic, questions, and so on
  questionManager: QuestionManager;
  //the background sound is a simple html audio element
  bgSound: HTMLAudioElement;
  //with a little help from my friend gpt, I quickly created a class to handle quick messages to be shown to the user
  toast: Toast = new Toast();
  camera: Phaser.Cameras.Scene2D.Camera;
  bg: Phaser.GameObjects.Image;
  sandLayer1: Phaser.Tilemaps.TilemapLayer | null;
  sandLayer2: Phaser.Tilemaps.TilemapLayer | null;
  sandLayer3: Phaser.Tilemaps.TilemapLayer | null;
  //This is a perlin noise sprite to make the water have some texure, it looks cool.
  waterNoise: Phaser.GameObjects.TileSprite;
  //another texture for the water
  waterNoise2: Phaser.GameObjects.TileSprite;
  //arr of fish in the front, these are the interactive fish, the ones that the server manages, if connected
  arrOfFish: Fish[] = [];
  //these fish are not interactive, they're in the background, only to make the enviroment look nicer
  arrOfBGFish: Fish[] = [];
  //plants, they are not interactive. The same architecture could have been used for the plants: have the server running them.
  //maybe make the fish eat them...
  arrOfPlants: Plant[] = [];
  //THESE ARE DEFAULT VALUES THAT WILL BE OVERRITEN BY THE SOCKET CONNECTION
  worldWidth: number = 3840;
  worldHeight: number = 1080;
  //grid for the fish... if the frontend is not connected to the server, the fish run in the frontend,
  // and the spatial hashing is used. if not, it is only used for the background fish.
  spatialHash: SpatialHash<Fish>;
  //ScrollX keeps the value of the camera position
  scrollX: number = 0;
  wsConnection: WebSocketConnection;
  created: boolean = false;
  ready: boolean = false;
  //the particle emitter is used for the bubbles
  particleEmitter: Phaser.GameObjects.Particles.ParticleEmitter;

  cameraLimitMinX = 0;
  cameraLimitMaxX = this.worldWidth - window.innerWidth;
  //the level the game currently uses, it can be updated over the socket connection
  level: Level;
  //a container for the background fish
  furtherAwayFish: Phaser.GameObjects.Container;
  plantsContainer: Phaser.GameObjects.Container;

  //the whole game has this effect
  //the very simple UI for this example was done with html and css
  fx: Phaser.FX.Displacement;

  constructor() {
    super("Game");
    (window as any).g = this;
    this.spatialHash = new SpatialHash<Fish>(100);
  }

  createBGAudioAndPlay() {
    this.bgSound = new Audio("assets/sounds/bg.mp3");
    this.bgSound.loop = true;
    this.bgSound.play();
    this.bgSound.volume = 0.3;
  }

  addParticleEmitter() {
    // / Create a particle manager

    this.particleEmitter = this.add.particles(300, 300, "spritesheet", {
      frame: 123,
      speedX: { min: -50, max: 50 },
      speedY: { min: -100, max: -200 },
      lifespan: 8000,
      scale: { start: 0.3, end: 1.2 },
      angle: { min: -110, max: -80 },
      alpha: { min: 0, max: 0.7, end: 0 },
      blendMode: "ADD",
      quantity: 1,
    });
    this.particleEmitter.stop();
    this.particleEmitter.depth = 3;
  }

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
    this.createBGAudioAndPlay();
    this.load.image("highlight", "assets/highlight.png");

    this.load.spritesheet("spritesheet", "assets/tilemap/fishTilesheet.png", {
      frameWidth: 64,
      frameHeight: 64,
    });

    // this.load.image("tileset", "assets/tilemap/fishTilesheet.png");
    this.load.tilemapTiledJSON("map", "assets/tilemap/map_editor_file.json");

    this.load.image("noise", "assets/noise.png");
    this.load.image("noiseSmall", "assets/noisesmall.png");
    this.load.image("waterOverlay", "assets/overlay.png");

    this.connectToWebSocket();
  }

  unhighlightAllFish() {
    for (let fish of this.arrOfFish) {
      fish.unhighlight();
    }
  }

  connectToWebSocket() {
    if (
      window.location.protocol == "https:" &&
      window.location.href.includes("github.io")
    ) {
      //WE'RE PROBABLY ON GITHUB
      this.whatToDoIfWebSocketDidntWork();
      return;
    }

    this.wsConnection = new WebSocketConnection(
      "ws://" + getURLWithNoPortAndProtocol() + ":8080",
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

    this.toast.show("Could not connect to the server, you're playing offline");
    setTimeout(() => this.questionManager.start(), 1000);
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

      setTimeout(() => this.questionManager.start(), 1000);
    } else {
      //RETRY
      setTimeout(() => {
        this.initLevelWithDataFromSocket();
      }, 200);
    }
  }

  loadTileMap() {
    const map = this.make.tilemap({ key: "map" });

    //load the tile map created with Tiled and add layers

    const tileset = map.addTilesetImage("fishTilesheet", "spritesheet")!;
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
    //at least on my phone, the filters were not working, so for this example i'm not using them on mobile devices
    if (mobileCheck()) return;
    this.fx = this.camera.postFX.addDisplacement("noise", -0.1, -0.1);
  }

  putListeners() {
    this.input.on("pointerdown", (e: any) => {
      let x = e.event.screenX || e.downX;
      // let y = e.event.screenY || e.downY;
      const actualWidth = window.innerWidth;

      if (x > actualWidth * 0.8) {
        this.scrollX += 250;
      } else if (x < actualWidth * 0.2) {
        this.scrollX -= 250;
      }

      if (this.scrollX < this.cameraLimitMinX)
        this.scrollX = this.cameraLimitMinX;

      if (this.scrollX > this.cameraLimitMaxX)
        this.scrollX = this.cameraLimitMaxX;

      this.emitBubbles(e.worldX - 300, e.worldY - 300, 10);
    });

    window.onresize = () => {
      this.handleWindowResize();
    };
  }

  emitBubbles(x: number, y: number, numberOfBubble: number = 1): void {
    this.particleEmitter.emitParticleAt(x, y, numberOfBubble);
  }

  create() {
    this.camera = this.cameras.main;

    this.camera.setBackgroundColor(0x000000);

    this.createContainerForFurtherAwayFish();
    this.createContainerForPlants();

    this.createShader();
    this.putListeners();
    this.questionManager = new QuestionManager(
      this,
      (this.level || {}).questions
    );

    this.addParticleEmitter();
    this.created = true;
  }

  setCameraBounds() {
    // this.cameras.main.setBounds(
    //   0,
    //   0,
    //   this.worldWidth, //+ window.innerWidth,
    //   this.worldHeight
    // );

    this.cameraLimitMaxX =
      this.worldWidth - window.innerWidth * this.game.scale.displayScale.x - 50;
    if (this.scrollX > this.cameraLimitMaxX)
      this.scrollX = this.cameraLimitMaxX;
  }

  scrollTo(x: number) {
    this.scrollX = x;
    if (this.scrollX > this.cameraLimitMaxX)
      this.scrollX = this.cameraLimitMaxX;

    if (x < 0) this.scrollX = 0;
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
    this.waterNoise.depth = 6;

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
  handleWindowResize() {
    this.setCameraBounds();
  }

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
    this.gradientTexture = this.textures.createCanvas(
      "gradient",
      this.worldWidth,
      this.worldHeight
    );

    // Get the canvas context
    this.ctx = this.gradientTexture!.getContext();

    // Initialize gradient colors for day-night cycle
    this.dayColor = { r: 151, g: 222, b: 251 }; // Light blue
    this.nightColor = { r: 0, g: 0, b: 129 }; // Dark blue

    // Draw the initial gradient
    this.updateGradient();
  }

  updateGradient() {
    // Interpolate between day and night colors

    const topColor = `rgb(${Math.round(
      interpolate(this.dayColor.r, this.nightColor.r, this.timeOfDay)
    )}, ${Math.round(
      interpolate(this.dayColor.g, this.nightColor.g, this.timeOfDay)
    )}, ${Math.round(
      interpolate(this.dayColor.b, this.nightColor.b, this.timeOfDay)
    )})`;

    const bottomColor = `rgb(${Math.round(
      interpolate(this.nightColor.r, this.dayColor.r * 0.66, this.timeOfDay)
    )}, ${Math.round(
      interpolate(this.nightColor.g, this.dayColor.g * 0.66, this.timeOfDay)
    )}, ${Math.round(
      interpolate(this.nightColor.b, this.dayColor.b * 0.66, this.timeOfDay)
    )})`;

    // Create a linear gradient
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.worldHeight);
    gradient.addColorStop(0, topColor);
    gradient.addColorStop(1, bottomColor);

    // Fill the canvas with the gradient
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

    // Refresh the texture to apply the gradient
    this.gradientTexture!.refresh();

    // Add the gradient as an image if it hasn't been added yet
    if (!this.bg) {
      this.bg = this.add.image(0, 0, "gradient");
      this.bg.setOrigin(0);
      this.bg.setScrollFactor(0, 1);
    }
  }

  updateDayNightCycle(time: number = 0) {
    const dayNightSpeed = 0.0002;
    this.timeOfDay = Math.sin(dayNightSpeed * (time + 2000)) * 0.5 + 0.5;

    //BY SETTING A BLACK TINT ON THE WATERNOISE, I CAN MAKE EVERYTHING SLIGHTLY DARKER
    this.waterNoise.setTint(getColorFromRange(1 - this.timeOfDay));
    //SAME FOR THE FIRST LAYER OF SAND
    this.sandLayer1!.setTint(getColorFromRange(1 - this.timeOfDay * 0.34));
    this.sandLayer2!.setTint(getColorFromRange(1 - this.timeOfDay * 0.5));

    // Update the gradient colors
    this.updateGradient();
  }
  update(time: number, delta: number) {
    //if the game is not ready, nothing updates yet
    if (!this.ready) return;
    this.frameCount++;

    //clear the grid, each fish will update its position on every frame
    this.spatialHash.clear();

    //lerp the position of the camera
    this.camera.setScroll(
      Phaser.Math.Interpolation.SmoothStep(
        0.166,
        this.camera.scrollX,
        this.scrollX
      ),
      0
    );

    //UPDATE EVERY ENTITIES THAT HAS TO BE UPDATED
    this.arrOfBGFish.forEach((fish) => {
      fish.update(time);
    });

    this.arrOfFish.forEach((fish) => {
      fish.update(time);
    });

    this.arrOfPlants.forEach((plant) => {
      plant.update(time);
    });

    //WAVY EFFECT
    this.updateFilter();

    //I feel this was getting a bit heavy, so once every other frame
    if (this.frameCount % 4 == 0) this.updateDayNightCycle(time);
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
