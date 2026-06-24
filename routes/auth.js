const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // The VIP List Blueprint we made yesterday

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // 1. Check if they already have an account
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json('You already have an account! Go login.');
        }

        // 2. Create the blank profile using the blueprint
        user = new User({ name, email, password });

        // 3. The Password Blender (Hash the password)
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // 4. Save the scrambled password to the database
        await user.save();

        // 5. Print the Golden Wristband (JWT)
        const payload = { userId: user._id };
        const wristband = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' }); // Lasts 1 day

        // 6. Hand the wristband to the user
        res.json({ wristband });

    } catch (err) {
        console.error(err);
        res.status(500).json('Server error at the registration desk');
    }
});

// @route   POST /api/auth/login
// @desc    Login and get a wristband
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Find the user by their email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json('Invalid email or password');
        }

        // 2. Compare the password they typed with the blended password in the database
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json('Invalid email or password');
        }

        // 3. Password matches! Print a new Golden Wristband (JWT)
        const payload = { userId: user._id };
        const wristband = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({ wristband });

    } catch (err) {
        console.error(err);
        res.status(500).json('Server error at the login desk');
    }
});

module.exports = router;