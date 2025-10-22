
import Redis from 'ioredis';
import config from '../config'; class RedisClient {
  private client: Redis;
  private isConnected: boolean = false;

  constructor() {
    this.client = new Redis({
      host: config.REDIS_HOST || 'localhost',
      port: parseInt(config.REDIS_PORT || '6379'),
      password: config.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableReadyCheck: false,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    this.client.on('connect', () => {
      console.log('Redis connected successfully ! ');
      this.isConnected = true;
    });

    this.client.on('error', (err) => {
      console.error(' Redis connection error', err);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.log('Redis connection is disconnected.');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
        this.isConnected = true;
      } catch (error) {
        console.error('Redis connection :', error);
        this.isConnected = false;
      }
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      if (!this.isConnected) await this.connect();
      return await this.client.get(key);
    } catch (error) {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (!this.isConnected) await this.connect();
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.error('Redis SET err:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (!this.isConnected) await this.connect();
      await this.client.del(key);
    } catch (error) {
      console.error('Redis DEL err:', error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      if (!this.isConnected) await this.connect();
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      console.error('Redis DEL PATTERN err:', error);
    }
  }

  // cache invalidation function 
  async invalidateUserCache(tenantDomain: string, userId: string): Promise<void> {
    const patterns = [
      `user:${tenantDomain}:${userId}:data`,
      `permission:${tenantDomain}:user:${userId}:*`,
      `permission:${tenantDomain}:check:${userId}:*`,
    ];
    for (const pattern of patterns) {
      await this.delPattern(pattern);
    }
  }

  async invalidatePermissionCache(tenantDomain: string, permissionId: string): Promise<void> {
    const patterns = [
      `permission:${tenantDomain}:single:${permissionId}`,
      `permission:${tenantDomain}:all:*`,
    ];
    for (const pattern of patterns) {
      await this.delPattern(pattern);
    }
  }

  async invalidateAllPermissionCache(tenantDomain: string): Promise<void> {
    const pattern = `permission:${tenantDomain}:*`;
    await this.delPattern(pattern);
  }

  // all user Cache remove
  async invalidateAllUserCache(tenantDomain: string): Promise<void> {
    const pattern = `user:${tenantDomain}:*`;
    await this.delPattern(pattern);
    console.log(`All user cache cleared for ${tenantDomain}`);
  }

  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.disconnect();
        this.isConnected = false;
        console.log(' Redis disconnected');
      }
    } catch (error) {
      console.error('Redis disconnection error', error);
    }
  }
}

export const redisClient = new RedisClient();