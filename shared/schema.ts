import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  real,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Items table
export const items = pgTable("items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  category: varchar("category").notNull(),
  imageUrl: varchar("image_url"),
  trustLevel: integer("trust_level").notNull(), // 1-5, trust level required to see this item
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Trust relationships table (one-directional, private)
export const trustRelationships = pgTable("trust_relationships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trusterId: varchar("truster_id").notNull().references(() => users.id, { onDelete: "cascade" }), // person giving trust
  trusteeId: varchar("trustee_id").notNull().references(() => users.id, { onDelete: "cascade" }), // person receiving trust
  trustLevel: integer("trust_level").notNull(), // 1-5, how much trusterId trusts trusteeId
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique().on(table.trusterId, table.trusteeId), // one trust relationship per pair
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  items: many(items),
  trustsGiven: many(trustRelationships, { relationName: "truster" }),
  trustsReceived: many(trustRelationships, { relationName: "trustee" }),
}));

export const itemsRelations = relations(items, ({ one }) => ({
  owner: one(users, {
    fields: [items.ownerId],
    references: [users.id],
  }),
}));

export const trustRelationshipsRelations = relations(trustRelationships, ({ one }) => ({
  truster: one(users, {
    fields: [trustRelationships.trusterId],
    references: [users.id],
    relationName: "truster",
  }),
  trustee: one(users, {
    fields: [trustRelationships.trusteeId],
    references: [users.id],
    relationName: "trustee",
  }),
}));

// Zod schemas
export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTrustRelationshipSchema = createInsertSchema(trustRelationships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type TrustRelationship = typeof trustRelationships.$inferSelect;
export type InsertTrustRelationship = z.infer<typeof insertTrustRelationshipSchema>;
