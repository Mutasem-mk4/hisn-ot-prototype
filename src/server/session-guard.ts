import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { HisnError } from '../shared/errors.js';

const SessionSchema = z
  .object({
    id: z.string().uuid(),
    csrfToken: z.string().uuid(),
    role: z.literal('OT_SECURITY_SUPERVISOR'),
    createdAt: z.number().int().nonnegative(),
  })
  .strict();
type Session = z.infer<typeof SessionSchema>;

const SESSION_COOKIE = 'hisn_session';
const MAX_SESSION_AGE_SECONDS = 8 * 60 * 60;

export class SessionGuard {
  constructor(
    private readonly signingKey: string,
    private readonly secureCookie = false,
  ) {}

  establish(request: FastifyRequest, reply: FastifyReply): Session {
    const current = this.lookup(request);
    if (current) return current;
    const session: Session = {
      id: randomUUID(),
      csrfToken: randomUUID(),
      role: 'OT_SECURITY_SUPERVISOR',
      createdAt: Date.now(),
    };
    reply.header(
      'set-cookie',
      `${SESSION_COOKIE}=${this.sign(session)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${MAX_SESSION_AGE_SECONDS}${this.secureCookie ? '; Secure' : ''}`,
    );
    return session;
  }

  authorize(request: FastifyRequest): Session {
    const session = this.lookup(request);
    if (!session)
      throw new HisnError(
        'AUTHENTICATION_REQUIRED',
        'A valid application session is required',
        401,
      );
    if (session.role !== 'OT_SECURITY_SUPERVISOR') {
      throw new HisnError('AUTHORIZATION_DENIED', 'OT security supervisor role is required', 403);
    }
    return session;
  }

  verifyMutation(request: FastifyRequest): Session {
    const session = this.authorize(request);
    if (request.headers['x-csrf-token'] !== session.csrfToken) {
      throw new HisnError('AUTHORIZATION_DENIED', 'CSRF validation failed', 403);
    }
    return session;
  }

  private lookup(request: FastifyRequest): Session | null {
    const token = parseCookies(request.headers.cookie ?? '')[SESSION_COOKIE];
    if (!token) return null;
    const session = this.verify(token);
    if (!session || Date.now() - session.createdAt > MAX_SESSION_AGE_SECONDS * 1000) return null;
    return session;
  }

  private sign(session: Session): string {
    const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
    return `${payload}.${this.signature(payload)}`;
  }

  private verify(token: string): Session | null {
    const [payload, suppliedSignature, extra] = token.split('.');
    if (!payload || !suppliedSignature || extra) return null;
    const expectedSignature = this.signature(payload);
    const suppliedBytes = Buffer.from(suppliedSignature);
    const expectedBytes = Buffer.from(expectedSignature);
    if (
      suppliedBytes.length !== expectedBytes.length ||
      !timingSafeEqual(suppliedBytes, expectedBytes)
    ) {
      return null;
    }
    try {
      return SessionSchema.parse(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')));
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof z.ZodError) return null;
      throw error;
    }
  }

  private signature(payload: string): string {
    return createHmac('sha256', this.signingKey).update(payload).digest('base64url');
  }
}

function parseCookies(header: string): Record<string, string> {
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim().split('='))
      .filter((entry): entry is [string, string] => entry.length === 2 && Boolean(entry[0])),
  );
}
