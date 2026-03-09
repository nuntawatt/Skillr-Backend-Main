import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client: Redis | null = null;
  private initializingClient: Promise<Redis | null> | null = null;
  private hasLoggedUnavailable = false;
  private hasLoggedMissingConfig = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleDestroy(): Promise<void> {
    if (!this.client) {
      return;
    }

    await this.client.quit().catch(() => {
      this.client?.disconnect();
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const client = await this.getClient();
    if (!client) {
      return null;
    }

    try {
      const value = await client.get(key);
      if (value == null) {
        this.logDebug(`MISS ${key}`);
        return null;
      }

      this.logDebug(`HIT ${key}`);
      return JSON.parse(value) as T;
    } catch (error) {
      this.logUnavailableOnce(error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const client = await this.getClient();
    if (!client) {
      return;
    }

    try {
      await client.set(key, JSON.stringify(value), 'EX', Math.max(1, ttlSeconds));
      this.logDebug(`STORE ${key} ttl=${Math.max(1, ttlSeconds)}s`);
    } catch (error) {
      this.logUnavailableOnce(error);
    }
  }

  async del(keys: string | string[]): Promise<void> {
    const client = await this.getClient();
    if (!client) {
      return;
    }

    const keyList = Array.isArray(keys) ? keys : [keys];
    if (!keyList.length) {
      return;
    }

    try {
      await client.del(...keyList);
    } catch (error) {
      this.logUnavailableOnce(error);
    }
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    const client = await this.getClient();
    if (!client) {
      return;
    }

    try {
      let cursor = '0';

      do {
        const [nextCursor, keys] = await client.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
        cursor = nextCursor;

        if (keys.length) {
          await client.del(...keys);
        }
      } while (cursor !== '0');
    } catch (error) {
      this.logUnavailableOnce(error);
    }
  }

  async wrap<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  private async getClient(): Promise<Redis | null> {
    if (this.client?.status === 'ready') {
      return this.client;
    }

    if (this.initializingClient) {
      return this.initializingClient;
    }

    this.initializingClient = this.initializeClient();
    const client = await this.initializingClient;
    this.initializingClient = null;
    return client;
  }

  private async initializeClient(): Promise<Redis | null> {
    const redisEnabled = this.configService.get<string>('REDIS_ENABLED')?.trim().toLowerCase();
    if (redisEnabled === 'false') {
      return null;
    }

    const redisUrl = this.configService.get<string>('REDIS_URL')?.trim();

    if (!redisUrl) {
      this.logMissingConfigOnce();
      return null;
    }

    const client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 1000,
    });

    client.on('error', (error) => {
      this.logUnavailableOnce(error);
    });

    try {
      await client.connect();
      this.client = client;
      this.hasLoggedUnavailable = false;
      this.hasLoggedMissingConfig = false;
      this.logger.log('Redis cache connected');
      return client;
    } catch (error) {
      client.disconnect();
      this.logUnavailableOnce(error);
      return null;
    }
  }

  private logUnavailableOnce(error: unknown): void {
    if (this.hasLoggedUnavailable) {
      return;
    }

    this.hasLoggedUnavailable = true;
    const message = error instanceof Error ? error.message : 'unknown error';
    this.logger.warn(`Redis cache unavailable, falling back to database reads: ${message}`);
  }

  private logMissingConfigOnce(reason?: string): void {
    if (this.hasLoggedMissingConfig) {
      return;
    }

    this.hasLoggedMissingConfig = true;
    const suffix = reason ? `: ${reason}` : '';
    this.logger.warn(
      `Redis cache disabled because REDIS_URL is not configured${suffix}`,
    );
  }

  private logDebug(message: string): void {
    if (this.configService.get<string>('CACHE_DEBUG')?.trim().toLowerCase() !== 'true') {
      return;
    }

    this.logger.debug(message);
  }
}