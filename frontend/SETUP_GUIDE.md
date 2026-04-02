# IITKart - Local Setup Guide

## Quick Start (3 Steps)

### 1. Install Dependencies

```bash
npm install
# or
pnpm install
# or
yarn install
```

### 2. Start Development Server

```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```

### 3. Open in Browser

Navigate to `http://localhost:5173` (or the port shown in your terminal)

## What's Included

### ✅ All Images are Now Local

All images have been replaced with local SVG files stored in `/public/assets/`:

- **Logo**: `/public/assets/logo.svg` - IITKart logo with shopping cart icon
- **Background**: `/public/assets/background.svg` - Beige/cream auth page background
- **Home Background**: `/public/assets/home-background.svg` - Campus-themed homepage background

Product images use Unsplash CDN URLs which work automatically when you have internet access.

### ✅ Complete Toast Notifications

Toast notifications are now fully visible with:
- Full opacity (no transparency issues)
- Dark, readable text
- Color-coded backgrounds (green for success, red for error, etc.)
- Enhanced shadows for better visibility

## File Structure

```
IITKart/
├── public/
│   └── assets/          # All local images (logo, backgrounds)
├── src/
│   ├── app/
│   │   ├── components/  # All React components
│   │   ├── contexts/    # React Context (AppContext)
│   │   └── App.tsx      # Main app component
│   └── styles/          # CSS files (theme, tailwind, fonts)
├── package.json         # Dependencies
├── README.md           # Full project documentation
├── SETUP_GUIDE.md      # This file
└── .gitignore          # Git ignore rules
```

## Troubleshooting

### Port Already in Use

If port 5173 is already in use, Vite will automatically use the next available port. Check your terminal output for the actual port number.

### Module Not Found Errors

Make sure you've run `npm install` (or `pnpm install`) to install all dependencies.

### Images Not Loading

1. Make sure the dev server is running
2. Check that files exist in `/public/assets/`
3. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)

### TypeScript Errors

The project uses TypeScript. If you see type errors:
1. Make sure your IDE has TypeScript support
2. Restart your IDE/editor
3. Run `npm run build` to check for build errors

## Test Accounts (Pre-loaded)

### User
- Email: `rahul@iitk.ac.in`
- Phone: `9876543210`
- Password: `password123`

### Vendor
- Email: `vendor@amulparlour.com`
- Password: `password123`

### Delivery Partner
- Email: `courier@iitk.ac.in`
- Password: `password123`

### Admin
- Email: `admin@iitk.ac.in`
- Password: `password123`

## Features to Test

1. **Forgot Password Flow**
   - Use email: `rahul@iitk.ac.in` or phone: `9876543210`
   - OTP will be displayed in the toast notification
   - 5-minute expiry timer with 3 attempts

2. **Toast Notifications**
   - All notifications are now clearly visible
   - Different colors for different types (success, error, info, warning)
   - Full opacity text

3. **All Interfaces**
   - User: Browse products, add to cart, checkout, track orders
   - Vendor: Manage products, view orders, analytics
   - Courier: Accept deliveries, track earnings, view feedback
   - Admin: Manage platform, resolve complaints, view analytics

## Building for Production

```bash
npm run build
# or
pnpm build
```

Output will be in `/dist` folder, ready for deployment.

## Need Help?

- Check the main [README.md](./README.md) for full documentation
- All images are stored locally in `/public/assets/`
- Product images load from Unsplash (requires internet)
- For production, consider hosting your own product images

## What's Different from Figma Make?

1. **Images**: Replaced `figma:asset` imports with local `/assets/` files
2. **Everything Works Offline**: Except product images from Unsplash
3. **No Special Build Process**: Standard Vite + React setup
4. **Can Deploy Anywhere**: Vercel, Netlify, GitHub Pages, etc.

Enjoy using IITKart! 🚀
