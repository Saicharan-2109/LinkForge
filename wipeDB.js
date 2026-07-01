require('dotenv').config();
const mongoose = require('mongoose');
const Url = require('./models/Url');
const ClickEvent = require('./models/ClickEvent');

async function wipeDatabase() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected!');

        console.log('Deleting all old URLs...');
        await Url.deleteMany({});
        
        console.log('Deleting all old Click Events...');
        await ClickEvent.deleteMany({});

        console.log('✅ Database wiped successfully! All old "localhost:5000" links are gone.');
        process.exit(0);
    } catch (err) {
        console.error('Error wiping database:', err);
        process.exit(1);
    }
}

wipeDatabase();
