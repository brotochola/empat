import WebSocket, { WebSocketServer } from "ws";
import { promises as fs } from "fs";
import { Fish } from "./socketFish";
import { SpatialHash } from "./grid";

type Question = {
  question: string;
  answer: string;
  fishToHighlight: string;
};

type Level = {
  numberOfPlants: number;
  worldWidth: number;
  worldHeight: number;
  numberOfFish: number;
  numberOfBgFish: number;
  questions: Question[];
  fish: Fish[];
  cohesionFactor: number;
  alignmentFactor: number;
  separationFactor: number;
  escapeFromOtherFishFactor: number;
};

export type SerializedFish = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: number;
};

// Create a WebSocket server on port 8080
const wss = new WebSocketServer({ port: 8080 });

let level1: Level;
const fishInTileMap = [72, 74, 76, 78, 80, 100];
let arrOfFish: Fish[] = [];

let grid = new SpatialHash<Fish>(100);
let time = 0;

// Self-invoking async function for initialization
(async () => {
  console.log("WebSocket server is running on ws://localhost:8080");

  const data = await fs.readFile("level1.json", "utf8");
  level1 = JSON.parse(data);

  // Fish state (example data for 200 fish)
  if (level1) {
    for (let i = 0; i < level1.numberOfFish; i++) {
      arrOfFish.push(
        new Fish(
          Math.random() * level1.worldWidth,
          Math.random() * level1.worldHeight,
          fishInTileMap[Math.floor(Math.random() * fishInTileMap.length)],
          grid,
          level1.worldWidth,
          level1.worldHeight,
          level1.cohesionFactor,
          level1.alignmentFactor,
          level1.separationFactor,
          level1.escapeFromOtherFishFactor
        )
      );
    }
  }

  // const fish: Fish[] = Array.from({ length: level1!.numberOfFish }, (): Fish => ({
  //   type: fishInTileMap[Math.floor(Math.random() * fishInTileMap.length)],
  //   x: Math.random() * level1.worldWidth,
  //   y: Math.random() * level1.worldHeight,
  // }));

  // Update fish positions using simple movement logic
  function updateFish(): void {
    grid.clear();

    for (let i = 0; i < arrOfFish.length; i++) {
      let f = arrOfFish[i];
      f.update(time);
      if (i == 0) {
        // console.log(f.acc);
      }
    }
  }

  function convertArrOfFishToArrOfSerializedFish(): SerializedFish[] {
    return arrOfFish.map((k) => k.serialize());
  }

  // Broadcast updated fish positions to all clients
  function broadcastFish(): void {
    const data = JSON.stringify({
      type: "fishPosition",
      fish: convertArrOfFishToArrOfSerializedFish(),
    });

    // console.log(data)
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  // Handle new connections
  wss.on("connection", (ws) => {
    console.log("A new client connected");

    if (level1) {
      ws.send(
        JSON.stringify({
          ...level1,
          fish: convertArrOfFishToArrOfSerializedFish(),
        })
      );
    }

    // Handle client disconnections
    ws.on("close", () => {
      console.log("A client disconnected");
    });
  });

  let deltaTime = 1000 / 60;
  // Run the simulation and broadcast updates
  setInterval(() => {
    updateFish();
    broadcastFish();
    time += deltaTime * 0.001;
  }, deltaTime); // 30 updates per second
})();
