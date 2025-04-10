require('dotenv').config(); // Load environment variables from .env file
const mongoose = require('mongoose');

// MongoDB connection URL
const mongoURL = process.env.MONGODB_URI;

// Connect to MongoDB
async function connectDB() {
    mongoose.connect(mongoURL)
    .then(() => {
        console.log('Connected to MongoDB successfully');
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error);
    });
}

// Export mongoose for use in other files
module.exports = connectDB;