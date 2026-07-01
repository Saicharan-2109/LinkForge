const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const ClickEvent = require('../models/ClickEvent');
const Url = require('../models/Url');

// BullMQ requires maxRetriesPerRequest: null for blocking commands
const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

// 1. Create the Inbox (The Queue)
const analyticsQueue = new Queue('AnalyticsQueue', { connection });

// 2. Hire the Secretary (The Worker) — Worker needs its OWN connection (BullMQ requirement)
const workerConnection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

const worker = new Worker('AnalyticsQueue', async (job) => {
    console.log(`📝 Secretary processing click for: ${job.data.urlCode}`);
    
    // Save to Mongo (The Paperwork)
    await ClickEvent.create(job.data);
    await Url.findOneAndUpdate({ urlCode: job.data.urlCode }, { $inc: { clicks: 1 } });
    
}, { connection: workerConnection });

module.exports = analyticsQueue;
