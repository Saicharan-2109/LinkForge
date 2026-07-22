const mongoose = require('mongoose');

const clickEventSchema = new mongoose.Schema({
    // 1. WHICH link was clicked? (Ties this click back to the specific URL ticket)
    urlId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Url',
        required: true
    },
    urlCode: {
        type: String,
        required: true
    },

    // 2. WHEN was it clicked?
    timestamp: { 
        type: Date, 
        default: Date.now 
    },

    // 3. WHERE are they from?
    country: { 
        type: String,
        default: 'Unknown' 
    },
    city: { 
        type: String,
        default: 'Unknown' },

    // 4. WHAT are they using?
    device: { 
        type: String,
        default: 'Unknown' 
    },
    browser: { 
        type: String,
        default: 'Unknown' 
    },
    os: { 
        type: String,
        default: 'Unknown' 
    },

    // 5. HOW did they get here?
    referrer: { type: String, default: 'Direct' },

    // 6. WHO is this? (Hashed IP address for unique counting)
    ipHash: { type: String, required: true }
});

module.exports = mongoose.model('ClickEvent', clickEventSchema);