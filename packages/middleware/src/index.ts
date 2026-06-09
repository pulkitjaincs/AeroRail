import { Request, Response, NextFunction } from 'express';
import { logger } from '@aerorail/logger';
import { CustomError } from '@aerorail/errors';
import crypto from 'crypto';

// 1. Request ID Injection Middleware
export const requestId = (req: Request, res: Response, next: NextFunction) => {
    const reqId = req.headers['x-request-id'] || crypto.randomUUID();
    req.headers['x-request-id'] = reqId;
    res.setHeader('x-request-id', reqId);
    next();
};

// 2. Request Logger Middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const reqId = req.headers['x-request-id'];

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info({
            reqId,
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
        }, `${req.method} ${req.originalUrl} - ${res.statusCode}`);
    });

    next();
};

// 3. Central Error Handling Middleware
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: NextFunction
): void => {
    const reqId = req.headers['x-request-id'];

    if (err instanceof CustomError) {
        logger.warn({ reqId, err }, err.message);
        res.status(err.statusCode).send({ errors: err.serializeErrors() });
        return;
    }

    logger.error({ reqId, err }, 'Unhandled exception occurred');
    res.status(500).send({
        errors: [{ message: 'Something went wrong' }],
    });
};
