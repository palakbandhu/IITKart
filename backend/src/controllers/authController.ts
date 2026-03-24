// import type { Request, Response } from 'express';
// import bcrypt from 'bcrypt';
// import { PrismaClient } from '@prisma/client';
// import { generateToken } from '../utils/helpers.js';

// const prisma = new PrismaClient();

// // Status Codes present in the responses still need to be verified from the SRS and the norms typically used.
// // OTP autn. has been currently omitted for simplicity of code and the non-availability of SMS API till date. 
// // Exotel se SMS API request kiya hai, 4th March tk OTP autn. implement kar denge.

// // @description   Register a new user with Role Assignment
// // @route   POST /api/auth/register
// export const registerUser = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { 
//       name, email, phone, password, role, 
//       // Vendor
//       shopName, shopType, openingTime, closingTime,
//       // Rider
//       vehicleType, vehicleNo 
//     } = req.body;


//     // Check for already existing user with same credentials
//     const existingUser = await prisma.user.findFirst({
//       where: {
//         OR: [{ email }, { phone }]
//       }
//     });

//     if (existingUser) {
//       res.status(400).json({ message: 'User with this email or phone already exists' });
//       return;
//     }

//     // Password Hashing
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);


//     //Role Determination and Profile Creation
//     const userRole = role || 'CUSTOMER';
//     let vendorProfileData = undefined;
//     let riderProfileData = undefined;

//     if (userRole === 'VENDOR') {
//       if (!shopName || !shopType || !openingTime || !closingTime) {
//         res.status(400).json({ message: 'Missing required vendor details' });
//         return;
//       }
//       vendorProfileData = {
//         create: { shopName, shopType, openingTime, closingTime }
//       };
//     } 
//     else if (userRole === 'RIDER') {
//       if (!vehicleType) {
//         res.status(400).json({ message: 'Missing required rider details' });
//         return;
//       }
//       riderProfileData = {
//         create: { vehicleType, vehicleNo }
//       };
//     }

//     // User creation in-case user does not already exist
//     const user = await prisma.user.create({
//         data: {
//           name,
//           email,
//           phone,
//           password: hashedPassword,
//           role: userRole,
//           ...(userRole === 'VENDOR' && {
//             vendorProfile: {
//               create: { shopName, shopType, openingTime, closingTime },
//             },
//           }),
//           ...(userRole === 'RIDER' && {
//             riderProfile: {
//               create: { vehicleType, vehicleNo },
//             },
//           }),
//         },
//         include: {
//           vendorProfile: true,
//           riderProfile: true,
//         },
//       });

//     //Authn. Token generation
//     const token = generateToken(user.id, user.role);

//     // Final Response for successful Registration
//     res.status(201).json({
//       message: 'Registration successful',
//       user: {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//         vendorProfile: user.vendorProfile,
//         riderProfile: user.riderProfile
//       },
//       token,
//     });

//   } catch (error) {
//     console.error('Registration Error:', error);
//     res.status(500).json({ message: 'Server error during registration', error });
//   }
// };

// // @description   Authenticate user & get token
// // @route   POST /api/auth/login
// export const loginUser = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { email, password } = req.body;

//     const user = await prisma.user.findUnique({ where: { email } });

//     if (!user) {
//       res.status(401).json({ message: 'Invalid email or password' });
//       return;
//     }

//     const isMatch = await bcrypt.compare(password, user.password);

//     if (!isMatch) {
//       res.status(401).json({ message: 'Invalid email or password' });
//       return;
//     }

//     const token = generateToken(user.id, user.role);

//     res.status(200).json({
//       message: 'Login successful',
//       user: { id: user.id, name: user.name, email: user.email, role: user.role },
//       token,
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error during login', error });
//   }
// };

import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../utils/helpers.js';
// Import the new utilities we created earlier
import { generateOTP, hashOTP, verifyOTPHash, sendOTP } from "../utils/otpUtils.js";

