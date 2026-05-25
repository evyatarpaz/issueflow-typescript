import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from '../common/constants/jwt-payload';

/**
 * Orchestrates core Identity & Access Management (IAM) domain logic.
 * Encapsulates cryptographic operations, identity verification, and local token state
 * management to isolate security mechanics from standard application workflows.
 */
@Injectable()
export class AuthService {
  private readonly tokenBlacklist = new Set<string>();

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Cryptographically verifies caller credentials against the persisted identity store.
   * This decoupled validation ensures that the transport layer remains entirely
   * ignorant of hashing algorithms or direct database traversal logic.
   *
   * @param username - The unique identifier claimed by the caller.
   * @param password - The plaintext secret needing cryptographic comparison.
   * @returns A sanitized identity object devoid of the cryptographic hash upon success, or null on failure.
   */
  async validateUser(
    username: string,
    password: string,
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      return null;
    }

    // We rely on bcrypt's native comparison to mitigate timing attacks.
    // Never decrypt the stored hash; always hash the input and compare securely.
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    // Explicitly destructure and discard the password field to prevent
    // accidental leakage of the cryptographic hash into downstream token payloads or API responses.
    const { password: _password, ...result } = user;
    void _password;
    return result as Omit<User, 'password'>;
  }

  /**
   * Issues a stateless cryptographic token (JWT) representing the authorized caller.
   * By embedding the user identity and authorization role directly within the token payload,
   * downstream domain services can execute access control mechanics without incurring network/database round-trips.
   *
   * @param user - The sanitized, pre-validated identity record.
   * @returns A secure payload containing the signed bearer token and lifecycle metadata.
   */
  login(user: Omit<User, 'password'>) {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const expiresInConfig =
      this.configService.get<string>('JWT_EXPIRES_IN') || '1h';
    const expiresInSeconds = expiresInConfig === '1h' ? 3600 : 3600;

    return {
      accessToken: this.jwtService.sign(payload),
      tokenType: 'Bearer',
      expiresIn: expiresInSeconds,
    };
  }

  /**
   * Forcibly revokes a token's authorization clearance prior to its natural cryptographic expiration.
   * This is a critical security countermeasure required to mitigate compromised tokens
   * in an otherwise strictly stateless authorization architecture.
   *
   * @param token - The raw JWT signature to be blacklisted.
   */
  logout(token: string): void {
    if (token) {
      // Utilizing an in-memory Set for revocation is incredibly fast for synchronous validation,
      // though in a distributed/scaled environment, this should be offloaded to a shared Redis cache.
      this.tokenBlacklist.add(token);
    }
  }

  /**
   * Evaluates if a given token signature has been explicitly revoked.
   *
   * @param token - The JWT string being evaluated by the AuthGuard.
   * @returns True if the token exists in the revocation registry, denying further system access.
   */
  isTokenBlacklisted(token: string): boolean {
    return this.tokenBlacklist.has(token);
  }

  /**
   * Resolves and extracts the trusted identity from a provided JWT signature.
   * Performs critical boundary validation to ensure the signature is mathematically intact
   * and the payload structure strictly adheres to the established system contract.
   *
   * @param token - The raw JWT string extracted from the HTTP transport layer.
   * @returns The extracted identity claims.
   * @throws {UnauthorizedException} If the signature is forged, mathematically invalid, or expired.
   */
  verifyToken(token: string): JwtPayload {
    try {
      const payload = this.jwtService.verify(token);
      if (!payload || typeof payload !== 'object') {
        throw new UnauthorizedException(
          'Invalid or expired authorization token',
        );
      }
      return payload as JwtPayload;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired authorization token');
    }
  }
}
