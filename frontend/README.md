# IITKart - Campus Delivery Management System

A comprehensive campus delivery management system for IIT Kanpur that serves as a centralized platform for online delivery from campus vendors to the community (students, professors, staff).

## Features

### Four Distinct Interfaces

1. **User Interface**
   - Product browsing with search and filters
   - Shopping cart with Kart Coins loyalty system
   - Order tracking and history
   - Rating and feedback system
   - Multiple payment options (UPI, Cash on Delivery)
   - Detailed order bills with delivery charges breakdown

2. **Vendor Interface**
   - Product management (add, edit, delete)
   - Order management and processing
   - Sales analytics and reports
   - Inventory tracking

3. **Delivery Partner Interface**
   - Job matching and order acceptance
   - Real-time delivery tracking
   - Earnings dashboard
   - Issue reporting system

4. **Admin Interface**
   - User and vendor management
   - Order oversight and manual overrides
   - Complaint resolution system
   - Platform analytics and insights

### Key Features

- **Kart Coins Loyalty System**: Earn and redeem coins on purchases
- **Password Reset Flow**: Complete forgot password feature with OTP verification
- **Rating System**: Rate products, vendors, and delivery partners
- **Real-time Notifications**: Toast notifications for all actions
- **Responsive Design**: Works on desktop and mobile devices
- **Mock Data**: Pre-loaded with IIT Kanpur inspired shop names

## Tech Stack

- **Frontend**: React 18+ with TypeScript
- **Routing**: React Router v6
- **Styling**: Tailwind CSS v4
- **UI Components**: Shadcn/ui components
- **Icons**: Lucide React
- **Charts**: Recharts
- **Animations**: Framer Motion (motion/react)
- **Notifications**: Sonner (toast notifications)

## Installation

### Prerequisites

- Node.js 16+ or higher
- npm or pnpm package manager

### Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd iitkart
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173` (or the port shown in your terminal)

## Test Credentials

### User Account
- **Email**: `rahul@iitk.ac.in`
- **Phone**: `9876543210`
- **Password**: `password123`
- **Role**: User

### Vendor Account
- **Email**: `vendor@amulparlour.com`
- **Password**: `password123`
- **Role**: Vendor

### Delivery Partner Account
- **Email**: `courier@iitk.ac.in`
- **Password**: `password123`
- **Role**: Courier

### Admin Account
- **Email**: `admin@iitk.ac.in`
- **Password**: `admin123`
- **Role**: Admin

## Usage

### For Users
1. Login or register as a new user
2. Browse products from various campus vendors
3. Add items to cart
4. Set delivery location
5. Checkout with UPI or Cash on Delivery
6. Track orders and earn Kart Coins
7. Rate products and vendors

### For Vendors
1. Login with vendor credentials
2. Add and manage products
3. View and process incoming orders
4. Track sales analytics
5. Manage inventory

### For Delivery Partners
1. Login with courier credentials
2. Accept delivery requests
3. Track active deliveries
4. View earnings dashboard
5. Report issues if needed

### For Admins
1. Login with admin credentials
2. Oversee all platform activities
3. Manage users and vendors
4. Resolve complaints
5. View platform analytics

## Forgot Password Feature

The system includes a complete password reset flow:

1. Click "Forgot Password" on login page
2. Enter email or phone number
3. Receive 6-digit OTP (shown in notification for demo)
4. Enter OTP within 5 minutes
5. Set new password
6. Login with new credentials

**Test with**: `rahul@iitk.ac.in` or `9876543210`

## Project Structure

```
/
├── public/
│   └── assets/          # Logo and background images
├── src/
│   ├── app/
│   │   ├── components/  # React components
│   │   │   ├── ui/      # Reusable UI components
│   │   │   ├── AdminInterface.tsx
│   │   │   ├── AuthPage.tsx
│   │   │   ├── CourierInterface.tsx
│   │   │   ├── ForgotPassword.tsx
│   │   │   ├── HomePage.tsx
│   │   │   ├── UserInterfaceNew.tsx
│   │   │   └── VendorInterfaceNew.tsx
│   │   ├── contexts/    # React Context providers
│   │   │   └── AppContext.tsx
│   │   └── App.tsx      # Main app component
│   └── styles/          # CSS files
├── package.json
└── README.md
```

## Mock Data

The application comes pre-loaded with mock shops inspired by actual IIT Kanpur vendors:

- **Amul Parlour** - Sandwiches, beverages, ice cream
- **Photocopy Shop** - Printing and binding services
- **Wash & Iron** - Laundry services
- **Chhota Bazaar** - Stationery items
- **Nescafe** - Coffee and pastries
- **KC Shop** - Snacks and chai

All product images are served from Unsplash CDN and will load when you have an internet connection.

## Building for Production

```bash
npm run build
# or
pnpm build
```

The build output will be in the `dist` folder, ready to be deployed to any static hosting service.

## Notes

- All images (logo, backgrounds) are SVG files located in `/public/assets/`
- Product images are loaded from Unsplash CDN (requires internet connection)
- User data is stored in React Context (in-memory, resets on page refresh)
- For production use, integrate with a real backend API and database
- OTP verification is simulated; integrate real SMS/email service for production

## Features Coming Soon

- Real-time order tracking with maps
- Push notifications
- Multi-language support
- Dark mode
- Mobile app version

## Support

For issues or questions, please refer to the guidelines in `/guidelines/Guidelines.md`

## License

This project is for educational purposes as part of IIT Kanpur campus initiatives.
