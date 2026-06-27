const express = require('express');
const router = express.Router();

// Bring in our blueprints and our Spy Glass tool!
const Url = require('../models/Url');
const ClickEvent = require('../models/ClickEvent');
const parseClick = require('../utils/parseClick');

// Bring in Redis for blazing fast caching
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

// Bring in the Secretary Inbox
const analyticsQueue = require('../workers/analyticsWorker');

// @route   GET /:code
// @desc    Redirect to the long/original URL
router.get('/:code', async (req, res) => {
    try {
        const shortCode = req.params.code;

        // 1. CACHE CHECK: Ask Redis. It will return a JSON string if it finds it.
        const cachedDataString = await redis.get(shortCode);
        
        let longUrl;
        let mongoId;

        // 2. CACHE HIT:
        if (cachedDataString) {
            console.log(`⚡ CACHE HIT: Found ${shortCode} in Redis!`);
            // Unpack the JSON string back into a usable object
            const cachedData = JSON.parse(cachedDataString); 
            longUrl = cachedData.longUrl;
            mongoId = cachedData.id;
        } 
        // 3. CACHE MISS: 
        else {
            console.log(`🐌 CACHE MISS: Searching MongoDB for ${shortCode}...`);
            const url = await Url.findOne({ urlCode: shortCode });
            
            if (!url) {
                return res.status(404).json('No URL found');
            }

            longUrl = url.longUrl;
            mongoId = url._id;

            // Pack the URL and ID into a JSON string and put it on the whiteboard
            const dataToCache = JSON.stringify({ longUrl: longUrl, id: mongoId });
            await redis.set(shortCode, dataToCache, 'EX', 86400); // Expires in 24 hours
        }

        // 4. Redirect instantly!
        res.redirect(longUrl);

        // 5. Drop a sticky note in the Inbox! The Secretary handles the rest.
        const clickData = parseClick(req);
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
        });

    } catch (err) {
        console.error("Redirect Error:", err);
        res.status(500).json('Server error');
    }
});

module.exports = router;
