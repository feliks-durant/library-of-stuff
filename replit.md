# Library of Stuff

## Overview

Library of Stuff is a trust-based item sharing platform that allows users to share personal belongings with people they trust. The application implements a sophisticated trust scoring system where items are only visible to users who meet the required trust threshold set by the item owner. Users can build trust relationships through QR code profile sharing and assign trust levels (1-5) to connections.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- **Authentication**: Replit Auth using OpenID Connect with Passport.js
- **Session Management**: Express sessions stored in PostgreSQL with connect-pg-simple
- **File Uploads**: Multer middleware with image validation and 5MB size limits
- **API Design**: RESTful endpoints with JSON responses

### Database Design
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Structure**:
  - Users table for authentication and profile data
  - Items table with trust level requirements and owner relationships
  - Trust relationships table for user-to-user trust scores
  - Sessions table for authentication state
- **Key Relationships**: Items linked to owners, trust relationships between users

### Trust System
- **Trust Levels**: 1-5 scale where higher numbers indicate greater trust
- **Visibility Control**: Items only shown to users meeting minimum trust threshold
- **Relationship Management**: Bilateral trust scoring between users
- **QR Code Integration**: Profile sharing via QR codes for trust network expansion

### Authentication & Authorization
- **Provider**: Replit Auth with OIDC flow
- **Session Storage**: PostgreSQL-backed sessions with 1-week TTL
- **Route Protection**: Middleware-based authentication checks
- **User Management**: Automatic user creation/update on login

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
- **Replit Auth**: OpenID Connect authentication provider
- **Passport.js**: Authentication middleware for Express

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