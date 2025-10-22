// src/middlewares/dynamicCors.ts
import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Tenant } from '../modules/tenant/tenant.model';
import config from '../config';


let domainCache: { [key: string]: boolean } = {};
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function isDomainAllowed(origin: string): Promise<boolean> {
    const now = Date.now();
    if (domainCache[origin] !== undefined && now < cacheExpiry) {
        return domainCache[origin];
    }

    if (process.env.NODE_ENV === 'development' && config.DEV_ALLOWED_ORIGINS.includes(origin)) {
        domainCache[origin] = true;
        cacheExpiry = now + CACHE_TTL;
        return true;
    }

    try {
        const tenant = await Tenant.findOne({
            domain: origin,
            isActive: true
        });

        if (!tenant) {
            const secondaryTenant = await Tenant.findOne({
                'domains.domain': origin,
                'domains.isActive': true
            });

            const isAllowed = !!secondaryTenant;
            domainCache[origin] = isAllowed;
            cacheExpiry = now + CACHE_TTL;

            return isAllowed;
        }
        domainCache[origin] = true;
        cacheExpiry = now + CACHE_TTL;

        return true;
    } catch (error) {
        console.error('ডোমেইন যাচাই ত্রুটি:', error);
        return false;
    }
}
export function clearDomainCache(): void {
    domainCache = {};
    cacheExpiry = 0;
}
export const dynamicCors = (options: cors.CorsOptions = {}) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const origin = req.headers.origin;
        if (!origin) {
            return cors({
                origin: false,
                credentials: true,
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
                allowedHeaders: ['Content-Type', 'Authorization'],
                ...options
            })(req, res, next);
        }
        const isAllowed = await isDomainAllowed(origin);

        if (isAllowed) {
            return cors({
                origin: true,
                credentials: true,
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
                allowedHeaders: ['Content-Type', 'Authorization'],
                ...options
            })(req, res, next);
        } else {
            return cors({
                origin: false,
                credentials: true,
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
                allowedHeaders: ['Content-Type', 'Authorization'],
                ...options
            })(req, res, next);
        }
    };
};