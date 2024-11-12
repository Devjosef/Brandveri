import Redis from 'ioredis';

const nodes = [
  { host: process.env.REDIS_HOST_1 || '127.0.0.1', port: 6379 },
  { host: process.env.REDIS_HOST_2 || '127.0.0.1', port: 6380 },
  { host: process.env.REDIS_HOST_3 || '127.0.0.1', port: 6381 }
];

const redisCluster = new Redis.Cluster(nodes, {
  redisOptions: {
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  },
  scaleReads: 'slave', // Read from slave nodes
  maxRedirections: 16,
  retryDelayOnFailover: 300
});

export default redisCluster;