const prisma = new PrismaClient();

// Tracker for rate limiting (1 minute cooldown)
const otpRequestTracker: Map<string, number> = new Map();
const OTP_COOLDOWN_MS = 60 * 1000;

// --- NEW FUNCTION: SEND OTP ---
export const sendOTPHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: "Valid 10-digit phone number is required." });
    }

    const lastRequest = otpRequestTracker.get(phone);
    if (lastRequest && Date.now() - lastRequest < OTP_COOLDOWN_MS) {
      return res.status(429).json({ message: "Please wait 60 seconds before requesting again." });
    }

    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Save/Update the user record with the new OTP
    await prisma.user.upsert({
      where: { phone },
      update: { otpHash, otpExpiry },
      create: { phone, isPhoneVerified: false, otpHash, otpExpiry },
    });

    otpRequestTracker.set(phone, Date.now());
    sendOTP(phone, otp);

    res.status(200).json({ message: "OTP sent successfully. Check terminal." });
  } catch (error) {
    next(error);
  }
};

// --- MODIFIED: REGISTER USER (Now checks OTP) ---
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      name, email, phone, password, role, otp, // Added otp here
      shopName, shopType, openingTime, closingTime,
      vehicleType, vehicleNo 
    } = req.body;

    // 1. Verify OTP first
    const userRecord = await prisma.user.findUnique({ where: { phone } });
    if (!userRecord || !userRecord.otpHash || !userRecord.otpExpiry || new Date() > userRecord.otpExpiry) {
      res.status(400).json({ message: "OTP expired or not requested." });
      return;
    }
    const isOTPValid = await verifyOTPHash(otp, userRecord.otpHash);
    if (!isOTPValid) {
      res.status(400).json({ message: "Invalid OTP." });
      return;
    }

    // 2. Check if email is already taken (since phone is already in DB from sendOTP)
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail && existingEmail.phone !== phone) {
      res.status(400).json({ message: 'Email already in use by another account' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userRole = role || 'CUSTOMER';

    // 3. Update the existing record (created during sendOTP) with full details
    const user = await prisma.user.update({
      where: { phone },
      data: {
        name,
        email,
        password: hashedPassword,
        role: userRole,
        isPhoneVerified: true, // Verification complete
        otpHash: null,        // Clear OTP
        otpExpiry: null,      // Clear Expiry
        ...(userRole === 'VENDOR' && {
          vendorProfile: { create: { shopName, shopType, openingTime, closingTime } },
        }),
        ...(userRole === 'RIDER' && {
          riderProfile: { create: { vehicleType, vehicleNo } },
        }),
      },
      include: { vendorProfile: true, riderProfile: true },
    });

    const token = generateToken(user.id, user.role);
    res.status(201).json({ message: 'Registration successful', user, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// --- MODIFIED: LOGIN USER (Added OTP Login option) ---
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, phone, password, otp } = req.body;

    // IF OTP IS PROVIDED: Perform OTP Login
    if (phone && otp) {
      const user = await prisma.user.findUnique({ where: { phone } });
      if (!user || !user.otpHash || !user.otpExpiry || new Date() > user.otpExpiry) {
        res.status(400).json({ message: "Invalid or expired OTP." });
        return;
      }
      const isMatch = await verifyOTPHash(otp, user.otpHash);
      if (!isMatch) {
        res.status(401).json({ message: "Invalid OTP." });
        return;
      }
      // Success: Clear OTP and issue token
      await prisma.user.update({ where: { phone }, data: { otpHash: null, otpExpiry: null } });
      const token = generateToken(user.id, user.role);
      res.status(200).json({ message: 'Login successful', user, token });
      return;
    }

    // ELSE: Perform standard Email/Password Login
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password!))) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const token = generateToken(user.id, user.role);
    res.status(200).json({ message: 'Login successful', user, token });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login' });
  }
};