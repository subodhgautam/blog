import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// `pubDate:` with nothing after it parses as null, and z.coerce.date() would
// turn that into 1970-01-01. Treat an empty field as "not set" so the automatic
// git/file date still applies.
const optionalDate = z.preprocess(
  (value) => (value === null || (typeof value === 'string' && value.trim() === '') ? undefined : value),
  z.coerce.date().optional(),
);

const notes = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/notes' }),
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    pubDate: optionalDate,
    updatedDate: optionalDate,
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/guides' }),
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    pubDate: optionalDate,
    updatedDate: optionalDate,
    level: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Beginner'),
    order: z.number().default(0),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { notes, guides };
