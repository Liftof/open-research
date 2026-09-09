import { pgTable, text, integer, bigint, index } from 'drizzle-orm/pg-core';
export const papers = pgTable(
  'papers',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    author: text('author').notNull(),
    authorId: text('author_id'),
    abstract: text('abstract').notNull(),
    category: text('category').notNull(),
    kind: text('kind').notNull(),
    createdAt: text('created_at').notNull(),
    method: text('method').notNull().default(''),
    limitations: text('limitations').notNull().default(''),
    aiUse: text('ai_use').notNull().default(''),
    license: text('license').notNull(),
    sourceUrl: text('source_url').notNull().default(''),
    externalPdfUrl: text('external_pdf_url').notNull().default(''),
    publishedAt: text('published_at').notNull().default(''),
    pageCount: integer('page_count'),
    fileKey: text('file_key').notNull(),
    fileSize: integer('file_size').notNull(),
    ownerHash: text('owner_hash').notNull(),
    withdrawn: integer('withdrawn').notNull().default(0),
  },
  (t) => [index('idx_papers_created_at').on(t.createdAt)],
);
export const comments = pgTable(
  'comments',
  {
    id: text('id').primaryKey(),
    paperId: text('paper_id').notNull(),
    author: text('author').notNull(),
    authorId: text('author_id'),
    body: text('body').notNull(),
    kind: text('kind').notNull(),
    createdAt: text('created_at').notNull(),
    ownerHash: text('owner_hash').notNull(),
  },
  (t) => [index('idx_comments_paper_created').on(t.paperId, t.createdAt)],
);
export const submissions = pgTable(
  'submissions',
  {
    id: text('id').primaryKey(),
    actorHash: text('actor_hash').notNull(),
    kind: text('kind').notNull(),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (t) => [index('idx_submissions_actor_time').on(t.actorHash, t.createdAt)],
);

export const authors = pgTable('authors', {
  id: text('id').primaryKey(),
  subjectHash: text('subject_hash').notNull().unique(),
  handle: text('handle').notNull().unique(),
  name: text('name').notNull(),
  bio: text('bio').notNull().default(''),
  website: text('website').notNull().default(''),
  createdAt: text('created_at').notNull(),
});
export const apiKeys = pgTable(
  'api_keys',
  {
    id: text('id').primaryKey(),
    authorId: text('author_id').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    label: text('label').notNull(),
    prefix: text('prefix').notNull(),
    createdAt: text('created_at').notNull(),
    expiresAt: text('expires_at').notNull(),
    revokedAt: text('revoked_at'),
  },
  (t) => [index('idx_keys_author').on(t.authorId)],
);

export const paperTransparency = pgTable('paper_transparency', {
  paperId: text('paper_id').primaryKey(),
  declaredModels: text('declared_models').notNull().default('[]'),
  modelScan: text('model_scan')
    .notNull()
    .default('{"status":"not_scanned","mentions":[],"pagesScanned":0}'),
});

export const uploads = pgTable('uploads', {
  pathname: text('pathname').primaryKey(),
  authorId: text('author_id').notNull(),
  createdAt: text('created_at').notNull(),
  consumed: integer('consumed').notNull().default(0),
});
