import type { Request, Response } from "express";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

// ✅ GET /api/admin/users
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "10", role } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const filters: any = {};
    if (role) filters.role = role;

    const users = await prisma.user.findMany({
      where: filters,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isSuspended: true,
        createdAt: true
      }
    });

    const total = await prisma.user.count({ where: filters });

    res.json({
      total,
      page: pageNum,
      users
    });

  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

// ✅ GET /api/admin/users/:id
export const getUserById = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        vendorProfile: true,
        riderProfile: true,
        orders: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { password, ...safeUser } = user;

    res.json(safeUser);

  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user" });
  }
};

// ✅ PATCH /api/admin/users/:id/status
export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const { isActive, isSuspended } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(isSuspended !== undefined && { isSuspended })
      }
    });

    res.json({
      message: "User status updated",
      user: updatedUser
    });

  } catch (error) {
    res.status(500).json({ message: "Failed to update status" });
  }
};

// ✅ PATCH /api/admin/users/:id/role
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const { role } = req.body;

    if (!Object.values(Role).includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role }
    });

    res.json({
      message: "User role updated",
      user: updatedUser
    });

  } catch (error) {
    res.status(500).json({ message: "Failed to update role" });
  }
};

// ✅ GET /api/admin/stats (BONUS)
export const getStats = async (req: Request, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalVendors = await prisma.user.count({
      where: { role: "VENDOR" }
    });
    const totalOrders = await prisma.order.count();

    res.json({
      totalUsers,
      totalVendors,
      totalOrders
    });

  } catch (error) {
    res.status(500).json({ message: "Failed to fetch stats" });
  }
};