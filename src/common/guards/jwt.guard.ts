import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../../auth/auth.service';

/**
 * Global authentication interceptor enforcing the Bearer JWT scheme.
 * Operates as the centralized gatekeeper for all protected routes, ensuring that
 * requests carry valid, non-revoked credentials before reaching the controller layer.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  /**
   * Evaluates the HTTP request context to determine access eligibility.
   * Modifies the underlying request object by attaching the decoded user payload,
   * making it available for downstream decorators and handlers.
   *
   * @param context - The execution context provided by NestJS.
   * @returns A boolean granting access, or throws an exception blocking the request.
   * @throws UnauthorizedException if the token is missing, malformed, invalid, or blacklisted.
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    const [type, token] = authHeader.split(' ');

    // We enforce the 'Bearer' scheme explicitly to conform strictly to RFC 6750,
    // preventing ambiguity or parser vulnerabilities with custom token types.
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        'Authorization header must contain a Bearer token',
      );
    }

    // We proactively check the blacklist prior to cryptographic verification
    // because a revoked token might still be mathematically valid, but semantically voided.
    if (this.authService.isTokenBlacklisted(token)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    const payload = this.authService.verifyToken(token);

    // We attach the sanitized user object directly to the request,
    // decoupling downstream controllers from the underlying JWT payload structure.
    (request as any).user = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    };

    return true;
  }
}
