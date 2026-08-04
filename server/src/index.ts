import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import argon2 from 'argon2';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';
import { clearSession, requireAuth, setSession } from './auth.js';
import { loadConfig, type AppConfig } from './config.js';
import { createPool, runMigrations, withTransaction } from './db.js';
import { ApiError } from './errors.js';
import { readImageDimensions } from './imageDimensions.js';
import { loadNews } from './news.js';

const idSchema = z.string().uuid();
const emailSchema = z.string().trim().email('请输入格式正确的邮箱地址。').max(320).transform((value) => value.toLowerCase());
const passwordSchema = z.string().min(8, '密码至少需要 8 位。').max(128);
const colorSchema = z.string().regex(/^(?:#[0-9a-f]{6}|rgb\(\s*(?:25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(?:25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(?:25[0-5]|2[0-4]\d|1?\d?\d)\s*\))$/i, '图片配色格式不正确。');
const postSchema = z.object({ title: z.string().trim().min(1).max(240), content: z.string().max(200_000), category: z.enum(['diary', 'learning']), tags: z.array(z.string().trim().min(1).max(40)).max(20), isDraft: z.boolean() });
const todoSchema = z.object({ title: z.string().trim().min(1).max(240), description: z.string().max(5_000), completed: z.boolean().optional(), steps: z.array(z.object({ id: z.string().uuid(), title: z.string().trim().min(1).max(240), completed: z.boolean() })).max(100).optional() });
const photoMetadataSchema = z.object({ extractedColors: z.object({ primary: colorSchema, secondary: colorSchema }).nullable().optional(), takenAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), location: z.string().trim().max(240).nullable().optional(), story: z.string().trim().max(5_000).nullable().optional() });

type Auth = NonNullable<FastifyRequest['auth']>;
type Row = Record<string, unknown>;

const toMillis = (value: unknown) => new Date(String(value)).getTime();
const toDimension = (value: unknown) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};
const etagMatches = (header: string | undefined, etag: string) => header?.split(',').some((value) => value.trim().replace(/^W\//, '') === etag) ?? false;
const mapPost = (row: Row) => ({ id: row.id, title: row.title, content: row.content, category: row.category, tags: row.tags, isDraft: row.is_draft, createdAt: toMillis(row.created_at), updatedAt: toMillis(row.updated_at) });
const mapPhoto = (row: Row, config: AppConfig) => ({ id: row.id, url: `${config.publicApiPrefix}/media/${row.media_id}`, createdAt: toMillis(row.created_at), extractedColors: row.extracted_colors, takenAt: row.taken_on, location: row.location, story: row.story, width: toDimension(row.width), height: toDimension(row.height) });
const mapWeight = (row: Row) => ({ id: row.id, weight: Number(row.weight), date: toMillis(row.recorded_at) });
const mapTodo = (row: Row) => ({ id: row.id, title: row.title, description: row.description, completed: row.completed, steps: row.steps, createdAt: toMillis(row.created_at) });

const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(400, 'VALIDATION_ERROR', result.error.issues[0]?.message || '请求参数不正确。');
  return result.data;
};

const requireId = (request: FastifyRequest) => parse(idSchema, (request.params as { id?: string }).id);
const auth = (request: FastifyRequest): Auth => {
  if (!request.auth) throw new ApiError(401, 'AUTH_REQUIRED', '请先登录后再继续。');
  return request.auth;
};

const mimeExtensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

const fieldValue = (fields: Record<string, unknown>, name: string) => {
  const candidate = fields[name] as { value?: unknown } | { value?: unknown }[] | undefined;
  if (Array.isArray(candidate)) return candidate[0]?.value;
  return candidate?.value;
};

const storagePath = (config: AppConfig, key: string) => {
  const resolved = path.resolve(config.mediaDir, key);
  if (!resolved.startsWith(`${config.mediaDir}${path.sep}`)) throw new ApiError(400, 'INVALID_MEDIA_PATH', '图片路径不合法。');
  return resolved;
};

const writeUpload = async (request: FastifyRequest, pool: Pool, config: AppConfig, context: Auth, kind: 'gallery' | 'inline') => {
  const file = await request.file();
  if (!file) throw new ApiError(400, 'FILE_REQUIRED', '请选择要上传的图片。');
  const extension = mimeExtensions[file.mimetype];
  if (!extension) throw new ApiError(400, 'UNSUPPORTED_MEDIA', '仅支持 JPG、PNG 或 WebP 图片。');
  const buffer = await file.toBuffer();
  if (buffer.length === 0 || buffer.length > config.uploadLimitBytes) throw new ApiError(413, 'FILE_TOO_LARGE', '图片超过服务器允许的大小限制。');
  let dimensions: { width: number; height: number } | null = null;
  if (kind === 'gallery') {
    try {
      dimensions = readImageDimensions(buffer);
    } catch {
      throw new ApiError(400, 'INVALID_IMAGE_DIMENSIONS', '无法读取图片尺寸，请重新导出为 JPG、PNG 或 WebP 后上传。');
    }
  }
  const id = randomUUID();
  const key = `${context.blogId}/${kind}/${id}.${extension}`;
  const destination = storagePath(config, key);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, buffer, { flag: 'wx' });
  try {
    await pool.query(
      'insert into media_files (id, blog_id, storage_key, original_name, mime_type, size_bytes, width, height) values ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, context.blogId, key, path.basename(file.filename || `upload.${extension}`), file.mimetype, buffer.length, dimensions?.width ?? null, dimensions?.height ?? null],
    );
  } catch (error) {
    await unlink(destination).catch(() => undefined);
    throw error;
  }
  return { id, key, dimensions, fields: file.fields as Record<string, unknown> };
};

