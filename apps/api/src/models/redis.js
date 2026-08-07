'use strict';

const Redis = require('ioredis');
const config = require('../config');

let client;

function getRedis() {
  if (!client) {
    client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      maxRetriesPerRequest: 2,
      lazyConnect: true,
    });
    client.on('error', (err) => console.warn('Redis error:', err.message));
  }
  return client;
}

async function ensureRedis() {
  const redis = getRedis();
  if (redis.status !== 'ready') {
    try {
      await redis.connect();
    } catch (err) {
      if (!/already connecting|already connected/i.test(err.message)) {
        throw err;
      }
    }
  }
  return redis;
}

module.exports = { getRedis, ensureRedis };
