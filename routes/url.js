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
    // We now accept a longUrl AND an optional customAlias!
    const { longUrl, customAlias } = req.body;
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000'; 

    // 1. Bouncer Check: Is the URL actually real?
    if (!validUrl.isUri(longUrl)) {
        return res.status(401).json('Invalid original URL');
    }

    try {
        let urlCode;

        // 2. The "Dibs" Rule (Custom Alias)
        if (customAlias) {
            // Check if someone already called dibs on this exact word
            const aliasExists = await Url.findOne({ urlCode: customAlias });
            if (aliasExists) {
                return res.status(400).json('That custom alias is already taken! Try another.');
            }
            urlCode = customAlias; // The box is empty, they can have it!
        } else {
            // 3. No custom alias? Let the Lego Robot build a random Base62 code
            urlCode = generateCode();
        }

        // 4. Print the final tiny ticket
        const shortUrl = `${baseUrl}/${urlCode}`;

        // 5. Fill out the paperwork and lock it in the database vault
        let url = new Url({
            user:req.user,
            urlCode,
            longUrl,
            shortUrl
        });

        await url.save();

        // 6. Hand the shiny new ticket to the user!
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

module.exports = router;