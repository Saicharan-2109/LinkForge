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
// Redis improves shared rate limiting but must not make the API unavailable.
const redisClient = process.env.NODE_ENV !== 'test' && process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, {
        connectTimeout: 1000,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null
    })
    : null;

if (redisClient) {
    redisClient.on('error', (err) => {
        console.error('Redis rate-limit store unavailable:', err.message);
    });
}

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    passOnStoreError: true,
    
    // THIS IS THE MAGIC LINE: Give the bouncer the Redis Walkie-Talkie
    store: redisClient ? new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
    }) : undefined,
    
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
if (process.env.NODE_ENV !== 'test') {
connectDB();
}

// ==========================================
// ROUTES
// ==========================================
app.get('/api/health', (req, res) => {
    res.send('The Forge is hot and running! 🔥');
});
app.use('/api/url', require('./routes/url'));
app.use('/api/auth', require('./routes/auth'));
app.use('/', require('./routes/index'));  // catch-all /:code must be LAST
// ==========================================
// START SERVER (Only if NOT testing)
// ==========================================
const PORT = process.env.PORT || 5000;

// We only listen on the port if we are NOT running tests
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}

// We MUST export the app so Supertest can use it in our test files!
module.exports = app;
