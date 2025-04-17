const express = require("express");
const axios = require("axios");
const connectDB = require("./db.js");
const userModel = require("./Models/user.js");
const http = require('http');
const querystring = require("querystring");
const setupWebsocket = require("./websocket.js"); // 👈 ใช้ server จาก websocket
const { authenticateToken, JWT_SECRET, checkIsJson } = require("./middlewares/AuthenticateToken.js");
const jwt = require("jsonwebtoken");
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8000;
const stateCache = {};

connectDB();

app.use(express.json());
app.set('trust proxy', true);

app.use((req, res, next) => {
  const currentTime = new Date().toISOString();
  const method = req.method;
  const path = req.originalUrl;
  const ip = req.ip || req.connection.remoteAddress;
  console.log(`${currentTime} - ${ip} - ${method} - ${path}`);
  next();
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/login", async (req, res) => {
  const user = req.body.username;
  const pass = req.body.password;
  const data = await userModel.findOne({ username: user });
  // console.log(data);
  if (!data) return res.status(400).json({ message: "User not found" });
  if (data.password !== pass) {
    return res.status(400).json({ message: "Incorrect password" });
  }

  const refreshToken = jwt.sign({ username: data.username }, JWT_SECRET, {
    expiresIn: "30d",
  });
  const accessToken = jwt.sign(
    { username: data.username, refreshToken: refreshToken },
    JWT_SECRET,
    { expiresIn: "1h" },
  );

  await userModel.updateOne(
    { username: data.username },
    { $set: { refreshToken: refreshToken } }
  );

  res.status(200).json({
    message: "Login successful", 
    refreshToken: refreshToken,
    accessToken: accessToken
  });
});

app.post("/refreshToken", async (req, res) => {
  const refreshToken = req.header("Authorization");

  if (!refreshToken) {
    return res.status(401).json({ error: "Invalid token" });
  }

  jwt.verify(refreshToken, JWT_SECRET, async (err, user) => {
    if (err) return res.status(403).json({ error: "Token expired" });
    const nowUser = await userModel.findOne({ username: user.username });
    if (!nowUser) return res.status(404).json({ error: "User not found" });

    if (nowUser.refreshToken === refreshToken) {
      const accessToken = jwt.sign(
        { username: nowUser.username, refreshToken: refreshToken },
        JWT_SECRET,
        { expiresIn: "1h" },
      );

      return res.json({
        accessToken: accessToken,
      });
    } else {
      return res.status(403).json({ error: "Token expired" });
    }
  });
});

app.get("/loginDiscord", async (req, res) => {
  const code = req.query.code;
  const state = req.query.state;
  if (!code) {
    return res.status(400).json({ message: "Authorization code not provided" });
  }

  try {
    // Step 1: Exchange code for access token
    const tokenResponse = await axios.post(
      "https://discord.com/api/oauth2/token",
      querystring.stringify({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: process.env.REDIRECT_URI,
        scope: "identify email guilds",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const { access_token, refresh_token, token_type } = tokenResponse.data;

    if (!access_token) {
      return res.status(400).json({
        message: "Failed to obtain access token",
        error: tokenResponse.data,
      });
    }

    // Step 2: Fetch user info from Discord
    const userResponse = await axios.get("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `${token_type} ${access_token}`,
      },
    });

    const discordUser = userResponse.data;

    if (!discordUser.id) {
      return res.status(400).json({
        message: "Failed to fetch user from Discord",
        error: discordUser,
      });
    }

    const user = await userModel.findOne({ discord_id: discordUser.id });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    const token = jwt.sign({
      username: user.username,
      accessToken: access_token,
      refreshToken: refresh_token,
    }, process.env.JWT_SECRET,
      {
        expiresIn: "10h" // มาปรับได้
      });
    stateCache[state] = token;

    return res.status(200).send("Login successful");
  } catch (error) {
    console.error(
      "Error during Discord OAuth:",
      error.response?.data || error.message,
    );
    return res.status(500).json({
      message: "Internal server error",
      error: error.response?.data || error.message,
    });
  }
});

app.get("/authorizeDiscord", async (req, res) => {
  const state = req.query.state;
  if (!state) return res.status(400).json({ message: "State not provided" });
  if (!stateCache[state]) {
    return res.status(400).json({ message: "State not found" });
  }
  res.status(200).json(stateCache[state]);
  return delete stateCache[state];
});

app.get("/getProfile", authenticateToken, async (req, res) => {
  const data = await userModel.findOne({ username: req.username });
  if (!data) return res.status(400).json({ message: "User not found" });
  res.status(200).json(data);
});

app.get("/getUser/:username", async (req, res) => {
  const user = req.params.username;
  const data = await userModel.findOne({ username: user });
  if (!data) return res.status(400).json({ message: "User not found" });
  res.status(200).json(data);
});

app.get("/leaderBoard/:game", async (req, res) => {
  const game = req.params.game;

  // Validate game parameter
  const validGames = ['python', 'unity', 'blender', 'website'];
  if (!validGames.includes(game)) {
    return res.status(400).json({
      message: "Invalid game type. Must be one of: python, unity, blender, website"
    });
  }

  try {
    const sortQuery = {};
    sortQuery[`score.${game}`] = -1; // -1 for descending order

    const data = await userModel.find()
      .sort(sortQuery);
    // console.log(data);
    if (!data || data.length === 0) {
      return res.status(404).json({ message: "No leaderboard data found" });
    }
    var leaderboard = data.map((player) => {
      return {
        id: player.id,
        username: player.username,
        score: player.score[game]
      };
    });
    res.status(200).json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/sendCode", async (req, res) => {
  const token = req.header("Authorization");
  const { stageId, code, startTime, endTime, itemUseds } = req.body;
  try {
    jwt.verify(token, process.env.JWT_TOKEN, async (err, user) => {
      if (err) return res.status(401).json({ error: "Token expired" });
      const username = user.username;
      await userModel.findOneAndUpdate({ username },
        { $push: { clearedStages: { type: "python", stageId, code, startTime, endTime, itemUseds } } },
        { new: true }
      )
    });
  }
  catch (err) {
    return res.status(200).json({ error: err });
  }
});



setupWebsocket(app, server);

server.listen(PORT, () => {
  console.log(`server listening on ${PORT}`);
});
