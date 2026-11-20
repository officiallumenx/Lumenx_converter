import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blogCollection = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    draft: z.boolean(),
    title: z.string(),
    snippet: z.string(),
    image: z.object({
      src: z.string(),
      alt: z.string(),
    }),
    bigImg: z.object({
      src: z.string(),
      alt: z.string(),
    }),
    authorImg: z.object({
      src: z.string(),
      alt: z.string(),
    }),
    publishDate: z.string().transform((str) => new Date(str)),
    author: z.string().default("Pimjolabs"),
    comments: z.string(),
    views: z.string(),
    category: z.string(),
    tags: z.array(z.string()),
    postDetails: z.object({
      paraOne: z.string(),
      paraTwo: z.string(),
      title: z.string(),
      paraThree: z.string(),
      titleTwo: z.string(),
      paraFour: z.string(),
      paraFive: z.string(),
    }),
    quotes: z.object({
      quote: z.string(),
      author: z.string(),
    }),
  }),
});

export const collections = {
  blog: blogCollection,
};
