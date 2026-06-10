import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { JWTPayload } from '@aerorail/types';
import { UnauthorizedError } from '@aerorail/errors';

export const ACCESS_TOKEN_EXPIRES_IN = '15m'; // 15 minutes
export const REFRESH_TOKEN_EXPIRES_IN = '30d'; // 30 days

/**
 * Signs a JWT access token using the RS256 private key and registers the issuer.
 */
export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, env.JWT_PRIVATE_KEY, {
    algorithm: 'RS256',
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    issuer: 'aerorail', // Crucial for Kong to match the public key
  });
}

/**
 * Signs a JWT refresh token using the RS256 private key.
 */
export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, env.JWT_PRIVATE_KEY, {
    algorithm: 'RS256',
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    issuer: 'aerorail',
  });
}

/**
 * Verifies a token's signature and expiration using the RS256 public key.
 */
export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, env.JWT_PUBLIC_KEY, {
      algorithms: ['RS256'],
      issuer: 'aerorail',
    }) as JWTPayload;
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
}
