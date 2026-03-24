import type { Request, Response } from "express";
import { PrismaClient, OrderStatus } from "@prisma/client";

const prisma = new PrismaClient();


export const createOrder = async (req: any, res: Response) => {
  try {

    const customerId = req.user.id;
    const { vendorId, items } = req.body;

    if (!vendorId || !items || items.length === 0) {
      return res.status(400).json({ message: "Invalid order payload" });
    }

    const productIds = items.map((item: any) => item.productId);

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });

    if (products.length !== items.length) {
      return res.status(400).json({ message: "Some products not found" });
    }

    let totalAmount = 0;

    const orderItems = items.map((item: any) => {

      const product = products.find(p => p.id === item.productId);

      if (!product) {
        throw new Error("Product not found");
      }

      if (product.vendorId !== vendorId) {
        throw new Error("Products must belong to the same vendor");
      }

      totalAmount += product.price * item.quantity;

      return {
        productId: product.id,
        quantity: item.quantity,
        price: product.price
      };

    });

    const order = await prisma.order.create({
      data: {
        customerId,
        vendorId,
        totalAmount,
        items: {
          create: orderItems
        }
      },
      include: {
        items: true
      }
    });

    return res.status(201).json(order);

  } catch (error) {

    console.error(error);
    return res.status(500).json({ message: "Failed to create order" });

  }
};



export const getOrders = async (req: any, res: Response) => {
  try {

    const userId = req.user.id;
    const role = req.user.role;

    let orders;

    if (role === "CUSTOMER") {

      orders = await prisma.order.findMany({
        where: { customerId: userId },
        include: { items: true },
        orderBy: { createdAt: "desc" }
      });

    }

    else if (role === "VENDOR") {

      const vendor = await prisma.vendorProfile.findUnique({
        where: { userId }
      });

      if (!vendor) {
        return res.status(404).json({ message: "Vendor profile not found" });
      }

      orders = await prisma.order.findMany({
        where: { vendorId: vendor.id },
        include: { items: true },
        orderBy: { createdAt: "desc" }
      });

    }

    else if (role === "RIDER") {

      const rider = await prisma.riderProfile.findUnique({
        where: { userId }
      });

      if (!rider) {
        return res.status(404).json({ message: "Rider profile not found" });
      }

      orders = await prisma.order.findMany({
        where: { riderId: rider.id },
        include: { items: true },
        orderBy: { createdAt: "desc" }
      });

    }

    return res.json(orders);

  } catch (error) {

    console.error(error);
    return res.status(500).json({ message: "Failed to fetch orders" });

  }
};



export const getOrderById = async (req: Request, res: Response) => {
  try {

    const orderId = Number(req.params.id);

    if (isNaN(orderId)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        customer: true,
        vendor: true,
        rider: true
      }
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.json(order);

  } catch (error) {

    console.error(error);
    return res.status(500).json({ message: "Failed to fetch order" });

  }
};



export const updateOrderStatus = async (req: any, res: Response) => {

  try {

    const orderId = Number(req.params.id);
    const { status } = req.body;

    const role = req.user.role;
    const userId = req.user.id;

    if (isNaN(orderId)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    if (!Object.values(OrderStatus).includes(status)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    
    if (role === "VENDOR") {

      const vendor = await prisma.vendorProfile.findUnique({
        where: { userId }
      });

      if (!vendor || vendor.id !== order.vendorId) {
        return res.status(403).json({ message: "Not your order" });
      }

      if (![OrderStatus.PREPARING, OrderStatus.READY].includes(status)) {
        return res.status(400).json({ message: "Vendor cannot set this status" });
      }

    }

    
    if (role === "RIDER") {

      const rider = await prisma.riderProfile.findUnique({
        where: { userId }
      });

      if (!rider) {
        return res.status(404).json({ message: "Rider profile not found" });
      }

      if (![OrderStatus.PICKED_UP, OrderStatus.DELIVERED].includes(status)) {
        return res.status(400).json({ message: "Rider cannot set this status" });
      }

      if (status === OrderStatus.PICKED_UP) {
        await prisma.order.update({
          where: { id: orderId },
          data: { riderId: rider.id }
        });
      }

    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status }
    });

    return res.json(updatedOrder);

  } catch (error) {

    console.error(error);
    return res.status(500).json({ message: "Failed to update order status" });

  }

};