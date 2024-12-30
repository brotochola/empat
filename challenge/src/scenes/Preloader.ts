import { Scene } from "phaser";

export class Preloader extends Scene {
  constructor() {
    super("Preloader");
  }

  init() {
    const canvasWidth = this.sys.canvas.width;
    const canvasHeight = this.sys.canvas.height;
    const midWidth = canvasWidth / 2;
    const midHeight = canvasHeight / 2;

    // this.add.image(512, 384, "background");
    // this.load.atlasXML(
    //   "spritesheet",
    //   "path/to/spritesheet.png",
    //   "path/to/spritesheet.xml"
    // );

    //  A simple progress bar. This is the outline of the bar.
    this.add
      .rectangle(midWidth, midHeight, 468, 32)
      .setStrokeStyle(3, 0x000000, 0.5);

    //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
    const bar = this.add.rectangle(midWidth - 230, midHeight, 4, 28, 0xffffff);

    //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
    this.load.on("progress", (progress: number) => {
      //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
      bar.width = 4 + 460 * progress;
    });
  }

  preload() {
    console.log("preloading assets...");
    //  Load the assets for the game - Replace with your own assets
    // this.load.setPath("assets");

    // this.load.font("theFont", "assets/Newyear Coffee.ttf");


  }

  create() {
    this.scene.start("Game");
  }
}
