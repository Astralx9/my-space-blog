import path from 'node:path';
import 'dotenv/config';

const required = (name: string, fallback?: string) => {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
};

const normalizedPath = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed.startsWith('/')) throw new Error('Path environment variables must start with /.');
  return trimmed === '/' ? '/' : trimmed.replace(/\/+$/, '');
};

export type AppConfig = {
  databaseUrl: string;
  jwtSecret: string;
  port: number;
  host: string;
  mediaDir: string;
  cookieName: string;
  cookiePath: string;
  cookieSecure: boolean;
  publicApiPrefix: string;
  sessionTtlDays: number;
  uploadLimitBytes: number;
};

export const loadConfig = (): AppConfig => {
  const jwtSecret = required('JWT_SECRET');
  if (jwtSecret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters.');
  return {
    databaseUrl: required('DATABASE_URL'),
    jwtSecret,
    port: Number.parseInt(process.env.PORT || '3001', 10),
    host: process.env.HOST || '127.0.0.1',
    mediaDir: path.resolve(process.env.MEDIA_DIR || '/data/media'),
    cookieName: process.env.SESSION_COOKIE_NAME || 'my_space_session',
    cookiePath: normalizedPath(process.env.COOKIE_PATH || '/blog'),
    cookieSecure: process.env.COOKIE_SECURE === 'true',
    publicApiPrefix: normalizedPath(process.env.PUBLIC_API_PREFIX || '/blog/api'),
    sessionTtlDays: Number.parseInt(process.env.SESSION_TTL_DAYS || '14', 10),
    uploadLimitBytes: Number.parseInt(process.env.UPLOAD_LIMIT_BYTES || '3000000', 10),
  };
};
