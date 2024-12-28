
import { Boot } from "./scenes/Boot";
import { Game as MainGame } from "./scenes/Game";
import { Preloader } from "./scenes/Preloader";

import { Game, Types } from "phaser";

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/latest/Phaser.Types.Core.GameConfig
const config: Types.Core.GameConfig = {
  // type: Phaser.CANVAS,
  type: Phaser.AUTO,
  width: 1920,  
  height: 1080,
  parent: "game-container",
  backgroundColor: "#028af8",
  scale: {
    // mode: Phaser.Scale.CENTER_HORIZONTALLY,
    // autoCenter: Phaser.Scale.CENTER_BOTH,
    mode: Phaser.Scale.ZOOM_4X,
  },
  scene: [Boot, Preloader, MainGame],
  
};

export default new Game(config);
