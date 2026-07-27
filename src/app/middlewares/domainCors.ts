import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Tenant } from '../modules/tenant/tenant.model';
import config from '../config';
import { redisClient } from '../utils/redis';

const CACHE_TTL_SECONDS = 5 * 60;

const LOCALHOST_ORIGIN_REGEX = /^https?:\/\/localhost(:\d+)?$/;
const TENANT_LOCALHOST_ORIGIN_REGEX =
  /^https?:\/\/(.+)\.localhost(:\d+)?$/;

function extractTenantDomainFromLocalOrigin(origin: string): string | null {
  const match = origin.match(TENANT_LOCALHOST_ORIGIN_REGEX);
  return match?.[1] ?? null;
}

function isPlainLocalhostOrigin(origin: string): boolean {
  return LOCALHOST_ORIGIN_REGEX.test(origin);
}

function isTenantLocalhostOrigin(origin: string): boolean {
  return TENANT_LOCALHOST_ORIGIN_REGEX.test(origin);
}

function isDevelopmentLocalOrigin(origin: string): boolean {
  if (process.env.NODE_ENV !== 'development') {
    return false;
  }

  if (config.DEV_ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }

  if (isPlainLocalhostOrigin(origin)) {
    return true;
  }

  // e.g. http://app.trustautosolution.com.localhost:5173
  if (isTenantLocalhostOrigin(origin)) {
    return true;
  }

  return false;
}

async function isDomainAllowed(origin: string): Promise<boolean> {
  // Always allow local dev origins first (bypasses stale Redis deny cache)
  if (isDevelopmentLocalOrigin(origin)) {
    return true;
  }

  try {
    const cacheKey = `cors:domain:${origin}`;
    const cachedValue = await redisClient.get(cacheKey);

    if (cachedValue !== null) {
      return cachedValue === 'true';
    }

    if (isTenantLocalhostOrigin(origin)) {
      const tenantDomain = extractTenantDomainFromLocalOrigin(origin);
      if (tenantDomain) {
        const tenant = await Tenant.findOne({
          domain: tenantDomain,
          isActive: true,
        });

        if (tenant) {
          await redisClient.set(cacheKey, 'true', CACHE_TTL_SECONDS);
          return true;
        }
      }
    }

    const tenant = await Tenant.findOne({ domain: origin, isActive: true });
    if (!tenant) {
      const secondaryTenant = await Tenant.findOne({
        'domains.domain': origin,
        'domains.isActive': true,
      });

      const isAllowed = !!secondaryTenant;
      await redisClient.set(
        cacheKey,
        isAllowed ? 'true' : 'false',
        CACHE_TTL_SECONDS,
      );
      return isAllowed;
    }

    await redisClient.set(cacheKey, 'true', CACHE_TTL_SECONDS);
    return true;
  } catch (error) {
    console.error('❌ Domain validation error:', error);
    return process.env.NODE_ENV === 'development';
  }
}

const corsOptions = (
  origin: string | false,
  options: cors.CorsOptions = {},
): cors.CorsOptions => ({
  origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  ...options,
});

export const dynamicCors = (options: cors.CorsOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    if (!origin) {
      return cors(corsOptions(false, options))(req, res, next);
    }

    const isAllowed = await isDomainAllowed(origin);

    return cors(corsOptions(isAllowed ? origin : false, options))(
      req,
      res,
      next,
    );
  };
};

export async function clearDomainCache(): Promise<void> {
  await redisClient.delPattern('cors:domain:*');
}
