const express = require('express');
const router = express.Router();
const validUrl = require('valid-url');
const verifyToken = require('../middleware/verifyToken');
// Bring in the Database Blueprint and our Lego Robot!
const Url = require('../models/Url'); 
const generateCode = require('../utils/generateCode');
const ClickEvent = require('../models/ClickEvent'); 

// @route   POST /api/url/shorten
// @desc    Create short URL (The Forge)
router.post('/shorten',verifyToken ,async (req, res) => {
    const { longUrl } = req.body;
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000'; 

    // 1. Bouncer Check: Is the URL actually real?
    if (!validUrl.isUri(longUrl)) {
        return res.status(401).json('Invalid original URL');
    }

    try {
        // 2. Let the Lego Robot build a random Base62 code
        const urlCode = generateCode();

        // 3. Print the final tiny ticket
        const shortUrl = `${baseUrl}/${urlCode}`;

        // 4. Fill out the paperwork and lock it in the database vault
        let url = new Url({
            user:req.user,
            urlCode,
            longUrl,
            shortUrl
        });

        await url.save();

        // 5. Hand the shiny new ticket to the user!
        res.json(url);

    } catch (err) {
        console.error(err);
        res.status(500).json('Server error while forging link');
    }
});

// @route   GET /api/url/dashboard
// @desc    Get all links created by the logged-in user
router.get('/dashboard', verifyToken, async (req, res) => {
    try {
        // 1. The server runs to the database and says: 
        // "Find EVERY ticket that has this user's exact VIP ID stamped on it!"
        const myLinks = await Url.find({ user: req.user }).sort({ createdAt: -1 });

        // 2. Hand the whole stack of tickets back to the user
        res.json(myLinks);
    } catch (err) {
        console.error(err);
        res.status(500).json('Server error while loading dashboard');
    }
});

router.get('/analytics', verifyToken, async (req, res) => {
       try {
           // 1. Find all the short links owned by this specific user
           const myLinks = await Url.find({ user: req.user });
           
           // Extract just the ID tickets for those links
           const linkIds = myLinks.map(link => link._id);

           // 2. Go into the vault and grab EVERY click event tied to those IDs
           const allClicks = await ClickEvent.find({ urlId: { $in: linkIds } });

           // 3. Hand the entire pile of click data back to the frontend!
           res.json(allClicks);
       } catch (err) {
           console.error(err);
           res.status(500).json('Server error loading analytics');
       }
   });

// @route   GET /api/url/analytics/:urlCode
// @desc    Get analytics for ONE specific link
router.get('/analytics/:urlCode', verifyToken, async (req, res) => {
    try {
        // 1. Find the exact link the user is asking about (and make sure they own it!)
        const url = await Url.findOne({ urlCode: req.params.urlCode, user: req.user });
        
        if (!url) {
            return res.status(404).json('Link not found or unauthorized');
        }

        // 2. Go to the vault and grab ONLY the clicks for this specific link's ID
        // .sort({ timestamp: 1 }) will order them oldest to newest for a nice graph!
        const clicks = await ClickEvent.find({ urlId: url._id }).sort({ timestamp: 1 });

        // 3. Hand the specific link info and its clicks back to the frontend!
        res.json({ url, clicks });
    } catch (err) {
        console.error(err);
        res.status(500).json('Server error loading specific analytics');
    }
});

module.exports = router;
