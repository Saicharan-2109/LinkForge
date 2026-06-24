const jwt = require('jsonwebtoken');

// The "next" parameter just means "Let them through the door!"
module.exports = function(req, res, next) {
    // 1. Look for the wristband in the header (The invisible name tag)
    const wristband = req.header('x-auth-token');

    // 2. If they didn't bring a wristband at all, kick them out!
    if (!wristband) {
        return res.status(401).json('Access denied. No wristband provided!');
    }

    try {
        // 3. Put the wristband under the blacklight to verify it
        const decoded = jwt.verify(wristband, process.env.JWT_SECRET);

        // 4. It's real! We stick a VIP badge on their shirt so the next room knows who they are
        req.user = decoded.userId;

        // 5. Open the door!
        next();
    } catch (err) {
        // If the wristband is fake or expired
        res.status(401).json('Wristband is invalid or expired.');
    }
};