import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import type { AppConfig } from './config.js';
import { ApiError } from './errors.js';

export type AuthContext = { userId: string; blogId: string; email: string };

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}

export const setSession = async (reply: FastifyReply, config: AppConfig, user: AuthContext) => {
  const expiresAt = new Date(Date.now() + config.sessionTtlDays * 24 * 60 * 60 * 1000);
  const token = await reply.jwtSign(
    { sub: user.userId, email: user.email, blogId: user.blogId },
    { expiresIn: `${config.sessionTtlDays}d` },
  );
  reply.setCookie(config.cookieName, token, {
    path: config.cookiePath,
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    expires: expiresAt,
  });
};

export const clearSession = (reply: FastifyReply, config: AppConfig) => {
  reply.clearCookie(config.cookieName, { path: config.cookiePath });
};

export const requireAuth = (pool: Pool) => async (request: FastifyRequest) => {
  try {
    await request.jwtVerify();
  } catch {
    throw new ApiError(401, 'AUTH_REQUIRED', '请先登录后再继续。');
  }
  const claims = request.user as { sub?: string; email?: string; blogId?: string };
  if (!claims.sub || !claims.email || !claims.blogId) throw new ApiError(401, 'AUTH_REQUIRED', '登录状态已失效，请重新登录。');

  const { rows } = await pool.query<AuthContext>(
    `select users.id as "userId", blogs.id as "blogId", users.email
     from users join blogs on blogs.owner_user_id = users.id
     where users.id = $1 and blogs.id = $2`,
    [claims.sub, claims.blogId],
  );
  if (!rows[0]) throw new ApiError(401, 'AUTH_REQUIRED', '账号不存在或已被删除。');
  request.auth = rows[0];
};
