# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a MERN stack (MongoDB, Express.js, React, Node.js) expense tracker application with JWT-based authentication. Users can register, login, track income and expenses, and view basic summaries.

## Development Commands

### Backend (Express.js)
```bash
# Install dependencies
cd backend
npm install

# Start development server
npm run dev

# Start production server
npm start

# Run tests
npm test
```

### Frontend (React)
```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

### Full Stack
```bash
# From root directory
# Install all dependencies
npm install

# Start both frontend and backend concurrently
npm run dev
```

## Project Structure
```
/backend
  /controllers    # Request handlers
  /models         # Database models (User, Transaction)
  /routes         # API route definitions
  /middleware     # Custom middleware (authentication, validation)
  /config         # Configuration files (database, JWT)
  /utils          # Utility functions
  server.js       # Entry point
  package.json    # Backend dependencies and scripts

/frontend
  /public         # Static assets
  /src
    /components   # Reusable UI components
    /pages        # Page components
    /services     # API service calls
    /context      # React context (auth, state)
    /hooks        # Custom React hooks
    /utils        # Utility functions
    App.js        # Main App component
    index.js      # Entry point
  package.json    # Frontend dependencies and scripts
```

## Key Features & Architecture

### Authentication System
- JWT-based authentication with login/register endpoints
- Protected routes middleware for backend
- Auth context in frontend for managing user state
- Token storage in localStorage/frontend state

### Data Models
- **User**: username, email, password (hashed), createdAt
- **Transaction**: amount, type (income/expense), category, description, date, userId (ref), createdAt

### API Endpoints
- POST /api/auth/register - User registration
- POST /api/auth/login - User login
- GET /api/auth/me - Get current user info
- GET /api/transactions - Get all transactions for user
- POST /api/transactions - Create new transaction
- PUT /api/transactions/:id - Update transaction
- DELETE /api/transactions/:id - Delete transaction
- GET /api/summary - Get income/expense summary

### State Management
- React Context API for authentication state
- Local component state for form data and UI interactions
- API service layer for backend communication

## Code Quality & Standards
- ES6+ JavaScript syntax
- Consistent code formatting (Prettier configured)
- RESTful API design principles
- Error handling with appropriate HTTP status codes
- Input validation on both frontend and backend
- Environment variables for configuration (dotenv)

## Common Development Tasks
1. **Adding new features**: 
   - Create backend routes/controllers/models
   - Create frontend components/services
   - Update API service layer
   - Add necessary state/context updates

2. **Database operations**:
   - Define Mongoose models in /backend/models
   - Use controller functions for CRUD operations
   - Handle validation and errors appropriately

3. **Authentication flows**:
   - Protect backend routes with auth middleware
   - Manage token in frontend auth context
   - Redirect unauthenticated users to login

4. **Testing**:
   - Backend: Jest tests for controllers and models
   - Frontend: React Testing Library for components
   - Run tests with `npm test` in respective directories

## Environment Variables
Create `.env` files in both backend and frontend directories:

Backend (.env):
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/expense-tracker
JWT_SECRET=your_jwt_secret_here
NODE_ENV=development
```

Frontend (.env):
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Getting Started
1. Ensure MongoDB is running locally or update MONGODB_URI in backend/.env
2. Install dependencies: `npm install` (root) or separately in backend/ and frontend/
3. Start development: `npm run dev` (root) or separately:
   - Backend: `npm run dev` in backend/
   - Frontend: `npm start` in frontend/
4. Access application at http://localhost:3000