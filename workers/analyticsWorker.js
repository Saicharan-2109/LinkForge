const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const ClickEvent = require('../models/ClickEvent');
const Url = require('../models/Url');

// Connect to Upstash Redis
const connection = new Redis(process.env.REDIS_URL);

// 1. Create the Inbox (The Queue)
const analyticsQueue = new Queue('AnalyticsQueue', { connection });

// 2. Hire the Secretary (The Worker)
const worker = new Worker('AnalyticsQueue', async (job) => {
    console.log(`📝 Secretary processing click for: ${job.data.urlCode}`);
    
    // Save to Mongo (The Paperwork)
    await ClickEvent.create(job.data);
    await Url.findOneAndUpdate({ urlCode: job.data.urlCode }, { $inc: { clicks: 1 } });
    
}, { connection });

module.exports = analyticsQueue;
