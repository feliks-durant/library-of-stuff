import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hashPassword } from "./auth";
import passport from "passport";
import { 
  insertItemSchema, 
  updateItemSchema, 
  insertTrustRelationshipSchema, 
  updateUserProfileSchema, 
  insertLoanRequestSchema,
  updateLoanRequestSchema,
  insertLoanSchema,
  updateLoanSchema,
  insertTrustRequestSchema,
  updateTrustRequestSchema,
  registerUserSchema,
  loginUserSchema,
  users
} from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// Configure multer for file uploads
const uploadDir = path.resolve("uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Registration endpoint
  app.post('/api/register', async (req, res) => {
    try {
      const validatedData = registerUserSchema.parse(req.body);
      
      // Check if email already exists (case-insensitive)
      const existingEmail = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${validatedData.email})`);

      if (existingEmail.length > 0) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Check if username already exists (case-insensitive)
      const existingUsername = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`LOWER(${users.username}) = LOWER(${validatedData.username})`);

      if (existingUsername.length > 0) {
        return res.status(400).json({ message: "Username already taken" });
      }

      // Hash password
      const hashedPassword = await hashPassword(validatedData.password);

      // Create user
      const [newUser] = await db.insert(users).values({
        email: validatedData.email.toLowerCase().trim(),
        password: hashedPassword,
        firstName: validatedData.firstName.trim(),
        lastName: validatedData.lastName.trim(),
        username: validatedData.username.toLowerCase().trim(),
      }).returning();

      // Log the user in automatically
      req.login({ id: newUser.id }, (err) => {
        if (err) {
          console.error("Error logging in after registration:", err);
          return res.status(500).json({ message: "Registration successful but login failed" });
        }

        // Return user without password
        const { password: _, ...userWithoutPassword } = newUser;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error: any) {
      console.error("Error during registration:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login endpoint
  app.post('/api/login', (req, res, next) => {
    try {
      // Validate request body
      loginUserSchema.parse(req.body);
      
      passport.authenticate('local', (err: any, user: any, info: any) => {
        if (err) {
          console.error("Authentication error:", err);
          return res.status(500).json({ message: "Authentication error" });
        }
        
        if (!user) {
          return res.status(401).json({ message: info?.message || "Invalid email or password" });
        }

        req.login(user, (loginErr) => {
          if (loginErr) {
            console.error("Login error:", loginErr);
            return res.status(500).json({ message: "Login failed" });
          }
          
          res.json(user);
        });
      })(req, res, next);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout endpoint
  app.post('/api/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      res.json(req.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Username availability check (no auth required for registration)
  app.get('/api/users/check-username', async (req: any, res) => {
    try {
      const { username } = req.query;
      
      if (!username || typeof username !== 'string') {
        return res.status(400).json({ message: "Username is required" });
      }

      const cleanUsername = username.toLowerCase().trim();
      
      // Check basic validation
      if (cleanUsername.length < 3 || cleanUsername.length > 30) {
        return res.json({ available: false, reason: "Invalid length" });
      }

      if (!/^[a-zA-Z0-9._-]+$/.test(cleanUsername)) {
        return res.json({ available: false, reason: "Invalid characters" });
      }

      // Check if username exists (case-insensitive)
      const existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`LOWER(${users.username}) = LOWER(${cleanUsername})`);

      res.json({ available: existingUser.length === 0 });
    } catch (error) {
      console.error("Error checking username:", error);
      res.status(500).json({ message: "Failed to check username" });
    }
  });

  // Update user profile with optional image
  app.post('/api/users/update-profile', isAuthenticated, upload.single('profileImage'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { firstName, lastName, username } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !username) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const cleanUsername = username.toLowerCase().trim();

      // Final username validation
      if (cleanUsername.length < 3 || cleanUsername.length > 30) {
        return res.status(400).json({ message: "Username must be 3-30 characters" });
      }

      if (!/^[a-zA-Z0-9._-]+$/.test(cleanUsername)) {
        return res.status(400).json({ message: "Username can only contain letters, numbers, periods, dashes, and underscores" });
      }

      // Check availability one more time (case-insensitive)
      const existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`LOWER(${users.username}) = LOWER(${cleanUsername})`);

      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Username is already taken" });
      }

      // Prepare update data
      const updateData: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: cleanUsername,
      };

      // Add profile image URL if file was uploaded
      if (req.file) {
        updateData.profileImageUrl = `/uploads/${req.file.filename}`;
      }

      // Update user profile
      const updatedUser = await storage.updateUserProfile(userId, updateData);

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error completing onboarding:", error);
      
      // Handle multer errors
      if (error.message === 'Only image files are allowed') {
        return res.status(400).json({ message: "Only image files are allowed" });
      }
      
      res.status(500).json({ message: "Failed to complete onboarding" });
    }
  });

  // Items routes
  app.get('/api/items/search', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const query = req.query.q as string;
      
      console.log('Search request received:', { userId, query, queryParams: req.query });
      
      if (!query || query.trim() === '') {
        console.log('Empty search query, returning empty array');
        return res.json([]);
      }

      const items = await storage.searchItems(userId, query);
      console.log('Search results:', items.length, 'items found for query:', query);
      res.json(items);
    } catch (error) {
      console.error("Error searching items:", error);
      res.status(500).json({ message: "Failed to search items" });
    }
  });

  app.get('/api/users/search', isAuthenticated, async (req: any, res) => {
    try {
      const query = req.query.q as string;
      
      console.log('User search request received:', { query, queryParams: req.query });
      
      if (!query || query.trim() === '') {
        console.log('Empty search query, returning empty array');
        return res.json([]);
      }

      const users = await storage.searchUsers(query);
      console.log('User search results:', users.length, 'users found for query:', query);
      res.json(users);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  app.get('/api/items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const items = await storage.getVisibleItems(userId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching items:", error);
      res.status(500).json({ message: "Failed to fetch items" });
    }
  });

  app.get('/api/items/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const items = await storage.getItemsByUser(userId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching user items:", error);
      res.status(500).json({ message: "Failed to fetch user items" });
    }
  });

  app.post('/api/items', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const itemData = insertItemSchema.parse({
        ...req.body,
        ownerId: userId,
        trustLevel: parseInt(req.body.trustLevel),
      });

      let imageUrl = null;
      if (req.file) {
        const fileExtension = path.extname(req.file.originalname);
        const fileName = `${req.file.filename}${fileExtension}`;
        const newPath = path.join(uploadDir, fileName);
        fs.renameSync(req.file.path, newPath);
        imageUrl = `/uploads/${fileName}`;
      }

      const item = await storage.createItem({
        ...itemData,
        imageUrl,
      });

      res.json(item);
    } catch (error) {
      console.error("Error creating item:", error);
      res.status(400).json({ message: "Failed to create item" });
    }
  });

  app.get('/api/items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const itemId = req.params.id;
      const item = await storage.getItem(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      res.json(item);
    } catch (error) {
      console.error("Error fetching item:", error);
      res.status(500).json({ message: "Failed to fetch item" });
    }
  });

  app.get('/api/items/:id/check-access', async (req: any, res) => {
    try {
      const itemId = req.params.id;
      
      // Check if user is authenticated
      if (!req.user || !req.user || !req.user.id) {
        return res.json({ 
          action: 'login',
          message: 'Please log in to view this item'
        });
      }

      const scannerId = req.user.id;
      const item = await storage.getItem(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      const ownerId = item.ownerId;

      // If scanner is the owner, allow full access
      if (scannerId === ownerId) {
        return res.json({ 
          action: 'view',
          item: item
        });
      }

      // Check if scanner has a trust relationship with the owner
      const trustLevel = await storage.getTrustLevel(ownerId, scannerId);
      
      if (trustLevel === 0) {
        return res.json({ 
          action: 'request_trust',
          ownerId: ownerId,
          message: 'You need to be trusted by the owner to view this item'
        });
      }

      // Check if scanner's trust level is sufficient
      if (trustLevel < item.trustLevel) {
        return res.json({ 
          action: 'insufficient_trust',
          requiredLevel: item.trustLevel,
          currentLevel: trustLevel,
          message: 'Sorry, the trust level for this item is above your trust level. Chat with the owner about it if you have questions'
        });
      }

      // Scanner has sufficient access
      return res.json({ 
        action: 'view',
        item: item
      });
    } catch (error) {
      console.error("Error checking item access:", error);
      res.status(500).json({ message: "Failed to check item access" });
    }
  });

  app.put('/api/items/:id', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const itemId = req.params.id;
      
      const updateData = updateItemSchema.parse({
        ...req.body,
        trustLevel: req.body.trustLevel ? parseInt(req.body.trustLevel) : undefined,
      });

      if (req.file) {
        const fileExtension = path.extname(req.file.originalname);
        const fileName = `${req.file.filename}${fileExtension}`;
        const newPath = path.join(uploadDir, fileName);
        fs.renameSync(req.file.path, newPath);
        updateData.imageUrl = `/uploads/${fileName}`;
      }

      const item = await storage.updateItem(itemId, updateData, userId);
      if (!item) {
        return res.status(404).json({ message: "Item not found or unauthorized" });
      }

      res.json(item);
    } catch (error) {
      console.error("Error updating item:", error);
      res.status(400).json({ message: "Failed to update item" });
    }
  });

  app.delete('/api/items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const itemId = req.params.id;
      
      const success = await storage.deleteItem(itemId, userId);
      if (!success) {
        return res.status(404).json({ message: "Item not found or unauthorized" });
      }

      res.json({ message: "Item deleted successfully" });
    } catch (error) {
      console.error("Error deleting item:", error);
      res.status(500).json({ message: "Failed to delete item" });
    }
  });

  app.get('/api/items/my/search', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }

      const items = await storage.searchUserItems(userId, query);
      res.json(items);
    } catch (error) {
      console.error("Error searching user items:", error);
      res.status(500).json({ message: "Failed to search user items" });
    }
  });

  // Trust routes
  app.post('/api/trust', isAuthenticated, async (req: any, res) => {
    try {
      const trusterId = req.user.id;
      const trustData = insertTrustRelationshipSchema.parse({
        ...req.body,
        trusterId,
        trustLevel: parseInt(req.body.trustLevel),
      });

      const trust = await storage.setTrustLevel(trustData);
      
      // Also approve any pending trust request from this user
      try {
        await storage.approveTrustRequest(req.body.trusteeId, trusterId);
      } catch (error) {
        // Continue if there's no pending request to approve
        console.log("No pending trust request to approve or error approving:", error);
      }
      
      res.json(trust);
    } catch (error) {
      console.error("Error setting trust level:", error);
      res.status(400).json({ message: "Failed to set trust level" });
    }
  });

  app.get('/api/trust/:trusteeId', isAuthenticated, async (req: any, res) => {
    try {
      const trusterId = req.user.id;
      const trusteeId = req.params.trusteeId;
      
      const trustLevel = await storage.getTrustLevel(trusterId, trusteeId);
      res.json({ trustLevel });
    } catch (error) {
      console.error("Error getting trust level:", error);
      res.status(500).json({ message: "Failed to get trust level" });
    }
  });

  app.get('/api/users/connections', isAuthenticated, async (req: any, res) => {
    try {
      const trusterId = req.user.id;
      const connections = await storage.getUserConnections(trusterId);
      res.json(connections);
    } catch (error) {
      console.error("Error getting user connections:", error);
      res.status(500).json({ message: "Failed to get user connections" });
    }
  });

  // User routes
  app.get('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return public user info only
      res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.put('/api/users/profile', isAuthenticated, upload.single('profileImage'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const updateData = updateUserProfileSchema.parse(req.body);

      if (req.file) {
        const fileExtension = path.extname(req.file.originalname);
        const fileName = `profile_${req.file.filename}${fileExtension}`;
        const newPath = path.join(uploadDir, fileName);
        fs.renameSync(req.file.path, newPath);
        updateData.profileImageUrl = `/uploads/${fileName}`;
      }

      const user = await storage.updateUserProfile(userId, updateData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(400).json({ message: "Failed to update profile" });
    }
  });

  app.get('/api/users/connections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const connections = await storage.getUserConnections(userId);
      res.json(connections);
    } catch (error) {
      console.error("Error fetching connections:", error);
      res.status(500).json({ message: "Failed to fetch connections" });
    }
  });

  // QR code profile route - handles authentication and redirects appropriately
  app.get('/profile/:userId', async (req: any, res) => {
    const { userId } = req.params;
    
    try {
      // Check if target user exists
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).send('User not found');
      }
      
      // Check if user is authenticated
      const hasValidSession = req.session && req.session.passport && req.session.passport.user;
      const isAuthenticatedResult = typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : false;
      const hasUser = req.user && typeof req.user === 'object';
      const hasClaims = hasUser && req.user.id;
      
      const isFullyAuthenticated = hasValidSession && isAuthenticatedResult && hasClaims;
      
      if (isFullyAuthenticated) {
        // User is authenticated, redirect to trust assignment page
        res.redirect(`/trust/${userId}`);
      } else {
        // User not authenticated, store destination and redirect to login
        if (req.session) {
          req.session.returnTo = `/trust/${userId}`;
        }
        res.redirect('/api/login');
      }
    } catch (error) {
      console.error("Error in profile route:", error);
      res.status(500).send('Internal server error');
    }
  });

  // User connections route for loan modal
  app.get('/api/users/connections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const connections = await storage.getUserConnections(userId);
      res.json(connections);
    } catch (error) {
      console.error("Error fetching user connections:", error);
      res.status(500).json({ message: "Failed to fetch user connections" });
    }
  });

  // Trust request routes
  app.post('/api/trust-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedData = insertTrustRequestSchema.parse(req.body);
      const trustRequest = await storage.createTrustRequest(userId, {
        targetId: validatedData.targetId,
        message: validatedData.message || null,
        status: 'pending'
      });
      res.json(trustRequest);
    } catch (error) {
      console.error("Error creating trust request:", error);
      res.status(500).json({ message: "Failed to create trust request" });
    }
  });

  app.get('/api/trust-requests/received', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const requests = await storage.getTrustRequestsReceived(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching received trust requests:", error);
      res.status(500).json({ message: "Failed to fetch trust requests" });
    }
  });

  app.get('/api/trust-requests/sent', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const requests = await storage.getTrustRequestsSent(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching sent trust requests:", error);
      res.status(500).json({ message: "Failed to fetch trust requests" });
    }
  });

  app.patch('/api/trust-requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updatedRequest = await storage.updateTrustRequest(id, req.body);
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error updating trust request:", error);
      res.status(500).json({ message: "Failed to update trust request" });
    }
  });

  // Loan request routes
  app.post('/api/loan-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Manual validation to handle date conversion and borrowerId
      const { itemId, requestedStartDate, requestedEndDate, message } = req.body;
      
      if (!itemId || !requestedStartDate || !requestedEndDate) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Check if item exists and user has access to it
      const items = await storage.getVisibleItems(userId);
      const item = items.find(i => i.id === itemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found or not accessible" });
      }
      
      const loanRequest = await storage.createLoanRequest({
        itemId,
        borrowerId: userId,
        requestedStartDate: new Date(requestedStartDate),
        requestedEndDate: new Date(requestedEndDate),
        message,
        status: "pending",
      });
      res.json(loanRequest);
    } catch (error) {
      console.error("Error creating loan request:", error);
      res.status(500).json({ message: "Failed to create loan request" });
    }
  });

  app.get('/api/loan-requests/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const requests = await storage.getLoanRequestsForUser(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching loan requests:", error);
      res.status(500).json({ message: "Failed to fetch loan requests" });
    }
  });

  app.get('/api/loan-requests/pending', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const requests = await storage.getLoanRequestsByOwnerWithDetails(userId);
      const pendingRequests = requests.filter(r => r.status === 'pending');
      res.json(pendingRequests);
    } catch (error) {
      console.error("Error fetching pending loan requests:", error);
      res.status(500).json({ message: "Failed to fetch pending loan requests" });
    }
  });

  app.patch('/api/loan-requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status || !['approved', 'denied'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'approved' or 'denied'" });
      }
      
      // Get the loan request to check ownership
      const requests = await storage.getLoanRequestsByOwner(userId);
      const request = requests.find(r => r.id === id);
      if (!request) {
        return res.status(404).json({ message: "Loan request not found" });
      }
      
      // Update the loan request status
      const updatedRequest = await storage.updateLoanRequest(id, { status });
      
      // If approved, create a loan record
      if (status === 'approved') {
        await storage.createLoan({
          itemId: request.itemId,
          borrowerId: request.borrowerId,
          lenderId: userId,
          startDate: request.requestedStartDate,
          expectedEndDate: request.requestedEndDate,
          status: 'active',
        });
      }
      
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error updating loan request:", error);
      res.status(500).json({ message: "Failed to update loan request" });
    }
  });

  // Loan routes
  app.post('/api/loans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Manual validation to handle date conversion and lenderId
      const { itemId, borrowerId, startDate, expectedEndDate, status } = req.body;
      
      if (!itemId || !borrowerId || !startDate || !expectedEndDate) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Check if user owns the item
      const item = await storage.getItem(itemId);
      if (!item || item.ownerId !== userId) {
        return res.status(404).json({ message: "Item not found or not owned by user" });
      }
      
      // Check if item is already on loan
      const activeLoan = await storage.getActiveLoanForItem(itemId);
      if (activeLoan) {
        return res.status(400).json({ message: "Item is already on loan" });
      }
      
      const loan = await storage.createLoan({
        itemId,
        borrowerId,
        lenderId: userId,
        startDate: new Date(startDate),
        expectedEndDate: new Date(expectedEndDate),
        status: status || 'active',
      });
      res.json(loan);
    } catch (error) {
      console.error("Error creating loan:", error);
      res.status(500).json({ message: "Failed to create loan" });
    }
  });

  app.get('/api/loans/my-borrowed', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const loans = await storage.getLoansForUserWithDetails(userId);
      res.json(loans);
    } catch (error) {
      console.error("Error fetching borrowed loans:", error);
      res.status(500).json({ message: "Failed to fetch borrowed loans" });
    }
  });

  app.get('/api/loans/my-lent', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const loans = await storage.getLoansForOwnerWithDetails(userId);
      res.json(loans);
    } catch (error) {
      console.error("Error fetching lent loans:", error);
      res.status(500).json({ message: "Failed to fetch lent loans" });
    }
  });

  app.patch('/api/loans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      // Manual validation and conversion instead of using schema to avoid date issues
      const updateData: any = {};
      
      if (req.body.status) {
        updateData.status = req.body.status;
      }
      
      if (req.body.actualEndDate) {
        updateData.actualEndDate = new Date(req.body.actualEndDate);
      }
      
      if (req.body.notes !== undefined) {
        updateData.notes = req.body.notes;
      }
      
      // Get the loan to check ownership (either borrower or lender)
      const borrowedLoans = await storage.getLoansForUser(userId);
      const lentLoans = await storage.getLoansForOwner(userId);
      const loan = [...borrowedLoans, ...lentLoans].find(l => l.id === id);
      
      if (!loan) {
        return res.status(404).json({ message: "Loan not found" });
      }
      
      const updatedLoan = await storage.updateLoan(id, updateData);
      res.json(updatedLoan);
    } catch (error) {
      console.error("Error updating loan:", error);
      res.status(500).json({ message: "Failed to update loan" });
    }
  });

  // Get active loan for specific item
  app.get('/api/loans/active/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const { itemId } = req.params;
      const activeLoan = await storage.getActiveLoanForItem(itemId);
      res.json(activeLoan);
    } catch (error) {
      console.error("Error fetching active loan:", error);
      res.status(500).json({ message: "Failed to fetch active loan" });
    }
  });

  // Get loan history for specific item
  app.get('/api/loans/history/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const { itemId } = req.params;
      const userId = req.user.id;
      
      // Get all loans for this item (both active and completed)
      const loanHistory = await storage.getLoansForItem(itemId);
      
      res.json(loanHistory);
    } catch (error) {
      console.error("Error fetching loan history:", error);
      res.status(500).json({ message: "Failed to fetch loan history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
