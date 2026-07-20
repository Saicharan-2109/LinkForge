const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const ClickEvent = require('../models/ClickEvent');
const Url = require('../models/Url');

const shouldStartAnalytics = process.env.NODE_ENV !== 'test' && process.env.REDIS_URL;
let analyticsQueue = null;

if (shouldStartAnalytics) {
  // Queue writes should fail quickly so they cannot hold up a redirect.
  const queueConnection = new IORedis(process.env.REDIS_URL, {
    connectTimeout: 1000,
    enableOfflineQueue: false,
    enableReadyCheck: false,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null
  });

  queueConnection.on('error', (err) => {
    console.error('Analytics queue connection unavailable:', err.message);
  });

  analyticsQueue = new Queue('AnalyticsQueue', { connection: queueConnection });
  analyticsQueue.on('error', (err) => {
    console.error('Analytics queue unavailable:', err.message);
  });

  // BullMQ requires maxRetriesPerRequest: null for the worker's blocking commands.
  const workerConnection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });

  workerConnection.on('error', (err) => {
    console.error('Analytics worker connection unavailable:', err.message);
  });

  const worker = new Worker('AnalyticsQueue', async (job) => {
      console.log(`📝 Secretary processing click for: ${job.data.urlCode}`);

      // Save to Mongo (The Paperwork)
      await ClickEvent.create(job.data);
      await Url.findOneAndUpdate({ urlCode: job.data.urlCode }, { $inc: { clicks: 1 } });

  }, { connection: workerConnection });

  worker.on('error', (err) => {
    console.error('Analytics worker unavailable:', err.message);
  });
}

module.exports = analyticsQueue;
