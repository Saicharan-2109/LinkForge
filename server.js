require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');
const { RedisStore } = require('rate-limit-redis');



const app = express();

// ==========================================
// MIDDLEWARE (The Bouncers)
// ==========================================
app.use(express.json());
// Connect the Walkie-Talkie to Upstash
const redisClient = new Redis(process.env.REDIS_URL);

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    
    // THIS IS THE MAGIC LINE: Give the bouncer the Redis Walkie-Talkie
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
    }),
    
    handler: (req, res) => {
        res.status(429).json('Take a breath! Too many requests. Try again in 15 minutes.');
    }
});


// Apply the shield to ALL API routes
app.use('/api', apiLimiter);
app.use(cors());
// Add this AFTER your middleware block (after app.use(cors()))
app.use(express.static('public'));


// ==========================================
// DATABASE CONNECTION (Async / Await)
// ==========================================
const connectDB = async () => {
    try {
        // Try to connect to the giant Mongo URI
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected to LinkForge!');
    } catch (error) {
        // If it fails, log the error and crash the app intentionally
        console.error('❌ Database connection error:', error.message);
        process.exit(1); 
    }
};

// Fire the engine!
connectDB();

// ==========================================
// ROUTES
// ==========================================
app.get('/', (req, res) => {
    res.send('The Forge is hot and running! 🔥');
});
app.use('/api/url', require('./routes/url'));
app.use('/api/auth', require('./routes/auth'));
app.use('/', require('./routes/index'));  // catch-all /:code must be LAST

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});