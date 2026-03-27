
# IITKart 

IITKart is a comprehensive campus e-commerce and delivery platform designed to connect Customers, Vendors, and Riders (Delivery Partners) within the campus ecosystem. It features real-time order tracking, email OTP verification, and a dedicated Super Admin dashboard.

## Tech Stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express.js, TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT & Email OTP Verification (Nodemailer)

---

## Local Setup & Installation Guide

Follow these steps to get the project running locally on your system.

### 1. Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (Running locally or via a cloud provider like Supabase/Neon)
- Git

### 2. Clone the Repository

```bash
git clone <repository-url>
cd Myproject
```

### 3. Backend Setup

Navigate to the backend directory:

```bash
cd Backend1
npm install
```

#### Step 3.1: Database Creation

Assuming you have PostgreSQL installed natively on your system, you can instantly create the required database by logging into the PostgreSQL terminal.

Open your system terminal and log into the Postgres prompt:

```bash
psql postgres
```

Once inside the `postgres=#` prompt, paste and execute these specific SQL commands:

```sql
CREATE USER postgres WITH PASSWORD 'postgres';
CREATE DATABASE iitkart;
GRANT ALL PRIVILEGES ON DATABASE iitkart TO postgres;
\q
```

> Note: Depending on your OS schema, you might need to use `sudo -u postgres psql` to access the terminal initially. If you don't wish to install Postgres locally, a free cloud database URI from Neon.tech acts identically.

#### Step 3.2: Environment Variables

Create a `.env` file inside the `Backend1` directory and add the following:

```env
# Server
PORT=5001
NODE_ENV="development"

# Database (From Step 3.1)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/iitkart?schema=public"

# Authentication
JWT_SECRET="your_jwt_secret_key_here"
JWT_EXPIRES_IN="7d"

# Email / OTP Verification (Nodemailer)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-16-letter-google-app-password"
FROM_EMAIL="your-email@gmail.com"
```

> Note: To test the actual Email OTP flow yourself, you must provide a valid Gmail App Password in `SMTP_PASS` securely.

#### Step 3.3: Database Initialization

Push the Prisma schema to your newly created PostgreSQL database to instantly generate all the necessary tables:

```bash
npx prisma db push
```

#### Step 3.4: Start the Backend

```bash
npm run dev
```

> The backend will run on `http://localhost:5001`. Upon startup, it automatically seeds the database with a default Super Admin account.

### 4. Frontend Setup

Open a new terminal window and navigate to the frontend directory:

```bash
cd frontend
npm install
```

Start the frontend:

```bash
npm run dev
```

> The frontend will run on `http://localhost:5173`.

---

## Testing Guide for TAs

Here is how you can completely test the platform's core features:

### 1. Super Admin Dashboard Validation

The platform automatically provisions a Super Admin account on backend startup. You do not need to manually seed the database.

- Go to: `http://localhost:5173/`
- Email: `admin@iitk.ac.in`
- Password: `admin@123`

This dashboard allows you to view system analytics, monitor all users, vendors, and manage banned accounts.

### 2. Email OTP Registration Flow

We have implemented a secure Email OTP verification system.

1. Click **Create Account** on the login page.
2. Register as a Customer, Vendor, or Rider.
3. You will be redirected to an OTP screen. An email containing a 6-digit OTP will be sent to the registered email address.
4. Enter the OTP to successfully finalize the account creation and log in.

### 3. Forgot Password Flow

1. Click **Forgot Password?** on the login screen.
2. Enter your registered email.
3. Retrieve the OTP from your email inbox and enter it.
4. Set a new password and try logging in inside the app.

### 4. Core Role Workflows

- **Customer:** Can browse products, add items to the cart, place orders, and raise complaints.
- **Vendor:** Has a dedicated dashboard to manage products, view incoming orders, update order status (Accepted -> Ready), and view delivery issues raised by riders.
- **Rider (Courier):** Can view available orders ready for pickup, accept delivery jobs, update delivery status, and flag issues (like "Customer Unavailable").

---

## Troubleshooting

- **Address already in use (EADDRINUSE):** If you get a port 5001 error, make sure no other background node processes are running.
- **Email OTPs not sending:** Ensure your Google Account has 2-Step Verification enabled and you have generated a strict "App Password" (16 characters) for your `.env` file, as normal Gmail passwords will be rejected by Google's SMTP servers.
```
