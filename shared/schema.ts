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
  username: varchar("username"), // Base username (can be non-unique)
  discriminator: varchar("discriminator", { length: 4 }), // 4-digit discriminator for uniqueness
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  usernameDiscriminatorIdx: unique().on(table.username, table.discriminator), // Ensure username#discriminator is unique
}));

// Items table
export const items = pgTable("items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  category: varchar("category").notNull(),
  imageUrl: varchar("image_url"),
  qrCode: varchar("qr_code").unique(), // QR code for easy item access
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

// Loan requests table
export const loanRequests = pgTable("loan_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: varchar("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  borrowerId: varchar("borrower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  requestedStartDate: timestamp("requested_start_date").notNull(),
  requestedEndDate: timestamp("requested_end_date").notNull(),
  status: varchar("status").notNull().default("pending"), // pending, approved, denied
  message: text("message"), // optional message from borrower
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Trust requests table - for requesting trust levels from other users
export const trustRequests = pgTable("trust_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }), // person requesting trust
  targetId: varchar("target_id").notNull().references(() => users.id, { onDelete: "cascade" }), // person being asked for trust
  message: text("message"), // optional message from requester
  status: varchar("status").notNull().default("pending"), // pending, approved, denied
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique().on(table.requesterId, table.targetId), // one trust request per pair
]);

// Active loans table
export const loans = pgTable("loans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: varchar("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  borrowerId: varchar("borrower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lenderId: varchar("lender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startDate: timestamp("start_date").notNull(),
  expectedEndDate: timestamp("expected_end_date").notNull(),
  actualEndDate: timestamp("actual_end_date"), // null if still on loan
  status: varchar("status").notNull().default("active"), // active, returned, overdue
  notes: text("notes"), // optional notes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  items: many(items),
  trustsGiven: many(trustRelationships, { relationName: "truster" }),
  trustsReceived: many(trustRelationships, { relationName: "trustee" }),
  trustRequestsMade: many(trustRequests, { relationName: "requester" }),
  trustRequestsReceived: many(trustRequests, { relationName: "target" }),
  loanRequestsMade: many(loanRequests, { relationName: "borrower" }),
  loansAsBorrower: many(loans, { relationName: "borrower" }),
  loansAsLender: many(loans, { relationName: "lender" }),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  owner: one(users, {
    fields: [items.ownerId],
    references: [users.id],
  }),
  loanRequests: many(loanRequests),
  loans: many(loans),
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

export const trustRequestsRelations = relations(trustRequests, ({ one }) => ({
  requester: one(users, {
    fields: [trustRequests.requesterId],
    references: [users.id],
    relationName: "requester",
  }),
  target: one(users, {
    fields: [trustRequests.targetId],
    references: [users.id],
    relationName: "target",
  }),
}));

export const loanRequestsRelations = relations(loanRequests, ({ one }) => ({
  item: one(items, {
    fields: [loanRequests.itemId],
    references: [items.id],
  }),
  borrower: one(users, {
    fields: [loanRequests.borrowerId],
    references: [users.id],
    relationName: "borrower",
  }),
}));

export const loansRelations = relations(loans, ({ one }) => ({
  item: one(items, {
    fields: [loans.itemId],
    references: [items.id],
  }),
  borrower: one(users, {
    fields: [loans.borrowerId],
    references: [users.id],
    relationName: "borrower",
  }),
  lender: one(users, {
    fields: [loans.lenderId],
    references: [users.id],
    relationName: "lender",
  }),
}));

// Zod schemas
export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateItemSchema = createInsertSchema(items).omit({
  id: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertTrustRelationshipSchema = createInsertSchema(trustRelationships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserProfileSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertLoanRequestSchema = createInsertSchema(loanRequests).omit({
  id: true,
  borrowerId: true,  // This will be set from the authenticated user
  createdAt: true,
  updatedAt: true,
});

export const updateLoanRequestSchema = createInsertSchema(loanRequests).omit({
  id: true,
  itemId: true,
  borrowerId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertLoanSchema = createInsertSchema(loans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateLoanSchema = createInsertSchema(loans).omit({
  id: true,
  itemId: true,
  borrowerId: true,
  lenderId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertTrustRequestSchema = createInsertSchema(trustRequests).omit({
  id: true,
  requesterId: true, // This will be set from the authenticated user
  createdAt: true,
  updatedAt: true,
});

export const updateTrustRequestSchema = createInsertSchema(trustRequests).omit({
  id: true,
  requesterId: true,
  targetId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type UpdateItem = z.infer<typeof updateItemSchema>;
export type TrustRelationship = typeof trustRelationships.$inferSelect;
export type InsertTrustRelationship = z.infer<typeof insertTrustRelationshipSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type LoanRequest = typeof loanRequests.$inferSelect;
export type InsertLoanRequest = z.infer<typeof insertLoanRequestSchema>;
export type UpdateLoanRequest = z.infer<typeof updateLoanRequestSchema>;
export type Loan = typeof loans.$inferSelect;
export type InsertLoan = z.infer<typeof insertLoanSchema>;
export type UpdateLoan = z.infer<typeof updateLoanSchema>;
export type TrustRequest = typeof trustRequests.$inferSelect;
export type InsertTrustRequest = z.infer<typeof insertTrustRequestSchema>;
export type UpdateTrustRequest = z.infer<typeof updateTrustRequestSchema>;

// Utility functions for Discord-style usernames
export function formatUsername(user: { username?: string | null; discriminator?: string | null } | { username?: string; discriminator?: string }): string {
  if (!user.username || !user.discriminator) {
    return 'Unknown User';
  }
  return `${user.username}#${user.discriminator}`;
}

// Display just the username for UI (cleaner look)
export function formatDisplayName(user: { username?: string | null; discriminator?: string | null } | { username?: string; discriminator?: string }): string {
  if (!user.username) {
    return 'Unknown User';
  }
  return user.username;
}

export function generateDiscriminator(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function parseUsername(fullUsername: string): { username: string; discriminator: string } | null {
  const match = fullUsername.match(/^(.+)#(\d{4})$/);
  if (!match) return null;
  return { username: match[1], discriminator: match[2] };
}
