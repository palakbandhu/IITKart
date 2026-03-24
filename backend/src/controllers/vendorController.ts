import { PrismaClient } from "@prisma/client";
import type { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware.js";

const prisma = new PrismaClient();

export const toggleShopStatus = async (req: AuthRequest, res: Response) => {
  try {
    // 1. Find vendor
    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!vendor) {
      return res.status(404).json({ message: "Vendor profile not found" });
    }

    // 2. Toggle status
    const updatedVendor = await prisma.vendorProfile.update({
      where: { id: vendor.id },
      data: {
        isOpen: !vendor.isOpen,
      },
    });

    res.status(200).json({
      message: `Shop is now ${updatedVendor.isOpen ? "OPEN" : "CLOSED"}`,
      isOpen: updatedVendor.isOpen,
    });
  } catch (error) {
    res.status(500).json({ message: "Error toggling shop status" });
  }
};