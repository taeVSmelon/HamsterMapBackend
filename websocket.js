const RaidBoss = require("./Models/raid.js");
const WebSocket = require("ws");
const url = require("url");

const setupWebsocket = (app, server) => {
  const wss = new WebSocket.Server({ server });
  const WEBHOOK_SECRET = "hamsterHub";

  const raidBoss = new RaidBoss();

  // WebSocket client groups
  let notifyClients = new Set();
  let raidClients = new Map(); // ws => playerId

  function broadcast(clients, payload) {
    const message = JSON.stringify(payload);
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        console.log("Message sent to", raidClients.get(ws), ":", message);
      } else {
        console.log("Client closed:", raidClients.get(ws));
      }
    }
  }

  wss.on("connection", (ws, req) => {
    const { secret, event, id: userId } = req.headers;

    if (secret !== WEBHOOK_SECRET) {
      ws.close(1008, "Unauthorized");
      return;
    }

    console.log(`New connection: ${event || "unknown"}`);

    if (event === "raid" && userId) {
      if (raidBoss.active) {
        raidClients.set(ws, userId);
        ws.send(
          JSON.stringify({
            e: "RS",
            b: raidBoss.bossPrefabName,
            mH: raidBoss.maxHealth,
            h: raidBoss.health,
            d: raidBoss.damage
          }),
        );
      } else ws.close();
    } else if (event === "notify") {
      notifyClients.add(ws);
      if (raidBoss.active) {
        ws.send(
          JSON.stringify({
            e: "RS",
            b: raidBoss.bossPrefabName,
            mH: raidBoss.maxHealth,
            h: raidBoss.health,
            d: raidBoss.damage
          }),
        );
      }
    } else {
      ws.close();
      return;
    }

    ws.on("message", (message) => {
      let data;
      try {
        data = JSON.parse(message);
      } catch (err) {
        console.error("Invalid message:", message);
        return;
      }

      const { u: userId, s: signal, d: damage } = data;
      if (!raidBoss.active || !userId || !signal) return;

      switch (signal) {
        case "TD":
          if (typeof damage !== "number" || damage <= 0) return;

          const updated = raidBoss.takeDamage(userId, damage);
          console.log(
            `${userId} dealt ${damage} damage. Boss HP: ${raidBoss.health}`,
          );

          // console.log(`updated: ${updated}`);
          // if (updated) {
          //   broadcast([...raidClients.keys()], { e: "UBH", h: raidBoss.health });
          // }
          broadcast([...raidClients.keys()], { e: "UBH", h: raidBoss.health });

          if (raidBoss.health <= 0) {
            console.log(`Raid Ended. Players: ${raidBoss.playerJoins.size}`);
            raidBoss.deactivate();
            broadcast([...raidClients.keys()], { e: "RE", w: true });
          }
          break;
      }
    });
    
    ws.on("close", () => {
      if (notifyClients.has(ws))
        notifyClients.delete(ws);
      else if (raidClients.has(ws))
        raidClients.delete(ws);
    });
  });

  // API Routes
  app.post("/notify/start-raid", (req, res) => {
    const { bossPrefabName, maxHealth, damage } = req.body;
    if (!bossPrefabName || !maxHealth || !damage) {
      return res.status(400).json({ error: "Missing data" });
    }

    raidBoss.activate(bossPrefabName, maxHealth, damage);
    console.log(`Raid started: ${bossPrefabName} (${maxHealth}, ${damage})`);

    broadcast(notifyClients, { e: "RS", b: bossPrefabName, mH: maxHealth, d: damage });
    return res.json({ success: true });
  });

  app.post("/notify/stop-raid", (req, res) => {
    raidBoss.deactivate();
    broadcast(notifyClients, { e: "RE", w: false });
    broadcast([...raidClients.keys()], { e: "RE", w: false });
    return res.json({ success: true });
  });

  app.post("/notify/broadcast", (req, res) => {
    const { message, color } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    broadcast(notifyClients, { e: "N", m: message, c: color });
    return res.json({ sent: true });
  });

  app.get("/notify/raid-status", (req, res) => {
    return res.json({ raidBoss });
  });
};

module.exports = setupWebsocket;
