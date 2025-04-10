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
    const data = await userModel.findOne({ username: user });
    // console.log(data);
    if (!data) return res.status(400).json({ message: "User not found" });
    if (data.password !== pass) return res.status(400).json({ message: "Incorrect password" });
    res.status(200).json({ message: "Login successful", user: data.username });
});

app.post('/loginDiscord', async (req, res) => {

    const token = req.body.token;
    const fragment = new URLSearchParams(token.location.hash.slice(1));
    const accessToken = getWithExpiry('access_token') || fragment.get('access_token');
    const tokenType = getWithExpiry('token_type') || fragment.get('token_type');
    fetch('https://discord.com/api/users/@me', {
        headers: {
            authorization: `${tokenType} ${accessToken}`,
        },
    })
        .then(result => result.json())
        .then(async response => {
            console.log(response);
            const { id } = response;
            try {
                const data = await userModel.findOne({ discord_id: id });
                if (!data) return res.status(400).json({ message: "User not found" });
                res.status(200).json(data.username);
            }
            catch (error) {
                return res.status(400).json('Error:', error);
            }
    });
    
});

app.get('/getUser', async (req, res) => {
    const user = req.query.username;
    const data = await userModel.findOne({ username: user });
    if (!data) return res.status(400).json({ message: "User not found" });
    res.status(200).json(data);
});



