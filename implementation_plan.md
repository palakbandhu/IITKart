# Local Setup Implementation Plan

## Proposed Flow

1. **Environment Variables**:
   We will create the following `.env` files:
   - `Backend1/.env`: Will include `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `PORT`, `NODE_ENV`, and `FRONTEND_URL`.
   - `frontend/.env`: Will include parameters like `VITE_API_URL` based on our frontend file analysis.

2. **Database Setup**:
   - Create a local PostgreSQL database `iitkart`.
   - Ensure the `DATABASE_URL` in `Backend1/.env` points to `postgresql://postgres:password@localhost:5432/iitkart?schema=public` (I will ask the user for their postgres password if needed or default to something common).
   - Change directory into `Backend1` and run `npx prisma migrate dev` / `npx prisma db seed`.

3. **Install Dependencies**:
   - Run `npm install` in `frontend/`.
   - Run `npm install` in `Backend1/`.

4. **Start Servers**:
   - Run `npm run dev` in `Backend1/`.
   - Run `npm run dev` in `frontend/`.

## User Review Required

Please confirm:
1. What are your local PostgreSQL credentials (username and password)? I need these for `DATABASE_URL`! If you don't have postgres installed locally, let me know. 
2. Are you ok with dummy/empty values for Razorpay and SMTP settings for now?

## Verification Plan
### Automated Tests
- Server startup will confirm valid environment variables.
- Prisma migration will confirm the database connection is valid.

### Manual Verification
- Testing the frontend by visiting `http://localhost:5173`.
- Using test accounts mentioned in [SETUP_GUIDE.md](file:///c:/Users/deshp/Documents/Demo/frontend/SETUP_GUIDE.md) to confirm system is functioning locally.
