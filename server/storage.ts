import {
  users,
  items,
  trustRelationships,
  loanRequests,
  loans,
  type User,
  type UpsertUser,
  type Item,
  type InsertItem,
  type UpdateItem,
  type TrustRelationship,
  type InsertTrustRelationship,
  type UpdateUserProfile,
  type LoanRequest,
  type InsertLoanRequest,
  type UpdateLoanRequest,
  type Loan,
  type InsertLoan,
  type UpdateLoan,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, desc, ne, sql, or, ilike } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(id: string, updates: UpdateUserProfile): Promise<User | undefined>;
  
  // Item operations
  createItem(item: InsertItem): Promise<Item>;
  getItem(id: string): Promise<Item | undefined>;
  getItemsByUser(userId: string): Promise<Item[]>;
  getVisibleItems(userId: string): Promise<Item[]>;
  updateItem(id: string, item: UpdateItem, userId: string): Promise<Item | undefined>;
  deleteItem(id: string, userId: string): Promise<boolean>;
  searchItems(userId: string, query: string): Promise<Item[]>;
  searchUserItems(userId: string, query: string): Promise<Item[]>;
  searchUsers(query: string): Promise<User[]>;
  
  // Trust operations
  setTrustLevel(trustRelationship: InsertTrustRelationship): Promise<TrustRelationship>;
  getTrustLevel(trusterId: string, trusteeId: string): Promise<number>;
  getUserConnections(userId: string): Promise<User[]>;
  
  // Loan request operations
  createLoanRequest(loanRequest: InsertLoanRequest): Promise<LoanRequest>;
  getLoanRequestsForItem(itemId: string): Promise<LoanRequest[]>;
  getLoanRequestsForUser(userId: string): Promise<LoanRequest[]>;
  getLoanRequestsByOwner(ownerId: string): Promise<LoanRequest[]>;
  updateLoanRequest(id: string, updates: UpdateLoanRequest): Promise<LoanRequest | undefined>;
  
  // Loan operations
  createLoan(loan: InsertLoan): Promise<Loan>;
  getLoansForUser(userId: string): Promise<Loan[]>;
  getLoansForOwner(ownerId: string): Promise<Loan[]>;
  updateLoan(id: string, updates: UpdateLoan): Promise<Loan | undefined>;
  getActiveLoanForItem(itemId: string): Promise<Loan | undefined>;
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
          ne(items.ownerId, userId),
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

  async getItem(id: string): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item;
  }

  async updateItem(id: string, item: UpdateItem, userId: string): Promise<Item | undefined> {
    const [updatedItem] = await db
      .update(items)
      .set({ ...item, updatedAt: new Date() })
      .where(and(eq(items.id, id), eq(items.ownerId, userId)))
      .returning();
    return updatedItem;
  }

  async updateUserProfile(id: string, updates: UpdateUserProfile): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteItem(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(items)
      .where(and(eq(items.id, id), eq(items.ownerId, userId)));
    return (result.rowCount ?? 0) > 0;
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

  async searchUserItems(userId: string, query: string): Promise<Item[]> {
    const userItems = await this.getItemsByUser(userId);
    const lowercaseQuery = query.toLowerCase();
    
    return userItems.filter(item => 
      item.title.toLowerCase().includes(lowercaseQuery) ||
      item.description.toLowerCase().includes(lowercaseQuery) ||
      item.category.toLowerCase().includes(lowercaseQuery)
    );
  }

  async searchUsers(query: string): Promise<User[]> {
    const lowercaseQuery = query.toLowerCase();
    
    const searchResults = await db
      .select()
      .from(users)
      .where(
        or(
          ilike(users.email, `%${query}%`),
          ilike(users.firstName, `%${query}%`),
          ilike(users.lastName, `%${query}%`)
        )
      )
      .limit(20);
    
    return searchResults;
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

  // Loan request operations
  async createLoanRequest(loanRequest: InsertLoanRequest): Promise<LoanRequest> {
    const [newRequest] = await db.insert(loanRequests).values({
      ...loanRequest,
      id: nanoid(),
    }).returning();
    return newRequest;
  }

  async getLoanRequestsForItem(itemId: string): Promise<LoanRequest[]> {
    return await db
      .select()
      .from(loanRequests)
      .where(eq(loanRequests.itemId, itemId))
      .orderBy(desc(loanRequests.createdAt));
  }

  async getLoanRequestsForUser(userId: string): Promise<LoanRequest[]> {
    return await db
      .select()
      .from(loanRequests)
      .where(eq(loanRequests.borrowerId, userId))
      .orderBy(desc(loanRequests.createdAt));
  }

  async getLoanRequestsByOwner(ownerId: string): Promise<LoanRequest[]> {
    // Get loan requests for items owned by this user
    return await db
      .select({
        id: loanRequests.id,
        itemId: loanRequests.itemId,
        borrowerId: loanRequests.borrowerId,
        requestedStartDate: loanRequests.requestedStartDate,
        requestedEndDate: loanRequests.requestedEndDate,
        status: loanRequests.status,
        message: loanRequests.message,
        createdAt: loanRequests.createdAt,
        updatedAt: loanRequests.updatedAt,
      })
      .from(loanRequests)
      .innerJoin(items, eq(loanRequests.itemId, items.id))
      .where(eq(items.ownerId, ownerId))
      .orderBy(desc(loanRequests.createdAt));
  }

  async getLoanRequestsByOwnerWithDetails(ownerId: string): Promise<any[]> {
    // Get loan requests for items owned by this user with item and borrower details
    return await db
      .select({
        id: loanRequests.id,
        itemId: loanRequests.itemId,
        borrowerId: loanRequests.borrowerId,
        requestedStartDate: loanRequests.requestedStartDate,
        requestedEndDate: loanRequests.requestedEndDate,
        status: loanRequests.status,
        message: loanRequests.message,
        createdAt: loanRequests.createdAt,
        updatedAt: loanRequests.updatedAt,
        itemTitle: items.title,
        borrowerName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        borrowerEmail: users.email,
        borrowerProfileImage: users.profileImageUrl,
      })
      .from(loanRequests)
      .innerJoin(items, eq(loanRequests.itemId, items.id))
      .innerJoin(users, eq(loanRequests.borrowerId, users.id))
      .where(eq(items.ownerId, ownerId))
      .orderBy(desc(loanRequests.createdAt));
  }

  async updateLoanRequest(id: string, updates: UpdateLoanRequest): Promise<LoanRequest | undefined> {
    const [updatedRequest] = await db
      .update(loanRequests)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(loanRequests.id, id))
      .returning();
    return updatedRequest;
  }

  // Loan operations
  async createLoan(loan: InsertLoan): Promise<Loan> {
    const [newLoan] = await db.insert(loans).values(loan).returning();
    return newLoan;
  }

  async getLoansForUser(userId: string): Promise<Loan[]> {
    return await db
      .select()
      .from(loans)
      .where(eq(loans.borrowerId, userId))
      .orderBy(desc(loans.createdAt));
  }

  async getLoansForOwner(ownerId: string): Promise<Loan[]> {
    return await db
      .select()
      .from(loans)
      .where(eq(loans.lenderId, ownerId))
      .orderBy(desc(loans.createdAt));
  }

  async getLoansForUserWithDetails(userId: string): Promise<any[]> {
    return await db
      .select({
        id: loans.id,
        itemId: loans.itemId,
        borrowerId: loans.borrowerId,
        lenderId: loans.lenderId,
        startDate: loans.startDate,
        expectedEndDate: loans.expectedEndDate,
        actualEndDate: loans.actualEndDate,
        status: loans.status,
        notes: loans.notes,
        createdAt: loans.createdAt,
        itemTitle: items.title,
        itemImageUrl: items.imageUrl,
        lenderName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        lenderEmail: users.email,
        lenderProfileImage: users.profileImageUrl,
      })
      .from(loans)
      .innerJoin(items, eq(loans.itemId, items.id))
      .innerJoin(users, eq(loans.lenderId, users.id))
      .where(eq(loans.borrowerId, userId))
      .orderBy(desc(loans.createdAt));
  }

  async getLoansForOwnerWithDetails(ownerId: string): Promise<any[]> {
    return await db
      .select({
        id: loans.id,
        itemId: loans.itemId,
        borrowerId: loans.borrowerId,
        lenderId: loans.lenderId,
        startDate: loans.startDate,
        expectedEndDate: loans.expectedEndDate,
        actualEndDate: loans.actualEndDate,
        status: loans.status,
        notes: loans.notes,
        createdAt: loans.createdAt,
        itemTitle: items.title,
        itemImageUrl: items.imageUrl,
        borrowerName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        borrowerEmail: users.email,
        borrowerProfileImage: users.profileImageUrl,
      })
      .from(loans)
      .innerJoin(items, eq(loans.itemId, items.id))
      .innerJoin(users, eq(loans.borrowerId, users.id))
      .where(eq(loans.lenderId, ownerId))
      .orderBy(desc(loans.createdAt));
  }

  async updateLoan(id: string, updates: UpdateLoan): Promise<Loan | undefined> {
    const [updatedLoan] = await db
      .update(loans)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(loans.id, id))
      .returning();
    return updatedLoan;
  }

  async getActiveLoanForItem(itemId: string): Promise<Loan | undefined> {
    const [loan] = await db
      .select()
      .from(loans)
      .where(
        and(
          eq(loans.itemId, itemId),
          eq(loans.status, 'active')
        )
      );
    return loan;
  }
}

export const storage = new DatabaseStorage();
