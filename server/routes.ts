import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertItemSchema, insertTrustRelationshipSchema } from "@shared/schema";
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

  app.put('/api/items/:id', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const itemId = req.params.id;
      
      const updateData = {
        ...req.body,
        trustLevel: req.body.trustLevel ? parseInt(req.body.trustLevel) : undefined,
      };

      if (req.file) {
        const fileExtension = path.extname(req.file.originalname);
        const fileName = `${req.file.filename}${fileExtension}`;
        const newPath = path.join(uploadDir, fileName);
        fs.renameSync(req.file.path, newPath);
        updateData.imageUrl = `/uploads/${fileName}`;
      }

      const item = await storage.updateItem(itemId, updateData);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
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

  app.get('/api/items/search', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }

      const items = await storage.searchItems(userId, query);
      res.json(items);
    } catch (error) {
      console.error("Error searching items:", error);
      res.status(500).json({ message: "Failed to search items" });
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

  const httpServer = createServer(app);
  return httpServer;
}
