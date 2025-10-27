# Library of Stuff

## Overview

Library of Stuff is a trust-based item sharing platform that allows users to share personal belongings with people they trust. The application implements a sophisticated trust scoring system where items are only visible to users who meet the required trust threshold set by the item owner. Users can build trust relationships through QR code profile sharing and assign trust levels (1-5) to connections.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### October 27, 2025 - QR Code Printing for My Items
- **Added print mode to My Items page for batch QR code generation**
- Print mode toggle button allows users to enter selection mode for QR code printing
- Checkboxes appear in top-right corner of item cards when in print mode
- Clicking cards in print mode toggles selection instead of opening detail modal
- Select All / Deselect All button for convenient bulk selection
- PDF generation creates A4 portrait document with compact layout:
  - **Two labels per row** for efficient printing
  - Each label has rounded border box (87.5mm wide × 35mm tall)
  - Vertical divider splits each label in half
  - Left side displays item name and username
  - Right side contains QR code (13mm × 13mm) linking to item sharing URL
  - 5mm gap between labels for easy cutting
- PDF automatically downloads with timestamped filename
- Print mode exits automatically after PDF generation
- Fixed cache invalidation to ensure newly added items appear immediately in My Items list

### October 27, 2025 - PostgreSQL Session Persistence
- **Migrated from in-memory sessions to PostgreSQL-backed persistent sessions**
- Users now stay logged in for 30 days (instead of 1 week with in-memory storage)
- Sessions survive server restarts and are stored in database
- Created singleton database pool for session storage to prevent connection issues
- Removed old "sessions" table from Replit Auth era
- Session table auto-created by connect-pg-simple with proper schema (sid, sess, expire)
- Configured persistent cookies with httpOnly, secure (in production), and sameSite protection
- Automatic session pruning every hour removes expired sessions
- Users remain authenticated across browser sessions and page refreshes
- Logout still destroys sessions properly

### October 27, 2025 - Custom Email/Password Authentication System
- **Complete authentication system migration from Replit Auth to local email/password authentication**
- Created new `server/auth.ts` with bcrypt password hashing and Passport.js local strategy
- Updated database schema: added password, passwordResetToken, and passwordResetExpiry fields to users table
- Email is now the unique identifier for users (replacing Replit ID)
- All users collect full profile information (email, password, firstName, lastName, username) during registration
- Built registration page (`/register`) with real-time username availability checking
- Built login page (`/login`) with email/password authentication
- Updated landing page to redirect to new login/register pages instead of Replit Auth
- Modified all backend routes to use `req.user.id` instead of `req.user.claims.sub`
- Removed onboarding modal flow - all data collected upfront during registration
- Updated logout functionality to use POST /api/logout endpoint
- Password reset infrastructure ready (tokens and expiry fields in database)
- All existing user data cleared as part of migration
- Application now fully independent from Replit's authentication infrastructure

### October 27, 2025 - Landing Page Link Styling
- Added CSS to make all `<a>` elements on the landing page bold and underlined for better visibility

### October 1, 2025 - Landing Page FAQ Accordion Implementation
- Converted second section of landing page into fold-out FAQ accordion
- Created 5 FAQ sections: "What is it?", "What is anti-capitalist infrastructure?", "Does that mean you hate capitalism?", "How can I support the Library of Stuff?", and "Who built it?"
- Moved existing content (description and Alice/Bob/Chewy example) into first accordion item
- Maintained vaporwave aesthetic with purple borders and pink headers
- Get Started button positioned below all FAQ items
- Single accordion type allows one section open at a time for cleaner UX

### October 1, 2025 - QR Code Feature for Item Sharing
- Added QR codes to ItemDetailModal and MyItemDetailModal (150x150px on white background)
- Implemented QR scan handler at /qr/item/:itemId with four decision paths
- Created backend endpoint /api/items/:id/check-access for authentication and trust verification
- Built RequestTrust page at /request-trust/:userId for non-trusted users to send trust requests
- Decision paths: login redirect for unauthenticated, trust request for no relationship, insufficient trust modal, or item access for sufficient trust
- All QR scan scenarios tested and working correctly

### August 1, 2025 - My Items Card UI Improvements and Modal Implementation
- Replaced Edit/Loan buttons with clickable item cards for better user experience
- Created MyItemDetailModal component with comprehensive item management features
- Added availability status display (Available/Unavailable based on active loans)
- Implemented hide toggle functionality for controlling item visibility
- Added expandable loan history section with borrower interaction
- Fixed Trust Assignment Modal integration with proper user data fetching
- Enhanced card hover effects with scaling animation for better visual feedback

### August 1, 2025 - Image Upload and Static File Serving Fix
- Fixed broken image loading by correcting static file serving configuration
- Moved upload directory from dist/public/uploads to root uploads folder
- Repositioned static file middleware before Vite middleware to prevent route conflicts
- Verified image serving functionality with proper HTTP headers and content types

