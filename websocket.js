const RaidBoss = require("./Models/raid.js");
const userModel = require("./Models/user.js");
const WebSocket = require("ws");
const { parse } = require("url");
const jwt = require("jsonwebtoken");

const usernameToWs = new Map();

const setupWebsocket = (app, server) => {
  const wss = new WebSocket.Server({ server });
  const WEBHOOK_SECRET = "hamsterHub";

  const raidBoss = new RaidBoss();

  // WebSocket client groups
  let notifyClients = new Set();
  let raidClients = new Map(); // ws => username

  function broadcast(clients, payload) {
    const message = JSON.stringify(payload);
    for (const ws of clients) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  wss.on("connection", (ws, req) => {
    const parsedUrl = parse(req.url, true);
    const { token, event, secret } = parsedUrl.query;

    if (secret !== WEBHOOK_SECRET) {
      console.log(
        `WebSocket Unauthorized closed.. headers={${secret} ${event} ${token}}`,
      );
      return ws.close(1008, "Unauthorized");
    }

    console.log(`New connection: ${event || "unknown"}`);

    jwt.verify(token, process.env.JWT_TOKEN, async (err, user) => {
      if (err) return ws.close(1008, "Unauthorized");
      const username = user.username;

      if (event === "raid" && username) {
        if (raidBoss.active) {
          usernameToWs.set(username, ws);
          raidClients.set(ws, username);
          ws.send(
            JSON.stringify({
              e: "RS",
              b: raidBoss.bossPrefabName,
              mH: raidBoss.maxHealth,
              h: raidBoss.health,
              d: raidBoss.damage,
            }),
          );
        } else ws.close();
      } else if (event === "notify") {
        usernameToWs.set(username, ws);
        notifyClients.add(ws);
        if (raidBoss.active) {
          ws.send(
            JSON.stringify({
              e: "RS",
              b: raidBoss.bossPrefabName,
              mH: raidBoss.maxHealth,
              h: raidBoss.health,
              d: raidBoss.damage,
            }),
          );
        }
      } else {
        ws.close();
        return;
      }

      ws.on("message", async (message) => {
        let data;
        try {
          data = JSON.parse(message);
        } catch (err) {
          console.error("Invalid message:", message);
          return;
        }

        const { u: username, s: signal, d: damage } = data;
        if (!raidBoss.active || !username || !signal) return;

        switch (signal) {
          case "TD":
            if (typeof damage !== "number" || damage <= 0) return;

            const updated = raidBoss.takeDamage(ws, username, damage);

            if (updated) {
              console.log(
                `${username} dealt ${damage} damage. Boss HP: ${raidBoss.health}`,
              );
              broadcast(raidClients.keys(), { e: "UBH", h: raidBoss.health });
            }

            if (raidBoss.health <= 0) {
              console.log(`Raid Ended. Players: ${raidBoss.playerJoins.size}`);
              const bossMaxHealth = raidBoss.maxHealth;
              const rewardId = raidBoss.rewardId;
              const playerJoins = raidBoss.playerJoins;
              raidBoss.deactivate();
              const activeSockets = [...playerJoins]
                .filter(([_, data]) => data.damage > 0)
                .map(([_, data]) => data.ws);
              const sortedPlayers = Array.from(raidBoss.playerJoins.entries())
                .map(([username, data]) => ({ username, damage: data.damage }))
                .sort((a, b) => b.damage - a.damage);
              const bestPlayer = {
                username: sortedPlayers[0].username,
                damage: sortedPlayers[0].damage,
                damagePercent: sortedPlayers[0].damage / bossMaxHealth * 100,
              };

              broadcast(activeSockets, {
                e: "RE",
                w: true,
                r: rewardId,
                bu: bestPlayer.username,
                bd: bestPlayer.damagePercent,
              });
              broadcast(
                Object.keys(raidClients).filter((item) =>
                  !activeSockets.includes(item)
                ),
                {
                  e: "RE",
                  w: true,
                  bu: bestPlayer.username,
                  bd: bestPlayer.damagePercent,
                },
              );
              broadcast(notifyClients, {
                e: "RE",
                w: true,
                bu: bestPlayer.username,
                bd: bestPlayer.damagePercent,
              });

              const scoreFields = ["python", "unity", "blender", "website"];

              const bulkOps = [];

              for (let i = 0; i < sortedPlayers.length; i++) {
                const username = sortedPlayers[i].username;
                const updated = {};

                for (const field of scoreFields) {
                  if (raidBoss.topScoreReward[field]) {
                    const scoreToAdd = raidBoss.topScoreReward[field]?.[i] || 0;
                    updated[`score.${field}`] = scoreToAdd;
                  }
                }

                if (Object.keys(updated).length > 0) {
                  bulkOps.push({
                    updateOne: {
                      filter: { username },
                      update: {
                        $inc: updated,
                      },
                    },
                  });
                }
              }

              if (bulkOps.length > 0) {
                await userModel.bulkWrite(bulkOps);
              }
            }
            break;
        }
      });

      ws.on("close", () => {
        if (notifyClients.has(ws)) {
          notifyClients.delete(ws);
        } else if (raidClients.has(ws)) {
          raidClients.delete(ws);
        }
      });
    });
  });

  app.post("/notify/start-raid", (req, res) => {
    const {
      bossPrefabName,
      maxHealth,
      health,
      damage,
      rewardId,
      topScoreReward,
      playerJoins,
    } = req.body;
    if (!bossPrefabName || !maxHealth || !damage) {
      return res.status(400).json({ error: "Missing data" });
    }

    if (raidBoss.active) {
      return res.status(400).json({ error: "Raid is active" });
    }

    raidBoss.activate(
      bossPrefabName,
      maxHealth,
      health ?? maxHealth,
      damage,
      rewardId,
      topScoreReward ?? [],
      playerJoins ?? [],
    );

    console.log(`Raid started: ${bossPrefabName} (${maxHealth}, ${damage})`);

    broadcast(notifyClients, {
      e: "RS",
      b: bossPrefabName,
      mH: maxHealth,
      d: damage,
    });
    return res.json({ success: true });
  });

  app.post("/notify/stop-raid", (req, res) => {
    raidBoss.deactivate();
    broadcast(notifyClients, { e: "RE", w: false });
    broadcast(raidClients.keys(), { e: "RE", w: false });
    return res.json({ success: true });
  });

  app.post("/notify/broadcast", (req, res) => {
    const { message, color } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    broadcast(notifyClients, { e: "N", m: message, c: color });
    return res.json({ sent: true });
  });

  app.get("/notify/raid-status", (req, res) => {
    const sortedPlayers = Array.from(raidBoss.playerJoins.entries())
      .map(([username, data]) => ({ username, damage: data.damage }))
      .sort((a, b) => b.damage - a.damage);

    return res.json({
      active: raidBoss.active,
      boss: raidBoss.bossPrefabName,
      maxHealth: raidBoss.maxHealth,
      health: raidBoss.health,
      damage: raidBoss.damage,
      rewardId: raidBoss.rewardId,
      updateHealthChange: raidBoss.updateHealthChange,
      topScoreReward: raidBoss.topScoreReward,
      playerJoins: sortedPlayers,
    });
  });

  app.get("/raidManager", async (req, res) => {
    const sortedPlayers = Array.from(raidBoss.playerJoins.entries())
      .map(([username, data]) => ({ username, damage: data.damage }))
      .sort((a, b) => b.damage - a.damage);

    res.render("raid", {
      raidBoss: {
        active: raidBoss.active,
        boss: raidBoss.bossPrefabName,
        maxHealth: raidBoss.maxHealth,
        health: raidBoss.health,
        damage: raidBoss.damage,
        rewardId: raidBoss.rewardId,
        updateHealthChange: raidBoss.updateHealthChange,
        topScoreReward: raidBoss.topScoreReward,
        playerJoins: sortedPlayers,
      },
    });
  });
};

function getWebSocketWithUsername(username) {
  return usernameToWs.get(username);
}

module.exports = { setupWebsocket, getWebSocketWithUsername };