export const buildApp = (pool: Pool, config: AppConfig) => {
  const app = Fastify({ logger: true, bodyLimit: config.uploadLimitBytes + 100_000 });
  app.register(cookie);
  app.register(jwt, { secret: config.jwtSecret, cookie: { cookieName: config.cookieName, signed: false } });
  app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  app.register(multipart, { limits: { files: 1, fileSize: config.uploadLimitBytes } });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApiError) return reply.code(error.statusCode).send({ code: error.code, message: error.message });
    if ((error as { code?: string }).code === '23505') return reply.code(409).send({ code: 'ALREADY_EXISTS', message: '该邮箱已注册，请直接登录或使用其他邮箱。' });
    if ((error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') return reply.code(413).send({ code: 'FILE_TOO_LARGE', message: '图片超过服务器允许的大小限制。' });
    app.log.error(error);
    return reply.code(500).send({ code: 'INTERNAL_ERROR', message: '服务暂时不可用，请稍后重试。' });
  });

  app.get('/health', async () => ({ ok: true }));
  app.get('/ready', async (_request, reply) => {
    await pool.query('select 1');
    return reply.send({ ok: true, database: true });
  });

  app.post('/api/auth/register', { config: { rateLimit: { max: 8, timeWindow: '1 minute' } } }, async (request, reply) => {
    const input = parse(z.object({ email: emailSchema, password: passwordSchema }), request.body);
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const created = await withTransaction(pool, async (client) => {
      const userResult = await client.query<{ id: string; email: string }>('insert into users (email, password_hash) values ($1, $2) returning id, email', [input.email, passwordHash]);
      const user = userResult.rows[0];
      const blogResult = await client.query<{ id: string; name: string }>('insert into blogs (owner_user_id) values ($1) returning id, name', [user.id]);
      return { user, blog: blogResult.rows[0] };
    });
    await setSession(reply, config, { userId: created.user.id, email: created.user.email, blogId: created.blog.id });
    return reply.code(201).send({ user: created.user, blog: created.blog });
  });

  app.post('/api/auth/login', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const input = parse(z.object({ email: emailSchema, password: z.string().min(1).max(128) }), request.body);
    const { rows } = await pool.query<{ id: string; email: string; password_hash: string; blog_id: string }>(
      'select users.id, users.email, users.password_hash, blogs.id as blog_id from users join blogs on blogs.owner_user_id = users.id where users.email = $1',
      [input.email],
    );
    const user = rows[0];
    if (!user || !(await argon2.verify(user.password_hash, input.password))) throw new ApiError(401, 'INVALID_CREDENTIALS', '邮箱或密码不正确，请重新输入。');
    await setSession(reply, config, { userId: user.id, email: user.email, blogId: user.blog_id });
    return reply.send({ user: { id: user.id, email: user.email } });
  });

  app.post('/api/auth/logout', { preHandler: requireAuth(pool) }, async (_request, reply) => {
    clearSession(reply, config);
    return reply.code(204).send();
  });

  app.get('/api/auth/me', { preHandler: requireAuth(pool) }, async (request) => {
    const current = auth(request);
    return { user: { id: current.userId, email: current.email }, blog: { id: current.blogId } };
  });

  app.get('/api/bootstrap', { preHandler: requireAuth(pool) }, async (request) => {
    const current = auth(request);
    const [posts, photos, weights, todos] = await Promise.all([
      pool.query('select * from posts where blog_id = $1 order by created_at desc', [current.blogId]),
      pool.query('select photos.*, media_files.id as media_id, media_files.width, media_files.height from photos join media_files on media_files.id = photos.media_id where photos.blog_id = $1 order by photos.created_at desc', [current.blogId]),
      pool.query('select * from weights where blog_id = $1 order by recorded_at asc', [current.blogId]),
      pool.query('select * from todos where blog_id = $1 order by created_at desc', [current.blogId]),
    ]);
    return { posts: posts.rows.map(mapPost), photos: photos.rows.map((row: Row) => mapPhoto(row, config)), weights: weights.rows.map(mapWeight), todos: todos.rows.map(mapTodo) };
  });

  app.post('/api/posts', { preHandler: requireAuth(pool) }, async (request, reply) => {
    const current = auth(request); const input = parse(postSchema, request.body);
    const { rows } = await pool.query('insert into posts (blog_id, title, content, category, tags, is_draft) values ($1, $2, $3, $4, $5, $6) returning *', [current.blogId, input.title, input.content, input.category, input.tags, input.isDraft]);
    return reply.code(201).send(mapPost(rows[0]));
  });

  app.patch('/api/posts/:id', { preHandler: requireAuth(pool) }, async (request) => {
    const current = auth(request); const id = requireId(request); const input = parse(postSchema, request.body);
    const { rows } = await pool.query('update posts set title = $1, content = $2, category = $3, tags = $4, is_draft = $5, updated_at = now() where id = $6 and blog_id = $7 returning *', [input.title, input.content, input.category, input.tags, input.isDraft, id, current.blogId]);
    if (!rows[0]) throw new ApiError(404, 'POST_NOT_FOUND', '文章不存在或无权访问。');
    return mapPost(rows[0]);
  });

  app.delete('/api/posts/:id', { preHandler: requireAuth(pool) }, async (request, reply) => {
    const current = auth(request); const id = requireId(request);
    const result = await pool.query('delete from posts where id = $1 and blog_id = $2', [id, current.blogId]);
    if (result.rowCount === 0) throw new ApiError(404, 'POST_NOT_FOUND', '文章不存在或无权访问。');
    return reply.code(204).send();
  });

  app.post('/api/media/inline', { preHandler: requireAuth(pool) }, async (request, reply) => {
    const current = auth(request); const media = await writeUpload(request, pool, config, current, 'inline');
    return reply.code(201).send({ id: media.id, url: `${config.publicApiPrefix}/media/${media.id}` });
  });

  app.post('/api/photos', { preHandler: requireAuth(pool) }, async (request, reply) => {
    const current = auth(request); const media = await writeUpload(request, pool, config, current, 'gallery');
    try {
      let colors: unknown = null;
      const colorField = fieldValue(media.fields, 'extractedColors');
      if (typeof colorField === 'string' && colorField) {
        try { colors = JSON.parse(colorField); } catch { throw new ApiError(400, 'INVALID_COLORS', '图片配色数据格式不正确。'); }
      }
      const metadata = parse(photoMetadataSchema.pick({ extractedColors: true }), { extractedColors: colors });
      const { rows } = await pool.query('insert into photos (blog_id, media_id, extracted_colors) values ($1, $2, $3) returning *', [current.blogId, media.id, metadata.extractedColors ?? null]);
      return reply.code(201).send(mapPhoto({ ...rows[0], media_id: media.id, width: media.dimensions?.width, height: media.dimensions?.height }, config));
    } catch (error) {
      await pool.query('delete from media_files where id = $1', [media.id]).catch(() => undefined);
      await unlink(storagePath(config, media.key)).catch(() => undefined);
      throw error;
    }
  });

  app.patch('/api/photos/:id', { preHandler: requireAuth(pool) }, async (request) => {
    const current = auth(request); const id = requireId(request); const input = parse(photoMetadataSchema, request.body);
    const updates: string[] = []; const values: unknown[] = [];
    const add = (column: string, value: unknown) => { values.push(value); updates.push(`${column} = $${values.length}`); };
    if ('extractedColors' in input) add('extracted_colors', input.extractedColors);
    if ('takenAt' in input) add('taken_on', input.takenAt);
    if ('location' in input) add('location', input.location?.trim() || null);
    if ('story' in input) add('story', input.story?.trim() || null);
    if (updates.length === 0) throw new ApiError(400, 'NO_CHANGES', '没有可保存的图片信息。');
    values.push(id, current.blogId);
    const { rows } = await pool.query(`update photos set ${updates.join(', ')} where id = $${values.length - 1} and blog_id = $${values.length} returning *`, values);
    if (!rows[0]) throw new ApiError(404, 'PHOTO_NOT_FOUND', '摄影作品不存在或无权访问。');
    const media = await pool.query('select width, height from media_files where id = $1 and blog_id = $2', [rows[0].media_id, current.blogId]);
    return mapPhoto({ ...rows[0], width: media.rows[0]?.width, height: media.rows[0]?.height }, config);
  });

  app.patch('/api/photos/:id/dimensions', { preHandler: requireAuth(pool) }, async (request) => {
    const current = auth(request); const id = requireId(request);
    const { rows } = await pool.query('select photos.*, media_files.storage_key from photos join media_files on media_files.id = photos.media_id where photos.id = $1 and photos.blog_id = $2', [id, current.blogId]);
    if (!rows[0]) throw new ApiError(404, 'PHOTO_NOT_FOUND', '摄影作品不存在或无权访问。');
    let dimensions: { width: number; height: number };
    try {
      dimensions = readImageDimensions(await readFile(storagePath(config, rows[0].storage_key)));
    } catch {
      throw new ApiError(422, 'UNREADABLE_IMAGE_DIMENSIONS', '无法读取这张图片的尺寸。');
    }
    await pool.query('update media_files set width = $1, height = $2 where id = $3 and blog_id = $4', [dimensions.width, dimensions.height, rows[0].media_id, current.blogId]);
    return mapPhoto({ ...rows[0], width: dimensions.width, height: dimensions.height }, config);
  });

  app.delete('/api/photos/:id', { preHandler: requireAuth(pool) }, async (request, reply) => {
    const current = auth(request); const id = requireId(request);
    const { rows } = await pool.query('select photos.media_id, media_files.storage_key from photos join media_files on media_files.id = photos.media_id where photos.id = $1 and photos.blog_id = $2', [id, current.blogId]);
    if (!rows[0]) throw new ApiError(404, 'PHOTO_NOT_FOUND', '摄影作品不存在或无权访问。');
    await pool.query('delete from photos where id = $1 and blog_id = $2', [id, current.blogId]);
    await pool.query('delete from media_files where id = $1 and blog_id = $2', [rows[0].media_id, current.blogId]);
    await unlink(storagePath(config, rows[0].storage_key)).catch(() => undefined);
    return reply.code(204).send();
  });

  app.get('/api/media/:id', { preHandler: requireAuth(pool) }, async (request, reply) => {
    const current = auth(request); const id = requireId(request);
    const { rows } = await pool.query('select storage_key, mime_type from media_files where id = $1 and blog_id = $2', [id, current.blogId]);
    if (!rows[0]) throw new ApiError(404, 'MEDIA_NOT_FOUND', '图片不存在或无权访问。');
    const file = storagePath(config, rows[0].storage_key);
    let fileStats;
    try {
      fileStats = await stat(file);
    } catch { throw new ApiError(404, 'MEDIA_NOT_FOUND', '图片文件不存在。'); }
    if (!fileStats.isFile()) throw new ApiError(404, 'MEDIA_NOT_FOUND', '图片文件不存在。');

    const etag = `"${createHash('sha256').update(`${rows[0].storage_key}:${fileStats.size}:${fileStats.mtimeMs}`).digest('base64url')}"`;
    reply
      .header('Cache-Control', 'private, no-cache')
      .header('ETag', etag)
      .header('Content-Length', String(fileStats.size))
      .type(rows[0].mime_type);
    if (etagMatches(request.headers['if-none-match'], etag)) return reply.code(304).send();
    return reply.send(createReadStream(file));
  });

  app.post('/api/weights', { preHandler: requireAuth(pool) }, async (request, reply) => {
    const current = auth(request); const input = parse(z.object({ weight: z.number().finite().gt(0).lt(300) }), request.body);
    const { rows } = await pool.query('insert into weights (blog_id, weight) values ($1, $2) returning *', [current.blogId, input.weight]);
    return reply.code(201).send(mapWeight(rows[0]));
  });

  app.delete('/api/weights/:id', { preHandler: requireAuth(pool) }, async (request, reply) => {
    const current = auth(request); const id = requireId(request); const result = await pool.query('delete from weights where id = $1 and blog_id = $2', [id, current.blogId]);
    if (result.rowCount === 0) throw new ApiError(404, 'WEIGHT_NOT_FOUND', '体重记录不存在或无权访问。');
    return reply.code(204).send();
  });

  app.post('/api/todos', { preHandler: requireAuth(pool) }, async (request, reply) => {
    const current = auth(request); const input = parse(todoSchema, request.body);
    const { rows } = await pool.query('insert into todos (blog_id, title, description, completed, steps) values ($1, $2, $3, $4, $5) returning *', [current.blogId, input.title, input.description, input.completed ?? false, input.steps ?? []]);
    return reply.code(201).send(mapTodo(rows[0]));
  });

  app.patch('/api/todos/:id', { preHandler: requireAuth(pool) }, async (request) => {
    const current = auth(request); const id = requireId(request); const input = parse(todoSchema.partial(), request.body);
    const updates: string[] = []; const values: unknown[] = [];
    const add = (column: string, value: unknown) => { values.push(value); updates.push(`${column} = $${values.length}`); };
    if (input.title !== undefined) add('title', input.title);
    if (input.description !== undefined) add('description', input.description);
    if (input.completed !== undefined) add('completed', input.completed);
    if (input.steps !== undefined) add('steps', input.steps);
    if (updates.length === 0) throw new ApiError(400, 'NO_CHANGES', '没有可保存的待办修改。');
    values.push(id, current.blogId);
    const { rows } = await pool.query(`update todos set ${updates.join(', ')} where id = $${values.length - 1} and blog_id = $${values.length} returning *`, values);
    if (!rows[0]) throw new ApiError(404, 'TODO_NOT_FOUND', '待办不存在或无权访问。');
    return mapTodo(rows[0]);
  });

  app.delete('/api/todos/:id', { preHandler: requireAuth(pool) }, async (request, reply) => {
    const current = auth(request); const id = requireId(request); const result = await pool.query('delete from todos where id = $1 and blog_id = $2', [id, current.blogId]);
    if (result.rowCount === 0) throw new ApiError(404, 'TODO_NOT_FOUND', '待办不存在或无权访问。');
    return reply.code(204).send();
  });

  app.get('/api/news', { preHandler: requireAuth(pool) }, async (request, reply) => {
    const query = request.query as { region?: 'all' | 'cn' | 'intl'; topic?: 'all' | 'tech' | 'finance' | 'ai' };
    const region = ['all', 'cn', 'intl'].includes(query.region || '') ? query.region! : 'cn';
    const topic = ['all', 'tech', 'finance', 'ai'].includes(query.topic || '') ? query.topic! : 'all';
    reply.header('Cache-Control', 'private, max-age=300');
    return loadNews(region, topic);
  });

  return app;
};

const start = async () => {
  const config = loadConfig();
  const pool = createPool(config);
  await runMigrations(pool);
  const app = buildApp(pool, config);
  await app.listen({ port: config.port, host: config.host });
};

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  start().catch((error) => { console.error(error); process.exit(1); });
}
