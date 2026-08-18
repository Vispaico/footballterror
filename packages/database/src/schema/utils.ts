import { text, integer } from 'drizzle-orm/sqlite-core';

/** Common timestamp columns — add to every table via spread */
export const timestamps = {
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
  updatedAt: text('updated_at').notNull().default(new Date().toISOString()),
};
