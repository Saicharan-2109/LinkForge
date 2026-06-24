const express = require('express');
const router = express.Router();

// Bring in our blueprints and our Spy Glass tool!
const Url = require('../models/Url');
const ClickEvent = require('../models/ClickEvent');
const parseClick = require('../utils/parseClick');

// @route   GET /:code
// @desc    Redirect to the long/original URL
router.get('/:code', async (req, res) => {
    try {
        // 1. Ask the database (MongoDB) to find the short link
        const url = await Url.findOne({ urlCode: req.params.code });

        if (url) {
            // 2. Add a click to the basic counter
            url.clicks++;
            await url.save();

            // 3. THE DEEP DIVE: Extract User Data
            const clickData = parseClick(req);

            // 4. Save the neatly packaged data to MongoDB
            await ClickEvent.create({
                urlId: url._id,
                urlCode: url.urlCode,
                country: clickData.country,
                city: clickData.city,
                device: clickData.device,
                browser: clickData.browser,
                os: clickData.os,
                referrer: clickData.referrer,
                ipHash: clickData.ipHash
            });

            // 5. Redirect them to the long link!
            return res.redirect(url.longUrl);
        } else {
            return res.status(404).json('No URL found');
        }
    } catch (err) {
        console.error(err);
        res.status(500).json('Server error');
    }
});

module.exports = router;