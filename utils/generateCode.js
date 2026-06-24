const { customAlphabet } = require('nanoid');

// 1. The 62 Colors: We give the robot exact instructions on what blocks to use
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

// 2. The Rule: Build a tower exactly 6 blocks high using only those colors
const nanoid = customAlphabet(alphabet, 6);

// 3. The Robot: Every time we call this, it hands us a new 6-block tower
const generateCode = () => {
    return nanoid();
};

module.exports = generateCode;