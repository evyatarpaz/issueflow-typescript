/**
 * Cryptographic secret utilized for HMAC signing of JSON Web Tokens.
 * Default fallback is strictly for local development environments; production
 * deployments MUST explicitly inject a secure process.env.JWT_SECRET.
 */
export const JWT_SECRET = process.env.JWT_SECRET || 'issueflow_jwt_secret';

/**
 * Defines the strict TTL (Time To Live) for access tokens.
 * A shorter lifespan limits the attack window if a token is compromised.
 */
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
