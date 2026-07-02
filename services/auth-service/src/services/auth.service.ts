import crypto from 'crypto';
import { prisma } from '@aerorail/db';
import { redis } from '@aerorail/redis';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/jwt.js';
import { BadRequestError, UnauthorizedError, ConflictError } from '@aerorail/errors';
import { JWTPayload } from '@aerorail/types';

export class AuthService {
    private static hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    static async register(email: string, password: string, firstName?: string, lastName?: string) {
        const hashedPassword = await hashPassword(password);
        const userId = crypto.randomUUID();
        const now = new Date();

        let user;
        try {
            user = await prisma.users.create({
                data: {
                    user_id: userId,
                    email,
                    password_hash: hashedPassword,
                    first_name: firstName || null,
                    last_name: lastName || null,
                    role: 'USER',
                    created_at: now,
                    updated_at: now,
                },
            });
        } catch (error: any) {
            if (error.code === 'P2002') {
                throw new ConflictError('Email already in use');
            }
            throw error;
        }

        const payload: JWTPayload = {
            userId: user.user_id,
            email: user.email,
            role: user.role,
        };

        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);
        const tokenHash = this.hashToken(refreshToken);
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await prisma.refresh_tokens.create({
            data: {
                id: crypto.randomUUID(),
                token_hash: tokenHash,
                user_id: user.user_id,
                expires_at: expiresAt,
            },
        });

        return {
            user: {
                userId: user.user_id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
            },
            accessToken,
            refreshToken,
        };
    }

    static async login(email: string, password: string) {
        const user = await prisma.users.findUnique({
            where: { email },
        });

        if (!user) {
            throw new UnauthorizedError('Invalid credentials');
        }

        const isMatch = await comparePassword(password, user.password_hash);
        if (!isMatch) {
            throw new UnauthorizedError('Invalid credentials');
        }

        const payload: JWTPayload = {
            userId: user.user_id,
            email: user.email,
            role: user.role,
        };

        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);
        const tokenHash = this.hashToken(refreshToken);
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await prisma.refresh_tokens.create({
            data: {
                id: crypto.randomUUID(),
                token_hash: tokenHash,
                user_id: user.user_id,
                expires_at: expiresAt,
            },
        });

        return {
            user: {
                userId: user.user_id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
            },
            accessToken,
            refreshToken,
        };
    }

    static async refresh(oldRefreshToken: string) {
        const payload = verifyToken(oldRefreshToken);
        const oldTokenHash = this.hashToken(oldRefreshToken);

        const isBlacklisted = await redis.get(`blacklist:${oldTokenHash}`);
        if (isBlacklisted) {
            throw new UnauthorizedError('Refresh token is blacklisted');
        }

        const tokenRecord = await prisma.refresh_tokens.findUnique({
            where: { token_hash: oldTokenHash },
            include: { users: true },
        });

        if (!tokenRecord || tokenRecord.revoked || tokenRecord.expires_at < new Date()) {
            if (tokenRecord && tokenRecord.revoked) {
                await prisma.refresh_tokens.updateMany({
                    where: { user_id: tokenRecord.user_id },
                    data: { revoked: true },
                });
            }
            throw new UnauthorizedError('Invalid or expired refresh token');
        }

        await prisma.refresh_tokens.update({
            where: { token_hash: oldTokenHash },
            data: { revoked: true },
        });

        const remainingTime = Math.max(0, tokenRecord.expires_at.getTime() - Date.now());
        if (remainingTime > 0) {
            await redis.setex(`blacklist:${oldTokenHash}`, Math.ceil(remainingTime / 1000), '1');
        }

        const userPayload: JWTPayload = {
            userId: tokenRecord.users.user_id,
            email: tokenRecord.users.email,
            role: tokenRecord.users.role,
        };

        const newAccessToken = generateAccessToken(userPayload);
        const newRefreshToken = generateRefreshToken(userPayload);
        const newTokenHash = this.hashToken(newRefreshToken);
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await prisma.refresh_tokens.create({
            data: {
                id: crypto.randomUUID(),
                token_hash: newTokenHash,
                user_id: tokenRecord.users.user_id,
                expires_at: expiresAt,
            },
        });

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        };
    }

    static async logout(refreshToken: string) {
        const tokenHash = this.hashToken(refreshToken);

        const tokenRecord = await prisma.refresh_tokens.findUnique({
            where: { token_hash: tokenHash },
        });

        if (tokenRecord) {
            await prisma.refresh_tokens.update({
                where: { token_hash: tokenHash },
                data: { revoked: true },
            });

            const remainingTime = Math.max(0, tokenRecord.expires_at.getTime() - Date.now());
            if (remainingTime > 0) {
                await redis.setex(`blacklist:${tokenHash}`, Math.ceil(remainingTime / 1000), '1');
            }
        }

        return true;
    }
}
