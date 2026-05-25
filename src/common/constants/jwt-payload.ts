import { Role } from '../../users/entities/user.entity';

/**
 * Contract defining the structure of the encoded JSON Web Token payload.
 * Encapsulates the minimum necessary claims to establish user identity
 * and authorize access scopes without requiring a database lookup on every request.
 */
export interface JwtPayload {
  /** The standard JWT 'subject' claim, acting as the primary user ID. */
  sub: number;

  username: string;

  /** Embeds the user's privilege level directly into the token for fast RBAC validation. */
  role: Role;
}
