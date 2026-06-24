const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    urlCode: {
        type: String,
        required: true,
        unique: true
    },
    longUrl: {
        type: String,
        required: true
    },
    shortUrl: {
        type: String,
        required: true
    },
    // We keep the dumb counter just so the Dashboard can load the total number instantly
    clicks: {
        type: Number,
        default: 0 
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 2592000
    }
});

// Notice how the giant analytics array is GONE! 
module.exports = mongoose.model('Url', urlSchema);