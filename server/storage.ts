import {
  users,
  items,
  trustRelationships,
  type User,
  type UpsertUser,
  type Item,
  type InsertItem,
  type TrustRelationship,
  type InsertTrustRelationship,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Item operations
  createItem(item: InsertItem): Promise<Item>;
  getItemsByUser(userId: string): Promise<Item[]>;
  getVisibleItems(userId: string): Promise<Item[]>;
  updateItem(id: string, item: Partial<InsertItem>): Promise<Item | undefined>;
  deleteItem(id: string, userId: string): Promise<boolean>;
  searchItems(userId: string, query: string): Promise<Item[]>;
  
  // Trust operations
  setTrustLevel(trustRelationship: InsertTrustRelationship): Promise<TrustRelationship>;
  getTrustLevel(trusterId: string, trusteeId: string): Promise<number>;
  getUserConnections(userId: string): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createItem(item: InsertItem): Promise<Item> {
    const [newItem] = await db.insert(items).values(item).returning();
    return newItem;
  }

  async getItemsByUser(userId: string): Promise<Item[]> {
    return await db
      .select()
      .from(items)
      .where(eq(items.ownerId, userId))
      .orderBy(desc(items.createdAt));
  }

  async getVisibleItems(userId: string): Promise<Item[]> {
    // Get all items where the user's trust level >= item's required trust level
    // This requires a complex query joining items with trust relationships
    const visibleItems = await db
      .select({
        id: items.id,
        title: items.title,
        description: items.description,
        category: items.category,
        imageUrl: items.imageUrl,
        trustLevel: items.trustLevel,
        ownerId: items.ownerId,
        createdAt: items.createdAt,
        updatedAt: items.updatedAt,
        ownerFirstName: users.firstName,
        ownerLastName: users.lastName,
        ownerProfileImage: users.profileImageUrl,
        userTrustLevel: trustRelationships.trustLevel,
      })
      .from(items)
      .innerJoin(users, eq(items.ownerId, users.id))
      .leftJoin(
        trustRelationships,
        and(
          eq(trustRelationships.trusterId, items.ownerId),
          eq(trustRelationships.trusteeId, userId)
        )
      )
      .where(
        and(
          // Don't show user's own items
          eq(items.ownerId, userId) === false,
          // Only show items where user's trust level >= item's required trust level
          gte(trustRelationships.trustLevel, items.trustLevel)
        )
      )
      .orderBy(desc(items.createdAt));

    return visibleItems.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      category: item.category,
      imageUrl: item.imageUrl,
      trustLevel: item.trustLevel,
      ownerId: item.ownerId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      owner: {
        firstName: item.ownerFirstName,
        lastName: item.ownerLastName,
        profileImageUrl: item.ownerProfileImage,
      }
    })) as Item[];
  }

  async updateItem(id: string, item: Partial<InsertItem>): Promise<Item | undefined> {
    const [updatedItem] = await db
      .update(items)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(items.id, id))
      .returning();
    return updatedItem;
  }

  async deleteItem(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(items)
      .where(and(eq(items.id, id), eq(items.ownerId, userId)));
    return result.rowCount > 0;
  }

  async searchItems(userId: string, query: string): Promise<Item[]> {
    const visibleItems = await this.getVisibleItems(userId);
    const lowercaseQuery = query.toLowerCase();
    
    return visibleItems.filter(item => 
      item.title.toLowerCase().includes(lowercaseQuery) ||
      item.description.toLowerCase().includes(lowercaseQuery) ||
      item.category.toLowerCase().includes(lowercaseQuery)
    );
  }

  async setTrustLevel(trustRelationship: InsertTrustRelationship): Promise<TrustRelationship> {
    const [trust] = await db
      .insert(trustRelationships)
      .values(trustRelationship)
      .onConflictDoUpdate({
        target: [trustRelationships.trusterId, trustRelationships.trusteeId],
        set: {
          trustLevel: trustRelationship.trustLevel,
          updatedAt: new Date(),
        },
      })
      .returning();
    return trust;
  }

  async getTrustLevel(trusterId: string, trusteeId: string): Promise<number> {
    const [trust] = await db
      .select()
      .from(trustRelationships)
      .where(
        and(
          eq(trustRelationships.trusterId, trusterId),
          eq(trustRelationships.trusteeId, trusteeId)
        )
      );
    return trust?.trustLevel || 0;
  }

  async getUserConnections(userId: string): Promise<User[]> {
    // Get users who have trust relationships with this user
    const connections = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(trustRelationships)
      .innerJoin(users, eq(trustRelationships.trusteeId, users.id))
      .where(eq(trustRelationships.trusterId, userId));
    
    return connections;
  }
}

export const storage = new DatabaseStorage();
