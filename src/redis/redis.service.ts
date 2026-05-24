import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Add a token to the denylist with a TTL equal to its remaining lifetime.
   * Self-evicts exactly when the token would have expired, so the denylist
   * never grows unbounded.
   */
  async denylistToken(token: string, expiresAtUnix: number): Promise<void> {
    const ttl = expiresAtUnix - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.redis.set(`denylist:${token}`, '1', 'EX', ttl);
    }
  }

  async isDenylisted(token: string): Promise<boolean> {
    const result = await this.redis.get(`denylist:${token}`);
    return result !== null;
  }
}