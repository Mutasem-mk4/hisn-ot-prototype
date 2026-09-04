import { randomUUID } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { HisnError } from '../shared/errors.js';

type Session = {
  id: string;
  csrfToken: string;
  role: 'OT_SECURITY_SUPERVISOR';
  createdAt: number;
};

const SESSION_COOKIE = 'hisn_session';
const MAX_SESSION_AGE_SECONDS = 8 * 60 * 60;

export class SessionGuard {
  private readonly sessions = new Map<string, Session>();

  constructor(private readonly secureCookie = false) {}

  establish(request: FastifyRequest, reply: FastifyReply): Session {
    const current = this.lookup(request);
    if (current) return current;
    const session: Session = {
      id: randomUUID(),
      csrfToken: randomUUID(),
      role: 'OT_SECURITY_SUPERVISOR',
      createdAt: Date.now(),
    };
    this.sessions.set(session.id, session);
    reply.header(
      'set-cookie',
      `${SESSION_COOKIE}=${session.id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${MAX_SESSION_AGE_SECONDS}${this.secureCookie ? '; Secure' : ''}`,
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
    const id = parseCookies(request.headers.cookie ?? '')[SESSION_COOKIE];
    if (!id) return null;
    const session = this.sessions.get(id);
    if (!session) return null;
    if (Date.now() - session.createdAt > MAX_SESSION_AGE_SECONDS * 1000) {
      this.sessions.delete(id);
      return null;
    }
    return session;
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
