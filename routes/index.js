const express = require('express');
const router = express.Router();

// Bring in our blueprints and our Spy Glass tool!
const Url = require('../models/Url');
const ClickEvent = require('../models/ClickEvent');
const parseClick = require('../utils/parseClick');

// Bring in Redis for blazing fast caching
const Redis = require('ioredis');
const redis = process.env.NODE_ENV !== 'test' && process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, {
        connectTimeout: 1000,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null
    })
    : null;

if (redis) {
    redis.on('error', (err) => {
        console.error('Redis cache unavailable:', err.message);
    });
}

// Bring in the Secretary Inbox
const analyticsQueue = require('../workers/analyticsWorker');

// @route   GET /:code
// @desc    Redirect to the long/original URL
router.get('/:code', async (req, res) => {
    try {
        const shortCode = req.params.code;

        // 1. CACHE CHECK: Ask Redis. It will return a JSON string if it finds it.
        let cachedDataString = null;
        if (redis) {
            try {
                cachedDataString = await redis.get(shortCode);
            } catch (err) {
                console.error('Redis cache read failed:', err.message);
            }
        }
        
        let longUrl;
        let mongoId;

        // 2. CACHE HIT:
        if (cachedDataString) {
            console.log(`⚡ CACHE HIT: Found ${shortCode} in Redis!`);
            try {
                // Unpack the JSON string back into a usable object.
                const cachedData = JSON.parse(cachedDataString);
                longUrl = cachedData.longUrl;
                mongoId = cachedData.id;
            } catch (err) {
                console.error('Redis cache data was invalid:', err.message);
            }
        } 
        // 3. CACHE MISS: 
        if (!longUrl || !mongoId) {
            console.log(`🐌 CACHE MISS: Searching MongoDB for ${shortCode}...`);
            const url = await Url.findOne({ urlCode: shortCode });
            
            if (!url) {
                return res.status(404).json('No URL found');
            }

            longUrl = url.longUrl;
            mongoId = url._id;

            // Pack the URL and ID into a JSON string and put it on the whiteboard
            const dataToCache = JSON.stringify({ longUrl: longUrl, id: mongoId });
            if (redis) {
                redis.set(shortCode, dataToCache, 'EX', 86400)
                    .catch((err) => console.error('Redis cache write failed:', err.message));
            }
        }

        // 4. Redirect instantly!
        res.redirect(longUrl);

        // 5. Drop a sticky note in the Inbox! The Secretary handles the rest.
        const clickData = parseClick(req);
        if (analyticsQueue) {
            analyticsQueue.add('new-click', {
                urlId: mongoId,
                urlCode: shortCode,
                country: clickData.country,
                city: clickData.city,
                device: clickData.device,
                browser: clickData.browser,
                os: clickData.os,
                referrer: clickData.referrer,
                ipHash: clickData.ipHash
            }).catch((err) => console.error('Analytics queue unavailable:', err.message));
        }

    } catch (err) {
        console.error("Redirect Error:", err);
        res.status(500).json('Server error');
    }
});

module.exports = router;
