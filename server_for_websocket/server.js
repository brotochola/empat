const WebSocket = require("ws");
const fs = require("fs/promises");
// Create a WebSocket server on port 8080
const wss = new WebSocket.Server({ port: 8080 });
let level1;
const fishInTileMap = [72, 74, 76, 78, 80, 100];

(async () => {
  console.log("WebSocket server is running on ws://localhost:8080");

  try {
    const data = await fs.readFile("level1.json", "utf8");
    level1 = JSON.parse(data);
  } catch (error) {
    console.error("Error reading file:", error);
  }

  // Fish state (example data for 200 fish)
  let fish = Array.from({ length: 200 }, () => ({
    type: fishInTileMap[Math.floor(Math.random() * fishInTileMap.length)],
    x: Math.random() * 800,
    y: Math.random() * 600,
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2,
  }));

  // Update fish positions using simple movement logic
  function updateFish() {
    for (const f of fish) {
      f.x += f.vx;
      f.y += f.vy;

      f.vx += (Math.random() - 0.5) * 0.1;
      f.vy += (Math.random() - 0.5) * 0.1;

      // Bounce back if they hit boundaries (example logic)
      if (f.x < 0 || f.x > 800) f.vx *= -1;
      if (f.y < 0 || f.y > 600) f.vy *= -1;
    }
  }

  // Broadcast updated fish positions to all clients
  function broadcastFish() {
    const data = JSON.stringify({ type: "fishPosition", fish });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  // Handle new connections
  wss.on("connection", (ws) => {
    console.log("A new client connected");

    ws.send(JSON.stringify({ ...level1, fish }));

    // Handle client disconnections
    ws.on("close", () => {
      console.log("A client disconnected");
    });
  });

  // Run the simulation and broadcast updates
  setInterval(() => {
    updateFish();
    broadcastFish();
  }, 1000 / 30); // 30 updates per second
})();
