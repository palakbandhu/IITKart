import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../utils/helpers.js';

const prisma = new PrismaClient();

// Status Codes present in the responses still need to be verified from the SRS and the norms typically used.
// OTP autn. has been currently omitted for simplicity of code and the non-availability of SMS API till date. 
// Exotel se SMS API request kiya hai, 4th March tk OTP autn. implement kar denge.

// @description   Register a new user with Role Assignment
// @route   POST /api/auth/register
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      name, email, phone, password, role, 
      // Vendor
      shopName, shopType, openingTime, closingTime,
      // Rider
      vehicleType, vehicleNo 
    } = req.body;


    // Check for already existing user with same credentials
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }]
      }
    });

    if (existingUser) {
      res.status(400).json({ message: 'User with this email or phone already exists' });
      return;
    }

    // Password Hashing
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);


    //Role Determination and Profile Creation
    const userRole = role || 'CUSTOMER';
    let vendorProfileData = undefined;
    let riderProfileData = undefined;

    if (userRole === 'VENDOR') {
      if (!shopName || !shopType || !openingTime || !closingTime) {
        res.status(400).json({ message: 'Missing required vendor details' });
        return;
      }
      vendorProfileData = {
        create: { shopName, shopType, openingTime, closingTime }
      };
    } 
    else if (userRole === 'RIDER') {
      if (!vehicleType) {
        res.status(400).json({ message: 'Missing required rider details' });
        return;
      }
      riderProfileData = {
        create: { vehicleType, vehicleNo }
      };
    }

    // User creation in-case user does not already exist
    const user = await prisma.user.create({
        data: {
          name,
          email,
          phone,
          password: hashedPassword,
          role: userRole,
          ...(userRole === 'VENDOR' && {
            vendorProfile: {
              create: { shopName, shopType, openingTime, closingTime },
            },
          }),
          ...(userRole === 'RIDER' && {
            riderProfile: {
              create: { vehicleType, vehicleNo },
            },
          }),
        },
        include: {
          vendorProfile: true,
          riderProfile: true,
        },
      });

    //Authn. Token generation
    const token = generateToken(user.id, user.role);

    // Final Response for successful Registration
    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        vendorProfile: user.vendorProfile,
        riderProfile: user.riderProfile
      },
      token,
    });

  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Server error during registration', error });
  }
};

// @description   Authenticate user & get token
// @route   POST /api/auth/login
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const token = generateToken(user.id, user.role);

    res.status(200).json({
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login', error });
  }
};