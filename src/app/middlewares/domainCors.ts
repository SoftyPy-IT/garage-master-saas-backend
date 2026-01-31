import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Tenant } from '../modules/tenant/tenant.model';
import config from '../config';
import { redisClient } from '../utils/redis';


const CACHE_TTL_SECONDS = 5 * 60;

async function isDomainAllowed(origin: string): Promise<boolean> {
    try {
        const cacheKey = `cors:domain:${origin}`;
        const cachedValue = await redisClient.get(cacheKey);

        if (cachedValue !== null) {
            return cachedValue === 'true';
        }
        if (
            process.env.NODE_ENV === 'development' &&
            config.DEV_ALLOWED_ORIGINS.includes(origin)
        ) {
            await redisClient.set(cacheKey, 'true', CACHE_TTL_SECONDS);
            return true;
        }

        const tenant = await Tenant.findOne({ domain: origin, isActive: true });
        if (!tenant) {
            const secondaryTenant = await Tenant.findOne({
                'domains.domain': origin,
                'domains.isActive': true,
            });

            const isAllowed = !!secondaryTenant;
            await redisClient.set(cacheKey, isAllowed ? 'true' : 'false', CACHE_TTL_SECONDS);
            return isAllowed;
        }
        await redisClient.set(cacheKey, 'true', CACHE_TTL_SECONDS);
        return true;
    } catch (error) {
        console.error('❌ Domain validation error:', error);
        return false;
    }
}

export const dynamicCors = (options: cors.CorsOptions = {}) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const origin = req.headers.origin;

        // If no origin, disable CORS
        if (!origin) {
            return cors({
                origin: false,
                credentials: true,
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
                allowedHeaders: ['Content-Type', 'Authorization'],
                ...options,
            })(req, res, next);
        }
        const isAllowed = await isDomainAllowed(origin);

        if (isAllowed) {
            return cors({
                origin: origin,
                credentials: true,
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
                allowedHeaders: ['Content-Type', 'Authorization'],
                ...options,
            })(req, res, next);
        } else {
            console.warn(`🚫 Blocked CORS request from origin: ${origin}`);
            return cors({
                origin: false,
                credentials: true,
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
                allowedHeaders: ['Content-Type', 'Authorization'],
                ...options,
            })(req, res, next);
        }
    };
};
export async function clearDomainCache(): Promise<void> {
    await redisClient.delPattern('cors:domain:*');
    console.log(' All CORS domain cache cleared.');
}
