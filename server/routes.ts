import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertItemSchema, 
  updateItemSchema, 
  insertTrustRelationshipSchema, 
  updateUserProfileSchema, 
  insertLoanRequestSchema,
  updateLoanRequestSchema,
  insertLoanSchema,
  updateLoanSchema 
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const uploadDir = path.resolve(import.meta.dirname, "../dist/public/uploads");
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
  // Serve static files (uploaded images)
  app.use('/uploads', express.static(path.resolve(import.meta.dirname, "../dist/public/uploads")));
  
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Items routes
  app.get('/api/items/search', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const items = await storage.getVisibleItems(userId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching items:", error);
      res.status(500).json({ message: "Failed to fetch items" });
    }
  });

  app.get('/api/items/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const items = await storage.getItemsByUser(userId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching user items:", error);
      res.status(500).json({ message: "Failed to fetch user items" });
    }
  });

  app.post('/api/items', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.put('/api/items/:id', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const trusterId = req.user.claims.sub;
      const trustData = insertTrustRelationshipSchema.parse({
        ...req.body,
        trusterId,
        trustLevel: parseInt(req.body.trustLevel),
      });

      const trust = await storage.setTrustLevel(trustData);
      res.json(trust);
    } catch (error) {
      console.error("Error setting trust level:", error);
      res.status(400).json({ message: "Failed to set trust level" });
    }
  });

  app.get('/api/trust/:trusteeId', isAuthenticated, async (req: any, res) => {
    try {
      const trusterId = req.user.claims.sub;
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
      const trusterId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      
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
      const userId = req.user.claims.sub;
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
      const hasClaims = hasUser && req.user.claims && req.user.claims.sub;
      
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
      const userId = req.user.claims.sub;
      const connections = await storage.getUserConnections(userId);
      res.json(connections);
    } catch (error) {
      console.error("Error fetching user connections:", error);
      res.status(500).json({ message: "Failed to fetch user connections" });
    }
  });

  // Loan request routes
  app.post('/api/loan-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log('Raw request body:', req.body);
      
      // Manual validation and conversion instead of using schema
      if (!req.body.itemId || !req.body.requestedStartDate || !req.body.requestedEndDate) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const validatedData = {
        itemId: req.body.itemId,
        requestedStartDate: new Date(req.body.requestedStartDate),
        requestedEndDate: new Date(req.body.requestedEndDate),
        message: req.body.message || null,
        status: "pending"
      };
      
      // Check if item exists and user has access to it
      const items = await storage.getVisibleItems(userId);
      const item = items.find(i => i.id === validatedData.itemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found or not accessible" });
      }
      
      // Allow loan requests even if item is already on loan
      // const activeLoan = await storage.getActiveLoanForItem(validatedData.itemId);
      // if (activeLoan) {
      //   return res.status(400).json({ message: "Item is already on loan" });
      // }
      
      const loanRequest = await storage.createLoanRequest({
        ...validatedData,
        borrowerId: userId,
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
      const userId = req.user.claims.sub;
      const requests = await storage.getLoanRequestsForUser(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching loan requests:", error);
      res.status(500).json({ message: "Failed to fetch loan requests" });
    }
  });

  app.get('/api/loan-requests/pending', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const validatedData = updateLoanRequestSchema.parse(req.body);
      
      // Get the loan request to check ownership
      const requests = await storage.getLoanRequestsByOwner(userId);
      const request = requests.find(r => r.id === id);
      if (!request) {
        return res.status(404).json({ message: "Loan request not found" });
      }
      
      // If approving the request, create a loan
      if (validatedData.status === 'approved') {
        const item = await storage.getItem(request.itemId);
        if (!item) {
          return res.status(404).json({ message: "Item not found" });
        }
        
        // Create the loan
        await storage.createLoan({
          itemId: request.itemId,
          borrowerId: request.borrowerId,
          lenderId: userId,
          startDate: request.requestedStartDate,
          expectedEndDate: request.requestedEndDate,
          status: 'active',
        });
      }
      
      const updatedRequest = await storage.updateLoanRequest(id, validatedData);
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error updating loan request:", error);
      res.status(500).json({ message: "Failed to update loan request" });
    }
  });

  // Loan routes
  app.post('/api/loans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertLoanSchema.parse(req.body);
      
      // Check if user owns the item
      const item = await storage.getItem(validatedData.itemId);
      if (!item || item.ownerId !== userId) {
        return res.status(404).json({ message: "Item not found or not owned by user" });
      }
      
      // Check if item is already on loan
      const activeLoan = await storage.getActiveLoanForItem(validatedData.itemId);
      if (activeLoan) {
        return res.status(400).json({ message: "Item is already on loan" });
      }
      
      const loan = await storage.createLoan({
        ...validatedData,
        lenderId: userId,
      });
      res.json(loan);
    } catch (error) {
      console.error("Error creating loan:", error);
      res.status(500).json({ message: "Failed to create loan" });
    }
  });

  app.get('/api/loans/my-borrowed', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const loans = await storage.getLoansForUserWithDetails(userId);
      res.json(loans);
    } catch (error) {
      console.error("Error fetching borrowed loans:", error);
      res.status(500).json({ message: "Failed to fetch borrowed loans" });
    }
  });

  app.get('/api/loans/my-lent', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const loans = await storage.getLoansForOwnerWithDetails(userId);
      res.json(loans);
    } catch (error) {
      console.error("Error fetching lent loans:", error);
      res.status(500).json({ message: "Failed to fetch lent loans" });
    }
  });

  app.patch('/api/loans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  const httpServer = createServer(app);
  return httpServer;
}
