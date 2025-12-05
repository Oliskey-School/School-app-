
# Smart School App - Backend

This directory contains the backend server for the Smart School Management App. It's built with Node.js, Express, TypeScript, and Prisma ORM.

## Setup Instructions

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v16 or later)
- [PostgreSQL](https://www.postgresql.org/) (or another database supported by Prisma)

### 2. Installation
Navigate to the `backend` directory and install the dependencies:
```bash
cd backend
npm install
```

### 3. Environment Variables
Create a `.env` file in the `backend` directory by copying the example file:
```bash
cp .env.example .env
```
Now, open the `.env` file and update the variables:
- `DATABASE_URL`: Set this to your PostgreSQL connection string.
- `JWT_SECRET`: Change this to a long, random, and secret string for security.

### 4. Database Setup
Prisma will manage the database schema based on the `prisma/schema.prisma` file. To create the tables in your database, run:
```bash
npx prisma db push
```
This command will inspect your schema and apply the necessary changes to your database.

### 5. Running the Server

- **For development (with auto-reloading):**
  ```bash
  npm run dev
  ```
  The server will start on the port specified in your `.env` file (default is 3000).

- **For production:**
  First, build the TypeScript code into JavaScript:
  ```bash
  npm run build
  ```
  Then, start the server:
  ```bash
  npm start
  ```

## API Structure

The API is structured to be modular and scalable:
- `src/server.ts`: The main entry point that sets up the Express server.
- `src/api/routes/`: Contains route definitions for different resources (e.g., `auth.routes.ts`, `student.routes.ts`).
- `src/api/controllers/`: Handles the business logic for each route.
- `src/api/services/`: Contains the logic for interacting with the database via Prisma.
- `src/api/middleware/`: Holds middleware functions, such as for authenticating requests.
- `prisma/schema.prisma`: The single source of truth for your database schema.