### August 1, 2025 - Item Card UI Improvements
- Removed "Request" and "View Details" buttons from ItemCard components
- Made entire card clickable to open item detail modal
- Enhanced card hover effects with subtle scaling animation
- Created separate ItemDetailModal component for better code organization
- Updated owner display to show firstName/lastName in black, @username in gray

### August 1, 2025 - Enhanced Username Validation
- Added comprehensive username rule explanations in onboarding modal
- Implemented real-time form validation with immediate error feedback
- Fixed case-insensitive username availability checking
- Updated validation rules: 3-30 characters, letters/numbers/periods/dashes/underscores only
- Enhanced error message display with color-coded feedback system

### August 1, 2025 - Unique Username System Implementation
- Transitioned from Discord-style username#discriminator to unique username system
- Enforced unique username constraint in database with automatic migration of duplicate usernames
- Updated all UI components to display firstName/lastName in black and @username in gray
- Removed discriminator field from all database queries and schemas
- Updated edit profile form to show username as unique field with validation
- Maintained @ symbol as clean username indicator without numeric discriminators
- Both firstName/lastName and username now displayed for better user recognition

### August 1, 2025 - Search Bar and CSS Import Fixes
- Moved search bar from NavigationHeader to Browse page only for better UX
- Fixed CSS import order error by moving @import statements to top of index.css
- Removed "My Items" section from user profile modal per user request
- Updated all NavigationHeader calls across pages to remove search functionality

### August 1, 2025 - Trust Request System Simplification
- Simplified trust request flow: Users now request trust generally without specifying levels
- Target users approve requests via Trust Assignment Modal (choose 1-5 trust level)  
- Removed requestedLevel field from trust_requests database table
- Fixed "Request Trust" button to hide when user already has trust level assigned
- Integrated automatic trust request approval when trust level is set
- Updated Trust Requests page to use existing Trust Assignment Modal for approvals

### August 1, 2025 - Username Display and Header Responsive Fixes
- Fixed username display throughout application to properly show Discord-style format (Username#1234)
- Updated ItemCard component and all backend queries to use username/discriminator instead of firstName/lastName
- Implemented responsive navigation header design preventing element overlap on small screens
- Added custom 'xs' breakpoint (475px) to Tailwind configuration
- Header now shows abbreviated "LoS" logo on very small screens
- Buttons resize appropriately with larger touch targets on mobile devices
- User dropdown shows username only on large screens to prevent text overflow

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Authentication**: Local email/password authentication with Passport.js
- **Session Management**: Express sessions stored in PostgreSQL with connect-pg-simple
- **File Uploads**: Multer middleware with image validation and 5MB size limits
- **API Design**: RESTful endpoints with JSON responses

### Database Design
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Structure**:
  - Users table for authentication and profile data
  - Items table with trust level requirements and owner relationships
  - Trust relationships table for user-to-user trust scores
  - Session table for persistent authentication state (auto-created by connect-pg-simple)
- **Key Relationships**: Items linked to owners, trust relationships between users

### Trust System
- **Trust Levels**: 1-5 scale where higher numbers indicate greater trust
- **Visibility Control**: Items only shown to users meeting minimum trust threshold
- **Relationship Management**: Bilateral trust scoring between users
- **QR Code Integration**: Profile sharing via QR codes for trust network expansion

### Authentication & Authorization
- **Provider**: Local email/password authentication with bcrypt hashing
- **Strategy**: Passport.js local strategy for user authentication
- **Session Storage**: PostgreSQL-backed sessions with 30-day TTL (persistent across server restarts)
- **Route Protection**: Middleware-based authentication checks
- **User Management**: Self-service registration with email verification ready
- **Password Security**: Bcrypt with 10 salt rounds for password hashing

### File Management
- **Upload Handling**: Server-side file processing with Multer
- **Storage**: Local filesystem storage in dist/public/uploads
- **Validation**: Image format restrictions (JPEG, PNG, GIF, WebP)
- **Serving**: Static file serving through Express

### Development Environment
- **Build System**: Vite for frontend, esbuild for backend bundling
- **Development Server**: Concurrent client/server development with hot reload
- **Type Safety**: Shared TypeScript types between client and server
- **Path Aliases**: Configured imports for cleaner code organization

## External Dependencies

### Database & Storage
- **Neon Database**: PostgreSQL database service with serverless connection pooling
- **Local File Storage**: Image uploads stored in application filesystem

### Authentication
- **Bcrypt**: Password hashing library for secure credential storage
- **Passport.js**: Authentication middleware for Express with local strategy

### UI Framework
- **Radix UI**: Headless component primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

### Development Tools
- **Vite**: Frontend build tool and development server
- **Drizzle Kit**: Database schema management and migrations
- **TypeScript**: Type safety across full stack

### Runtime Dependencies
- **Express.js**: Web server framework
- **TanStack Query**: Data fetching and caching
- **React Hook Form**: Form state management
- **Zod**: Schema validation
- **Date-fns**: Date manipulation utilities