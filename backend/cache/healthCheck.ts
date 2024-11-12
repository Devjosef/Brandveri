import express, { Request, Response } from 'express';
import { cacheWrapper } from './cacheWrapper';
import { CacheError } from './cacheWrapper';
import redisCluster from './redisCluster';
import redisClient from './redis';

interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'error';
  message?: string;
  timestamp: string;
  details: {
    cache: boolean;
    latency?: number;
    cluster?: {
      nodesStatus: Array<{
        host: string;
        status: 'connected' | 'disconnected';
        role: 'master' | 'slave';
        replicationLag?: number;
      }>;
      totalNodes: number;
      healthyNodes: number;
    };
    memory?: {
      used: number;
      peak: number;
      fragmentationRatio: number;
    };
  };
}

async function getClusterHealth() {
  if (!redisCluster) return null;
  
  const nodes = await redisCluster.nodes('master').concat(redisCluster.nodes('slave'));
  const nodesStatus = await Promise.all(
    nodes.map(async (node) => {
      try {
        const info = await node.info();
        const role = info.includes('role:master') ? 'master' as const : 'slave' as const;
        const replicationLag = role === 'slave' ? 
          parseInt(info.match(/master_sync_left_bytes:(\d+)/)?.[1] || '0', 10) : 
          undefined;

        return {
          host: `${node.options.host}:${node.options.port}`,
          status: 'connected' as const,
          role,
          replicationLag
        };
      } catch {
        return {
          host: `${node.options.host}:${node.options.port}`,
          status: 'disconnected' as const,
          role: 'slave' as const
        };
      }
    })
  );

  return {
    nodesStatus,
    totalNodes: nodes.length,
    healthyNodes: nodesStatus.filter(n => n.status === 'connected').length
  };
}

async function getMemoryStats() {
  const info = await redisClient.info('memory');
  const used = parseInt(info.match(/used_memory:(\d+)/)?.[1] || '0', 10);
  const peak = parseInt(info.match(/used_memory_peak:(\d+)/)?.[1] || '0', 10);
  const fragmentationRatio = parseFloat(info.match(/mem_fragmentation_ratio:(\d+\.?\d*)/)?.[1] || '0');

  return { used, peak, fragmentationRatio };
}

const router = express.Router();

/**
 * Health check endpoint for cache service
 * @route GET /health/cache
 * @returns {HealthResponse} Health status of the cache service
 */
router.get('/health/cache', async (_req: Request, res: Response<HealthResponse>) => {
  const startTime = Date.now();
  
  try {
    const [isHealthy, clusterHealth, memoryStats] = await Promise.all([
      cacheWrapper.healthCheck(),
      getClusterHealth(),
      getMemoryStats()
    ]);
    
    const latency = Date.now() - startTime;
    const details: HealthResponse['details'] = {
      cache: isHealthy,
      latency,
      memory: memoryStats
    };

    if (clusterHealth) {
      details.cluster = clusterHealth;
    }

    const isSystemHealthy = isHealthy && 
      (!clusterHealth || (clusterHealth.healthyNodes / clusterHealth.totalNodes) >= 0.5);

    if (isSystemHealthy) {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        details
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        message: 'Cache service degraded',
        timestamp: new Date().toISOString(),
        details
      });
    }
  } catch (error) {
    const errorMessage = error instanceof CacheError 
      ? error.message 
      : 'Unknown error occurred during health check';

    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: errorMessage,
      details: {
        cache: false
      }
    });
  }
});

export default router;