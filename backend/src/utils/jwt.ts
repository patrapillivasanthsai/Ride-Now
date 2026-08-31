import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'fallback_secret_for_development_only') {
  throw new Error('Production deployment requires a secure, non-fallback JWT_SECRET environment variable.');
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export interface TokenPayload {
  userId: string;
  role: string;
}

/**
 * Generates a signed JWT token containing standard claims.
 */
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
}

/**
 * Verifies a token and extracts the payload. Throws an error if invalid/expired.
 */
export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
