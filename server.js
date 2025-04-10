const express = require('express');
const connectDB = require('./db.js');
const userModel = require('./Models/user.js');
const PORT = process.env.PORT || 8000;
const app = express();

connectDB();
app.use(express.json())

app.listen(PORT, () => {
    console.log(`server listening on ${PORT}`)
})

app.get('/', (req, res) => {
    res.send('Hello World!')
});

app.post('/login', async (req, res) => {
    const user = req.body.username;
    const pass = req.body.password;
    const data = await userModel.findOne({username: user});
    // console.log(data);
    if(!data) return res.status(400).json({message: "User not found"});
    if(data.password !== pass) return res.status(400).json({message: "Incorrect password"});
    res.status(200).json({message: "Login successful", data});
});

app.post('/loginDiscord', async (req, res) => {
    const discordId = req.body.discordId;
    const data = await userModel.findOne({discord_id: discordId});
    if(!data) return res.status(400).json({message: "User not found"});
    res.status(200).json({message: "Login successful", data});
});

app.get('/getUser', async (req, res) => {
    const user = req.query.username;
    const data = await userModel.findOne({username: user});
    if(!data) return res.status(400).json({message: "User not found"});
    res.status(200).json(data);
});



