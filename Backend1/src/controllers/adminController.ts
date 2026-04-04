import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { parse } from 'json2csv';
import { OrderStatus, ComplaintStatus } from '@prisma/client';

export const getPlatformStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const totalOrders = await prisma.order.count();
    
    const revenueAggr = await prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { in: ['delivered', 'accepted'] } }
    });
    
    const activeUsers = await prisma.user.count({ where: { status: 'active', role: 'user' } });
    const activeVendors = await prisma.vendor.count({ where: { status: 'active' } });
    const activeRiders = await prisma.user.count({ where: { status: 'active', role: 'courier' } });
    const pendingComplaints = await prisma.complaint.count({ where: { status: 'pending' } });
    
    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        totalRevenue: revenueAggr._sum.total || 0,
        activeUsers,
        activeVendors,
        activeRiders,
        pendingComplaints
      }
    });
  } catch (error) { next(error); }
};

export const listUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';
    
    const where = {
      role: 'user' as const,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } }
        ]
      } : {})
    };
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, name: true, email: true, phone: true, role: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);
    
    res.status(200).json({ success: true, data: users, meta: { total, page, limit } });
  } catch (error) { next(error); }
};

export const banUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return next(new AppError('User not found', 404));
    if (user.role === 'admin') return next(new AppError('Cannot alter admin status', 400));
    
    const newStatus = user.status === 'banned' ? 'active' : 'banned';
    const updated = await prisma.user.update({
      where: { id },
      data: { status: newStatus },
      select: { id: true, name: true, email: true, status: true }
    });
    
    res.status(200).json({ success: true, message: `User status changed to ${newStatus}`, data: updated });
  } catch (error) { next(error); }
};

export const listVendors = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';
    
    const where = search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } }
        ]
      } : {};
    
    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { status: true } } }
      }),
      prisma.vendor.count({ where })
    ]);
    
    res.status(200).json({ success: true, data: vendors, meta: { total, page, limit } });
  } catch (error) { next(error); }
};

export const toggleVendorStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) return next(new AppError('Vendor not found', 404));
    
    const newStatus = vendor.status === 'suspended' ? 'active' : 'suspended';
    const updated = await prisma.vendor.update({
      where: { id },
      data: { status: newStatus }
    });
    
    res.status(200).json({ success: true, message: `Vendor status changed to ${newStatus}`, data: updated });
  } catch (error) { next(error); }
};

export const listRiders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';
    
    const where = {
      role: 'courier' as const,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } }
        ]
      } : {})
    };
    
    const [riders, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: { 
          id: true, name: true, email: true, phone: true, status: true, createdAt: true,
          courierProfile: {
            select: { totalDeliveries: true, totalEarnings: true, availability: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);
    
    res.status(200).json({ success: true, data: riders, meta: { total, page, limit } });
  } catch (error) { next(error); }
};

export const toggleRiderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const rider = await prisma.user.findUnique({ where: { id, role: 'courier' } });
    if (!rider) return next(new AppError('Rider not found', 404));
    
    const newStatus = rider.status === 'banned' ? 'active' : 'banned';
    const updated = await prisma.user.update({
      where: { id },
      data: { status: newStatus },
      select: { id: true, name: true, email: true, status: true }
    });
    
    res.status(200).json({ success: true, message: `Rider status changed to ${newStatus}`, data: updated });
  } catch (error) { next(error); }
};

export const getOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } }, vendor: { select: { name: true } } }
      }),
      prisma.order.count()
    ]);
    
    res.status(200).json({ success: true, data: orders, meta: { total, page, limit } });
  } catch (error) { next(error); }
};

export const forceUpdateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!Object.values(OrderStatus).includes(status)) {
      return next(new AppError('Invalid order status provided', 400));
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status }
    });
    
    res.status(200).json({ success: true, message: `Order status forcefully updated to ${status}`, data: updated });
  } catch (error) { next(error); }
};

export const getComplaints = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const [complaints, total] = await Promise.all([
      prisma.complaint.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } }
      }),
      prisma.complaint.count()
    ]);
    
    res.status(200).json({ success: true, data: complaints, meta: { total, page, limit } });
  } catch (error) { next(error); }
};

export const resolveComplaint = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!Object.values(ComplaintStatus).includes(status)) {
      return next(new AppError('Invalid complaint status', 400));
    }

    const updated = await prisma.complaint.update({
      where: { id },
      data: { status }
    });
    
    res.status(200).json({ success: true, message: `Complaint marked as ${status}`, data: updated });
  } catch (error) { next(error); }
};

export const getDeliveryIssues = async (req: Request, res: Response, next: NextFunction) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
};

export const updateDeliveryIssue = async (req: Request, res: Response, next: NextFunction) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
};

// Data Exports
export const exportUsersCSV = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true }
    });
    
    const fields = ['id', 'name', 'email', 'role', 'status', 'createdAt'];
    const csv = parse(users, { fields });
    
    res.header('Content-Type', 'text/csv');
    res.attachment('iitkart-users-export.csv');
    return res.status(200).send(csv);
  } catch (error) { next(error); }
};

export const exportVendorsCSV = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendors = await prisma.vendor.findMany({
      select: { id: true, name: true, email: true, status: true, totalOrders: true, totalEarnings: true, rating: true, createdAt: true }
    });
    
    const fields = ['id', 'name', 'email', 'status', 'totalOrders', 'totalEarnings', 'rating', 'createdAt'];
    const csv = parse(vendors, { fields });
    
    res.header('Content-Type', 'text/csv');
    res.attachment('iitkart-vendors-export.csv');
    return res.status(200).send(csv);
  } catch (error) { next(error); }
};

export const exportOrdersCSV = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      select: { id: true, userId: true, vendorId: true, total: true, status: true, paymentMethod: true, kartCoinsEarned: true, createdAt: true }
    });
    
    const fields = ['id', 'userId', 'vendorId', 'total', 'status', 'paymentMethod', 'kartCoinsEarned', 'createdAt'];
    const csv = parse(orders, { fields });
    
    res.header('Content-Type', 'text/csv');
    res.attachment('iitkart-orders-export.csv');
    return res.status(200).send(csv);
  } catch (error) { next(error); }
};

export const exportRidersCSV = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const riders = await prisma.user.findMany({
      where: { role: 'courier' },
      select: { 
        id: true, name: true, email: true, phone: true, status: true, createdAt: true,
        courierProfile: { select: { totalDeliveries: true, totalEarnings: true } }
      }
    });
    
    const formattedRiders = riders.map((r: any) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone || '',
      status: r.status,
      totalDeliveries: r.courierProfile?.totalDeliveries || 0,
      totalEarnings: r.courierProfile?.totalEarnings || 0,
      createdAt: r.createdAt
    }));
    
    const fields = ['id', 'name', 'email', 'phone', 'status', 'totalDeliveries', 'totalEarnings', 'createdAt'];
    const csv = parse(formattedRiders, { fields });
    
    res.header('Content-Type', 'text/csv');
    res.attachment('iitkart-riders-export.csv');
    return res.status(200).send(csv);
  } catch (error) { next(error); }
};
