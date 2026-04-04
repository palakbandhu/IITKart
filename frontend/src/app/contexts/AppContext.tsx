import React, { createContext, useContext, useState, ReactNode } from 'react';
import api from '@/api/axios';

export interface Product {
  id: string;
  vendorId: string;
  vendorName: string;
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
  inStock: boolean;
  stockQuantity: number;
  isBestseller?: boolean;
  isFavorite?: boolean;
  rating?: number;
  totalReviews?: number;
  reviews?: ProductReview[];
}

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  orderId?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'CUSTOMER' | 'user' | 'VENDOR' | 'vendor' | 'RIDER' | 'courier' | 'ADMIN' | 'admin';
  kartCoins: number;
  orderHistory: Order[];
  phone?: string;
  address?: string;
  favorites?: string[];
  photo?: string;
}

export interface Order {
  id: string;
  userId: string;
  vendorId: string;
  products: { productId: string; quantity: number; price: number }[];
  total: number;
  status: 'pending' | 'accepted' | 'picked' | 'delivered' | 'cancelled';
  courierId?: string;
  courier?: any;
  kartCoinsEarned: number;
  kartCoinsUsed?: number;
  date: string;
  createdAt?: string;
  items?: any[];
  rating?: number;
  feedback?: string;
  courierRating?: number;
  courierFeedback?: string;
  vendorRating?: number;
  vendorFeedback?: string;
  deliveryAddress: string;
  paymentStatus: 'pending' | 'processing' | 'success' | 'failed' | 'refunded';
  paymentMethod: string;
}

export interface Vendor {
  id: string;
  userId?: string;
  name: string;
  email: string;
  products: Product[];
  needsRider: boolean;
  riderRequirements?: string;
  rating: number;
  totalOrders: number;
  totalEarnings: number;
  status: 'active' | 'suspended';
  availability: string;
  location?: string;
}

export interface CourierJob {
  id: string;
  vendorId: string;
  vendorName: string;
  requirements: string;
  salary: number;
  isAvailable: boolean;
}

export interface CourierProfile {
  id: string;
  name: string;
  email: string;
  experience: string;
  availability: string;
  lookingForJob: boolean;
  totalDeliveries: number;
  totalEarnings: number;
}

export interface Complaint {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  description: string;
  status: 'pending' | 'resolved' | 'closed';
  date: string;
  type?: 'order' | 'delivery' | 'vendor' | 'general';
  orderId?: string;
  relatedTo?: string; // vendorId or courierId
}

export interface DeliveryIssue {
  id: string;
  orderId: string;
  courierId: string;
  courierName: string;
  issueType: 'customer_unavailable' | 'address_incorrect' | 'item_damaged' | 'accident' | 'vehicle_breakdown' | 'other';
  description: string;
  status: 'pending' | 'resolved' | 'escalated';
  date: string;
  resolutionNotes?: string;
}

export interface Payment {
  paymentID: string;
  orderID: string;
  userID: string;
  amount: number;
  currency: string;
  paymentStatus: 'pending' | 'processing' | 'success' | 'failed' | 'refunded';
  createdAt: string;
  receipt?: string;
}

export interface RazorpayPayment {
  razorpaypaymentID: string;
  razorpayorderID: string;
  razorpaySignature: string;
  method: 'card' | 'upi' | 'netbanking' | 'wallet';
}

export interface TransactionHistory {
  historyID: string;
  userID: string;
  paymentRecords: Payment[];
}

interface AppContextType {
  products: Product[];
  refreshProducts: () => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  removeProduct: (productId: string) => void;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  authLoading: boolean;
  logout: () => void;
  updateUserCoins: (userId: string, coins: number) => void;
  login: (email: string, password: string) => Promise<User | null>;
  register: (name: string, email: string, password: string, role: User['role'], phone?: string, address?: string) => Promise<any>;
  verifyRegistrationOtp: (userId: string, otp: string) => Promise<User | null>;
  resendRegistrationOtp: (userId: string) => Promise<boolean>;
  
  requestPasswordReset: (email: string) => Promise<string | null>;
  verifyPasswordResetOtp: (userId: string, otp: string) => Promise<string | null>;
  resetPassword: (userId: string, resetToken: string, newPassword: string) => Promise<boolean>;
  
  orders: Order[];
  refreshOrders: () => Promise<void>;
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  addOrderRating: (orderId: string, rating: number, feedback: string) => void;
  rateOrder: (orderId: string, type: 'product'|'courier'|'vendor', rating: number, feedback: string) => Promise<void>;
  assignCourier: (orderId: string, courierId: string) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  
  vendors: Vendor[];
  updateVendor: (vendorId: string, updates: Partial<Vendor>) => void;
  
  courierJobs: CourierJob[];
  addCourierJob: (job: CourierJob) => void;
  updateCourierJob: (jobId: string, updates: Partial<CourierJob>) => void;
  
  courierProfiles: CourierProfile[];
  addCourierProfile: (profile: CourierProfile) => void;
  updateCourierProfile: (profileId: string, updates: Partial<CourierProfile>) => void;
  
  cart: { productId: string; quantity: number }[];
  addToCart: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  
  users: User[];
  updateUser: (userId: string, updates: Partial<User>) => void;
  addUser: (user: User) => void;
  toggleFavorite: (productId: string) => Promise<void>;
  
  complaints: Complaint[];
  addComplaint: (complaint: Complaint) => void;
  updateComplaint: (complaintId: string, updates: Partial<Complaint>) => void;
  
  deliveryIssues: DeliveryIssue[];
  addDeliveryIssue: (issue: DeliveryIssue) => void;
  updateDeliveryIssue: (issueId: string, updates: Partial<DeliveryIssue>) => void;
  
  payments: Payment[];
  createPayment: (orderID: string, userID: string, amount: number, currency: string) => Payment;
  updatePaymentStatus: (paymentID: string, status: Payment['paymentStatus']) => void;
  generateReceipt: (paymentID: string) => string;
  getTransactionHistory: (userID: string) => Payment[];
  createRazorpayOrder: (amount: number, currency: string) => RazorpayPayment;
  capturePayment: (razorpayPaymentID: string, razorpayOrderID: string, razorpaySignature: string, method: RazorpayPayment['method']) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Extended Mock Data
const MOCK_PRODUCTS: Product[] = [
  // Amul Parlour
  { id: '1', vendorId: 'v1', vendorName: 'Amul Parlour', name: 'Veg Sandwich', category: 'Food', price: 50, description: 'Fresh veg sandwich with cheese', image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400', inStock: true, stockQuantity: 100 },
  { id: '2', vendorId: 'v1', vendorName: 'Amul Parlour', name: 'Cold Coffee', category: 'Beverage', price: 40, description: 'Chilled cold coffee', image: 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=400', inStock: true, stockQuantity: 100 },
  { id: '12', vendorId: 'v1', vendorName: 'Amul Parlour', name: 'Ice Cream', category: 'Food', price: 60, description: 'Amul ice cream 100ml', image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400', inStock: true, stockQuantity: 100 },
  { id: '13', vendorId: 'v1', vendorName: 'Amul Parlour', name: 'Cheese Burger', category: 'Food', price: 80, description: 'Delicious cheese burger', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', inStock: true, stockQuantity: 100 },
  { id: '14', vendorId: 'v1', vendorName: 'Amul Parlour', name: 'Milkshake', category: 'Beverage', price: 70, description: 'Thick milkshake', image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400', inStock: true, stockQuantity: 100 },
  
  // Photocopy Shop
  { id: '3', vendorId: 'v2', vendorName: 'Photocopy Shop', name: 'Color Printout', category: 'Printing', price: 10, description: 'Per page color printing', image: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=400', inStock: true, stockQuantity: 100 },
  { id: '4', vendorId: 'v2', vendorName: 'Photocopy Shop', name: 'B&W Printout', category: 'Printing', price: 2, description: 'Per page black and white printing', image: 'https://images.unsplash.com/photo-1585012977345-39cef1fc80e0?w=400', inStock: true, stockQuantity: 100 },
  { id: '15', vendorId: 'v2', vendorName: 'Photocopy Shop', name: 'Spiral Binding', category: 'Printing', price: 30, description: 'Spiral binding service', image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400', inStock: true, stockQuantity: 100 },
  
  // Wash & Iron
  { id: '5', vendorId: 'v3', vendorName: 'Wash & Iron', name: 'Laundry Service', category: 'Laundry', price: 100, description: 'Wash and iron service per kg', image: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=400', inStock: true, stockQuantity: 100 },
  { id: '16', vendorId: 'v3', vendorName: 'Wash & Iron', name: 'Dry Cleaning', category: 'Laundry', price: 150, description: 'Professional dry cleaning', image: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=400', inStock: true, stockQuantity: 100 },
  
  // Chhota Bazaar
  { id: '6', vendorId: 'v4', vendorName: 'Chhota Bazaar', name: 'Notebook A4', category: 'Stationery', price: 40, description: 'A4 size notebook 200 pages', image: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=400', inStock: true, stockQuantity: 100 },
  { id: '11', vendorId: 'v4', vendorName: 'Chhota Bazaar', name: 'Pen Set', category: 'Stationery', price: 50, description: 'Blue pen set of 5', image: 'https://images.unsplash.com/photo-1586932219544-9d33a58cc6c2?w=400', inStock: true, stockQuantity: 100 },
  { id: '17', vendorId: 'v4', vendorName: 'Chhota Bazaar', name: 'Calculator', category: 'Stationery', price: 200, description: 'Scientific calculator', image: 'https://images.unsplash.com/photo-1611224885990-ab7363d1f2a3?w=400', inStock: true, stockQuantity: 100 },
  { id: '18', vendorId: 'v4', vendorName: 'Chhota Bazaar', name: 'File Folder', category: 'Stationery', price: 25, description: 'Plastic file folder', image: 'https://images.unsplash.com/photo-1586105449897-20b5efeb3233?w=400', inStock: true, stockQuantity: 100 },
  
  // Nescafe
  { id: '7', vendorId: 'v5', vendorName: 'Nescafe', name: 'Cappuccino', category: 'Beverage', price: 30, description: 'Hot cappuccino', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400', inStock: true, stockQuantity: 100 },
  { id: '8', vendorId: 'v5', vendorName: 'Nescafe', name: 'Chocolate Pastry', category: 'Food', price: 35, description: 'Fresh chocolate pastry', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400', inStock: true, stockQuantity: 100 },
  { id: '19', vendorId: 'v5', vendorName: 'Nescafe', name: 'Espresso', category: 'Beverage', price: 35, description: 'Strong espresso shot', image: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400', inStock: true, stockQuantity: 100 },
  { id: '20', vendorId: 'v5', vendorName: 'Nescafe', name: 'Croissant', category: 'Food', price: 45, description: 'Buttery croissant', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400', inStock: true, stockQuantity: 100 },
  
  // KC Shop
  { id: '9', vendorId: 'v6', vendorName: 'KC Shop', name: 'Maggi', category: 'Food', price: 25, description: 'Hot maggi noodles', image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400', inStock: true, stockQuantity: 100 },
  { id: '10', vendorId: 'v6', vendorName: 'KC Shop', name: 'Samosa', category: 'Food', price: 15, description: 'Crispy samosa', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400', inStock: true, stockQuantity: 100 },
  { id: '21', vendorId: 'v6', vendorName: 'KC Shop', name: 'Vada Pav', category: 'Food', price: 20, description: 'Mumbai style vada pav', image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=400', inStock: true, stockQuantity: 100 },
  { id: '22', vendorId: 'v6', vendorName: 'KC Shop', name: 'Chai', category: 'Beverage', price: 10, description: 'Hot masala chai', image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400', inStock: true, stockQuantity: 100 },
];

const MOCK_VENDORS: Vendor[] = [
  { id: 'v1', name: 'Amul Parlour', email: 'amul@iitk.ac.in', products: [], needsRider: true, riderRequirements: 'Available 8AM-10PM, bicycle/bike required', rating: 4.5, totalOrders: 156, totalEarnings: 45600, status: 'active', availability: '8AM-10PM' },
  { id: 'v2', name: 'Photocopy Shop', email: 'photocopy@iitk.ac.in', products: [], needsRider: false, rating: 4.8, totalOrders: 89, totalEarnings: 12340, status: 'active', availability: '9AM-9PM' },
  { id: 'v3', name: 'Wash & Iron', email: 'laundry@iitk.ac.in', products: [], needsRider: true, riderRequirements: 'Morning and evening shifts, pickup-delivery service', rating: 4.2, totalOrders: 67, totalEarnings: 23450, status: 'active', availability: '7AM-8PM' },
  { id: 'v4', name: 'Chhota Bazaar', email: 'bazaar@iitk.ac.in', products: [], needsRider: false, rating: 4.6, totalOrders: 134, totalEarnings: 34500, status: 'active', availability: '8AM-11PM' },
  { id: 'v5', name: 'Nescafe', email: 'nescafe@iitk.ac.in', products: [], needsRider: true, riderRequirements: 'Available 7AM-11PM, quick delivery required', rating: 4.7, totalOrders: 201, totalEarnings: 56700, status: 'active', availability: '7AM-11PM' },
  { id: 'v6', name: 'KC Shop', email: 'kc@iitk.ac.in', products: [], needsRider: true, riderRequirements: 'Evening shifts 6PM-10PM', rating: 4.4, totalOrders: 178, totalEarnings: 38900, status: 'active', availability: '6AM-10PM' },
];

const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Rahul Kumar', email: 'rahul@iitk.ac.in', password: 'password123', role: 'CUSTOMER', kartCoins: 150, orderHistory: [], phone: '9876543210', address: 'Hall 2, Room 201' },
  { id: 'u2', name: 'Priya Singh', email: 'priya@iitk.ac.in', password: 'password123', role: 'CUSTOMER', kartCoins: 220, orderHistory: [], phone: '9876543211', address: 'Hall 5, Room 105' },
  { id: 'u3', name: 'Amit Sharma', email: 'amit@iitk.ac.in', password: 'password123', role: 'CUSTOMER', kartCoins: 80, orderHistory: [], phone: '9876543212', address: 'Hall 3, Room 302' },
  { id: 'u4', name: 'Neha Gupta', email: 'neha@iitk.ac.in', password: 'password123', role: 'CUSTOMER', kartCoins: 340, orderHistory: [], phone: '9876543213', address: 'Hall 7, Room 410' },
  // Vendor users
  { id: 'v1', name: 'Amul Parlour', email: 'amul@iitk.ac.in', password: 'password123', role: 'VENDOR', kartCoins: 0, orderHistory: [], phone: '9876543220', address: 'Campus Vendor Area' },
  { id: 'v2', name: 'Photocopy Shop', email: 'photocopy@iitk.ac.in', password: 'password123', role: 'VENDOR', kartCoins: 0, orderHistory: [], phone: '9876543221', address: 'Campus Vendor Area' },
  { id: 'v3', name: 'Wash & Iron', email: 'laundry@iitk.ac.in', password: 'password123', role: 'VENDOR', kartCoins: 0, orderHistory: [], phone: '9876543222', address: 'Campus Vendor Area' },
  { id: 'v4', name: 'Chhota Bazaar', email: 'bazaar@iitk.ac.in', password: 'password123', role: 'VENDOR', kartCoins: 0, orderHistory: [], phone: '9876543223', address: 'Campus Vendor Area' },
  { id: 'v5', name: 'Nescafe', email: 'nescafe@iitk.ac.in', password: 'password123', role: 'VENDOR', kartCoins: 0, orderHistory: [], phone: '9876543224', address: 'Campus Vendor Area' },
  { id: 'v6', name: 'KC Shop', email: 'kc@iitk.ac.in', password: 'password123', role: 'VENDOR', kartCoins: 0, orderHistory: [], phone: '9876543225', address: 'Campus Vendor Area' },
  // Delivery partner users
  { id: 'c1', name: 'Ravi Delivery', email: 'ravi@iitk.ac.in', password: 'password123', role: 'RIDER', kartCoins: 0, orderHistory: [], phone: '9876543230', address: 'Campus Area' },
  { id: 'c2', name: 'Suresh Rider', email: 'suresh@iitk.ac.in', password: 'password123', role: 'RIDER', kartCoins: 0, orderHistory: [], phone: '9876543231', address: 'Campus Area' },
  // Admin users
  { id: 'admin1', name: 'Admin User', email: 'admin@iitk.ac.in', password: 'password123', role: 'ADMIN', kartCoins: 0, orderHistory: [], phone: '9876543240', address: 'IIT Kanpur' },
];

const MOCK_ORDERS: Order[] = [
  { id: 'ORD001', userId: 'u1', vendorId: 'v1', products: [{productId: '1', quantity: 2, price: 50}, {productId: '2', quantity: 1, price: 40}], total: 150, status: 'delivered', courierId: 'c1', kartCoinsEarned: 15, date: '2024-01-19T10:30:00', rating: 5, feedback: 'Great service!', courierRating: 5, courierFeedback: 'Very quick and professional delivery!', vendorRating: 4, vendorFeedback: 'Food was good', deliveryAddress: 'Hall 2, Room 201', paymentStatus: 'success', paymentMethod: 'UPI' },
  { id: 'ORD002', userId: 'u2', vendorId: 'v5', products: [{productId: '7', quantity: 2, price: 30}], total: 70, status: 'delivered', courierId: 'c2', kartCoinsEarned: 7, date: '2024-01-19T11:00:00', rating: 4, feedback: 'Good', courierRating: 4, courierFeedback: 'Delivered on time, thank you!', vendorRating: 5, vendorFeedback: 'Excellent coffee', deliveryAddress: 'Hall 5, Room 105', paymentStatus: 'success', paymentMethod: 'Card' },
  { id: 'ORD003', userId: 'u3', vendorId: 'v6', products: [{productId: '9', quantity: 1, price: 25}, {productId: '10', quantity: 3, price: 15}], total: 80, status: 'picked', courierId: 'c1', kartCoinsEarned: 8, date: '2024-01-20T08:15:00', deliveryAddress: 'Hall 3, Room 302', paymentStatus: 'success', paymentMethod: 'UPI' },
  { id: 'ORD004', userId: 'u4', vendorId: 'v1', products: [{productId: '13', quantity: 1, price: 80}], total: 90, status: 'accepted', courierId: 'c2', kartCoinsEarned: 9, date: '2024-01-20T09:00:00', deliveryAddress: 'Hall 7, Room 410', paymentStatus: 'success', paymentMethod: 'Wallet' },
  { id: 'ORD005', userId: 'u1', vendorId: 'v4', products: [{productId: '6', quantity: 2, price: 40}], total: 90, status: 'pending', kartCoinsEarned: 9, date: '2024-01-20T09:30:00', deliveryAddress: 'Hall 2, Room 201', paymentStatus: 'success', paymentMethod: 'UPI' },
  // Additional orders for Amul vendor to show delivery partner details
  { id: 'ORD006', userId: 'u2', vendorId: 'v1', products: [{productId: '1', quantity: 1, price: 50}, {productId: '14', quantity: 1, price: 70}], total: 120, status: 'picked', courierId: 'c1', kartCoinsEarned: 12, date: '2024-01-21T14:20:00', deliveryAddress: 'Hall 5, Room 105', paymentStatus: 'success', paymentMethod: 'UPI' },
  { id: 'ORD007', userId: 'u3', vendorId: 'v1', products: [{productId: '12', quantity: 2, price: 60}, {productId: '2', quantity: 2, price: 40}], total: 200, status: 'accepted', courierId: 'c2', kartCoinsEarned: 20, date: '2024-01-21T15:45:00', deliveryAddress: 'Hall 3, Room 302', paymentStatus: 'success', paymentMethod: 'Card' },
  { id: 'ORD008', userId: 'u4', vendorId: 'v1', products: [{productId: '13', quantity: 2, price: 80}], total: 160, status: 'picked', courierId: 'c1', kartCoinsEarned: 16, date: '2024-01-22T10:15:00', deliveryAddress: 'Hall 7, Room 410', paymentStatus: 'success', paymentMethod: 'UPI' },
  { id: 'ORD009', userId: 'u1', vendorId: 'v1', products: [{productId: '1', quantity: 3, price: 50}, {productId: '12', quantity: 1, price: 60}], total: 210, status: 'delivered', courierId: 'c2', kartCoinsEarned: 21, date: '2024-01-18T16:30:00', rating: 5, feedback: 'Excellent food quality!', vendorRating: 5, vendorFeedback: 'Amazing sandwiches and ice cream', deliveryAddress: 'Hall 2, Room 201', paymentStatus: 'success', paymentMethod: 'Wallet' },
  { id: 'ORD010', userId: 'u2', vendorId: 'v1', products: [{productId: '14', quantity: 2, price: 70}], total: 140, status: 'accepted', courierId: 'c1', kartCoinsEarned: 14, date: '2024-01-22T12:00:00', deliveryAddress: 'Hall 5, Room 105', paymentStatus: 'success', paymentMethod: 'UPI' },
];

const MOCK_COURIER_PROFILES: CourierProfile[] = [
  { id: 'c1', name: 'Ravi Delivery', email: 'ravi@iitk.ac.in', experience: '2 years', availability: 'Full-time', lookingForJob: false, totalDeliveries: 234, totalEarnings: 45600 },
  { id: 'c2', name: 'Suresh Rider', email: 'suresh@iitk.ac.in', experience: '1 year', availability: 'Part-time', lookingForJob: false, totalDeliveries: 156, totalEarnings: 32400 },
];

const MOCK_COMPLAINTS: Complaint[] = [
  { id: 'CMP001', userId: 'u1', userName: 'Rahul Kumar', userEmail: 'rahul@iitk.ac.in', subject: 'Delayed Delivery', description: 'My order was delayed by 2 days.', status: 'pending', date: '2024-01-21T14:00:00' },
  { id: 'CMP002', userId: 'u2', userName: 'Priya Singh', userEmail: 'priya@iitk.ac.in', subject: 'Incorrect Product', description: 'Received a different product than ordered.', status: 'resolved', date: '2024-01-22T10:00:00' },
];

const MOCK_DELIVERY_ISSUES: DeliveryIssue[] = [
  { id: 'DI001', orderId: 'ORD001', courierId: 'c1', courierName: 'Ravi Delivery', issueType: 'customer_unavailable', description: 'Customer was not available to receive the delivery.', status: 'resolved', date: '2024-01-21T15:00:00', resolutionNotes: 'Rescheduled delivery for the next day.' },
  { id: 'DI002', orderId: 'ORD002', courierId: 'c2', courierName: 'Suresh Rider', issueType: 'address_incorrect', description: 'Incorrect delivery address provided.', status: 'pending', date: '2024-01-22T11:00:00' },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [courierJobs, setCourierJobs] = useState<CourierJob[]>([]);
  const [courierProfiles, setCourierProfiles] = useState<CourierProfile[]>(MOCK_COURIER_PROFILES);
  const [cart, setCart] = useState<{ productId: string; quantity: number }[]>([]);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [complaints, setComplaints] = useState<Complaint[]>(MOCK_COMPLAINTS);
  const [deliveryIssues, setDeliveryIssues] = useState<DeliveryIssue[]>(MOCK_DELIVERY_ISSUES);
  const [payments, setPayments] = useState<Payment[]>([]);

  React.useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [vendorsRes, productsRes] = await Promise.all([
          api.get('/vendors'),
          api.get('/vendors/products')
        ]);
        
        const fetchedVendors = vendorsRes.data.data.map((v: any) => ({
          ...v,
          products: [] // Setup standard vendor relationships on frontend if needed
        }));
        
        const fetchedProducts = productsRes.data.data.map((p: any) => ({
          ...p,
          vendorName: p.vendor?.name || "Unknown Vendor" // Map the nested vendor to frontend's vendorName
        }));

        setVendors(fetchedVendors);
        setProducts(fetchedProducts);
      } catch (error) {
        console.error("Failed to load backend catalogs:", error);
      }
    };
    
    fetchInitialData();
  }, []);

  // Re-hydrate auth state on refresh from the persisted JWT.
  React.useEffect(() => {
    const initAuth = async () => {
      // Prevent permanent blank screens if /auth/me hangs.
      const timeoutMs = 8000;
      let settled = false;
      const timeoutId = window.setTimeout(() => {
        if (!settled) setAuthLoading(false);
      }, timeoutMs);

      const token = localStorage.getItem('token');
      if (!token) {
        setCurrentUser(null);
        setAuthLoading(false);
        settled = true;
        window.clearTimeout(timeoutId);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        setCurrentUser(res.data.data);
      } catch (e: any) {
        // Token invalid/expired or backend unreachable; fall back to logged-out.
        try { localStorage.removeItem('token'); } catch {}
        setCurrentUser(null);
      } finally {
        settled = true;
        window.clearTimeout(timeoutId);
        setAuthLoading(false);
      }
    };

    initAuth();
  }, []);

  const refreshProducts = async () => {
    try {
      const cacheBust = `?t=${Date.now()}`;
      const res = await api.get('/vendors/products' + cacheBust);
      let allProducts = res.data.data.map((p: any) => ({
        ...p,
        vendorName: p.vendor?.name || "Unknown Vendor"
      }));
      
      if (currentUser && (currentUser.role === 'VENDOR' || currentUser.role === 'vendor')) {
        try {
          const myProductsRes = await api.get('/vendors/me/products' + cacheBust);
          const myProducts = myProductsRes.data.data.map((p: any) => ({
            ...p,
            vendorName: currentUser.name || "My Shop"
          }));
          const myProductIds = new Set(myProducts.map((p: any) => p.id));
          allProducts = allProducts.filter((p: any) => !myProductIds.has(p.id)).concat(myProducts);
        } catch(e) {}
      }
      setProducts(allProducts);
    } catch(e) {}
  };

  React.useEffect(() => {
    let intervalId: any;

    const fetchVendors = () => {
      api.get('/vendors')
        .then(res => {
          const fetchedVendors = res.data.data.map((v: any) => ({
            ...v,
            products: []
          }));
          setVendors(fetchedVendors);
        })
        .catch(err => console.error("Failed to sync vendors:", err));
    };

    const fetchOrders = () => {
      if (!currentUser) return;
      if (currentUser.role === 'CUSTOMER' || currentUser.role === 'user') {
        api.get('/users/orders')
          .then(res => setOrders(res.data.data))
          .catch(err => console.error("Failed to sync user orders:", err));
      } else if (currentUser.role === 'VENDOR' || currentUser.role === 'vendor') {
        api.get('/vendors/me/orders')
          .then(res => setOrders(res.data.data))
          .catch(err => console.error("Failed to sync vendor orders:", err));
      }
    };

    if (currentUser) {
      if (currentUser.role === 'CUSTOMER' || currentUser.role === 'user') {
        api.get('/users/complaints').then(res => setComplaints(res.data.data));
      }
      fetchVendors();
      fetchOrders();
      refreshProducts();
      intervalId = setInterval(() => {
        fetchVendors();
        fetchOrders();
        refreshProducts();
      }, 3000); // Poll every 3 seconds for instant updates
    } else {
      setOrders([]);
      setComplaints([]);
      refreshProducts();
      intervalId = setInterval(() => {
        refreshProducts();
      }, 3000);
    }

    return () => clearInterval(intervalId);
  }, [currentUser]);

  const addProduct = async (product: any) => {
    try {
      const formData = new FormData();
      formData.append('name', product.name);
      formData.append('category', product.category);
      formData.append('price', String(product.price));
      formData.append('description', product.description);
      formData.append('inStock', String(product.stockQuantity > 0));
      formData.append('stockQuantity', String(product.stockQuantity || product.stock || 0));
      if (product.image && typeof product.image !== 'object') {
        formData.append('image', product.image);
      } else if (product.image instanceof File) {
        formData.append('image', product.image);
      }
      
      const response = await api.post('/vendors/me/products', formData);
      const newProduct = { ...response.data.data, vendorName: currentUser?.name || 'My Shop' };
      setProducts(prev => [...prev, newProduct]);
    } catch (error) {
      const err: any = error;
      console.error("Failed to add product:", {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data
      });
      throw error;
    }
  };

  const removeProduct = async (productId: string) => {
    try {
      await api.delete(`/vendors/me/products/${productId}`);
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (error) {
      console.error("Failed to remove product:", error);
      // Fallback for mock IDs
      setProducts(prev => prev.filter(p => p.id !== productId));
    }
  };

  const updateProduct = async (productId: string, updates: any) => {
    try {
      let payload: any = updates;
      
      if (updates.image instanceof File) {
        payload = new FormData();
        Object.entries(updates).forEach(([key, value]) => {
          if (value !== undefined) {
            if (key === 'stock' || key === 'stockQuantity') {
              payload.append('stockQuantity', String(value));
              payload.append('inStock', String(Number(value) > 0));
            } else {
              payload.append(key, value instanceof File ? value : String(value));
            }
          }
        });
      }

      // Don't set Content-Type manually; axios/browser will add the boundary for FormData.
      const response = await api.patch(`/vendors/me/products/${productId}`, payload);
      const updatedProduct = response.data.data;
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updatedProduct } : p));
    } catch (error) {
      const err: any = error;
      console.error("Failed to update product:", {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data
      });
      throw error;
    }
  };

  const updateUserCoins = (userId: string, coins: number) => {
    if (currentUser && currentUser.id === userId) {
      setCurrentUser({ ...currentUser, kartCoins: currentUser.kartCoins + coins });
    }
  };

  const addOrder = async (order: Order) => {
    try {
      const response = await api.post('/orders', {
        vendorId: order.vendorId,
        items: order.products,
        deliveryAddress: order.deliveryAddress,
        paymentMethod: order.paymentMethod || 'Cash on Delivery'
      });
      const newOrder = response.data.data;
      setOrders(prev => [newOrder, ...prev]);
      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          kartCoins: currentUser.kartCoins + newOrder.kartCoinsEarned,
          orderHistory: [...(currentUser.orderHistory || []), newOrder]
        });
      }
    } catch (error) {
      console.error("Failed to place order:", error);
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      if (status === 'accepted') await api.patch(`/vendors/me/orders/${orderId}/accept`);
      else if (status === 'delivered') await api.patch(`/riders/deliveries/${orderId}/delivered`);
      else if (status === 'picked') await api.post(`/riders/deliveries/${orderId}/accept`);
      else await api.patch(`/orders/${orderId}/status`, { status });
      
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    } catch (error) {
      console.error("Failed to update status:", error);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    }
  };

  const rateOrder = async (orderId: string, type: 'product'|'courier'|'vendor', rating: number, feedback: string) => {
    try {
      await api.patch(`/orders/${orderId}/rate`, { type, rating, feedback });
      setOrders(prev => prev.map(o => {
        if (o.id !== orderId) return o;
        if (type === 'product') return { ...o, rating, feedback };
        if (type === 'courier') return { ...o, courierRating: rating, courierFeedback: feedback };
        return { ...o, vendorRating: rating, vendorFeedback: feedback };
      }));
    } catch (error) {
      console.error(error);
    }
  };

  const addOrderRating = (orderId: string, rating: number, feedback: string) => {
    rateOrder(orderId, 'product', rating, feedback);
  };

  const assignCourier = async (orderId: string, courierId: string) => {
    try {
      await api.patch(`/orders/${orderId}/assign-courier`, { courierId });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, courierId } : o));
    } catch (error) {
      console.error(error);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, courierId } : o));
    }
  };

  const updateOrder = (orderId: string, updates: Partial<Order>) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
  };

  const updateVendor = async (vendorId: string, updates: Partial<Vendor>) => {
    try {
      await api.patch('/vendors/me/profile', updates);
      setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, ...updates } : v));
    } catch (error) {
      console.error("Failed to update vendor:", error);
      throw error;
    }
  };

  const addCourierJob = async (job: CourierJob) => {
    try {
      await api.post('/vendors/me/courier-jobs', job);
      setCourierJobs(prev => [...prev, job]);
    } catch (err) {
      console.error(err);
      setCourierJobs(prev => [...prev, job]);
    }
  };

  const updateCourierJob = async (jobId: string, updates: Partial<CourierJob>) => {
    try {
      await api.patch(`/vendors/me/courier-jobs/${jobId}`, updates);
      setCourierJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...updates } : j));
    } catch (err) {
      console.error(err);
      setCourierJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...updates } : j));
    }
  };

  const addCourierProfile = (profile: CourierProfile) => {
    setCourierProfiles(prev => [...prev, profile]);
  };

  const updateCourierProfile = async (profileId: string, updates: Partial<CourierProfile>) => {
    try {
      await api.patch('/riders/profile', updates);
      setCourierProfiles(prev => prev.map(p => p.id === profileId ? { ...p, ...updates } : p));
    } catch (err) {
      console.error(err);
      setCourierProfiles(prev => prev.map(p => p.id === profileId ? { ...p, ...updates } : p));
    }
  };

  const updateUser = async (userId: string, updates: Partial<User>) => {
    try {
      if (currentUser?.id === userId) await api.patch('/users/profile', updates);
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
      if (currentUser && currentUser.id === userId) {
        setCurrentUser({ ...currentUser, ...updates });
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const toggleFavorite = async (productId: string) => {
    try {
      const res = await api.post(`/users/favorites/${productId}`);
      const { favorites } = res.data.data;
      setCurrentUser(prev => prev ? { ...prev, favorites } : null);
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  };

  const addUser = (user: User) => {
    setUsers(prev => [...prev, user]);
  };

  const addToCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (existing) {
        return prev.map(item =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(prev =>
        prev.map(item =>
          item.productId === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const clearCart = () => {
    setCart([]);
  };

  const refreshOrders = async () => {
    if (!currentUser) return;
    const cacheBust = `?t=${Date.now()}`;
    if (currentUser.role === 'CUSTOMER' || currentUser.role === 'user') {
      try {
        const res = await api.get('/users/orders' + cacheBust);
        setOrders(res.data.data);
      } catch(e) {}
    } else if (currentUser.role === 'VENDOR' || currentUser.role === 'vendor') {
      try {
        const res = await api.get('/vendors/me/orders' + cacheBust);
        setOrders(res.data.data);
      } catch(e) {}
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, accessToken } = response.data.data;
      localStorage.setItem('token', accessToken);
      setCurrentUser(user);
      return user;
    } catch (error) {
      console.error("Login failed:", error);
      return null;
    }
  };

  const register = async (name: string, email: string, password: string, role: User['role'], phone?: string, address?: string) => {
    try {
      const response = await api.post('/auth/register', { name, email, password, role, phone, address });
      if (response.data?.data?.userId) {
        return { status: 'otp_sent', userId: response.data.data.userId };
      }
      return null;
    } catch (error: any) {
      console.error("Registration failed:", error);
      return { error: error.response?.data?.message || 'Registration failed' };
    }
  };

  const verifyRegistrationOtp = async (userId: string, otp: string) => {
    try {
      const response = await api.post('/auth/verify-email', { userId, otp });
      const { user, accessToken } = response.data.data;
      localStorage.setItem('token', accessToken);
      setCurrentUser(user);
      return user;
    } catch (error) {
      console.error("OTP Verification failed:", error);
      return null;
    }
  };

  const logout = () => {
    try { localStorage.removeItem('token'); } catch {}
    setCurrentUser(null);
  };

  const resendRegistrationOtp = async (userId: string) => {
    try {
      await api.post('/auth/resend-otp', { userId });
      return true;
    } catch (error) {
      console.error("Resend OTP failed:", error);
      return false;
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const res = await api.post('/auth/forgot-password', { identifier: email });
      return res.data?.data?.userId || null;
    } catch (error) {
      console.error("Forgot password failed:", error);
      return null;
    }
  };

  const verifyPasswordResetOtp = async (userId: string, otp: string) => {
    try {
      const res = await api.post('/auth/verify-otp', { userId, otp });
      return res.data?.data?.resetToken || null;
    } catch (error) {
      console.error("Verify OTP failed:", error);
      return null;
    }
  };

  const resetPassword = async (userId: string, resetToken: string, newPassword: string) => {
    try {
      await api.post('/auth/reset-password', { userId, resetToken, newPassword });
      return true;
    } catch (error) {
      console.error("Reset password failed:", error);
      return false;
    }
  };

  const addComplaint = async (complaint: Complaint) => {
    try {
      if (complaint.orderId) await api.post(`/orders/${complaint.orderId}/complaint`, complaint);
      setComplaints(prev => [...prev, complaint]);
    } catch (err) {
      console.error(err);
      setComplaints(prev => [...prev, complaint]);
    }
  };

  const updateComplaint = (complaintId: string, updates: Partial<Complaint>) => {
    setComplaints(prev => prev.map(c => c.id === complaintId ? { ...c, ...updates } : c));
  };

  const addDeliveryIssue = async (issue: DeliveryIssue) => {
    try {
      await api.post('/riders/issues', issue);
      setDeliveryIssues(prev => [...prev, issue]);
    } catch (err) {
      console.error(err);
      setDeliveryIssues(prev => [...prev, issue]);
    }
  };

  const updateDeliveryIssue = (issueId: string, updates: Partial<DeliveryIssue>) => {
    setDeliveryIssues(prev => prev.map(i => i.id === issueId ? { ...i, ...updates } : i));
  };

  const createPayment = (orderID: string, userID: string, amount: number, currency: string) => {
    const newPayment: Payment = {
      paymentID: `PAY${payments.length + 1}`,
      orderID,
      userID,
      amount,
      currency,
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
    setPayments(prev => [...prev, newPayment]);
    return newPayment;
  };

  const updatePaymentStatus = (paymentID: string, status: Payment['paymentStatus']) => {
    setPayments(prev => prev.map(p => p.paymentID === paymentID ? { ...p, paymentStatus: status } : p));
  };

  const generateReceipt = (paymentID: string) => {
    const payment = payments.find(p => p.paymentID === paymentID);
    if (payment) {
      return `Receipt for Payment ID: ${payment.paymentID}\nOrder ID: ${payment.orderID}\nUser ID: ${payment.userID}\nAmount: ${payment.amount} ${payment.currency}\nStatus: ${payment.paymentStatus}\nDate: ${payment.createdAt}`;
    }
    return 'Payment not found';
  };

  const getTransactionHistory = (userID: string) => {
    return payments.filter(p => p.userID === userID);
  };

  const createRazorpayOrder = (amount: number, currency: string) => {
    const newRazorpayPayment: RazorpayPayment = {
      razorpaypaymentID: '',
      razorpayorderID: `ORD${payments.length + 1}`,
      razorpaySignature: '',
      method: 'card'
    };
    return newRazorpayPayment;
  };

  const capturePayment = (razorpayPaymentID: string, razorpayOrderID: string, razorpaySignature: string, method: RazorpayPayment['method']) => {
    const existingPayment = payments.find(p => p.paymentID === razorpayPaymentID);
    if (existingPayment) return;

    const newPayment: Payment = {
      paymentID: razorpayPaymentID,
      orderID: razorpayOrderID,
      userID: currentUser?.id || '',
      amount: 0,
      currency: 'INR',
      paymentStatus: 'success',
      createdAt: new Date().toISOString(),
      receipt: generateReceipt(razorpayPaymentID)
    };
    setPayments(prev => [...prev, newPayment]);
  };

  return (
    <AppContext.Provider
      value={{
        products,
        refreshProducts,
        addProduct,
        removeProduct,
        updateProduct,
        currentUser,
        setCurrentUser,
        authLoading,
        logout,
        updateUserCoins,
        login,
        register,
        verifyRegistrationOtp,
        resendRegistrationOtp,
        requestPasswordReset,
        verifyPasswordResetOtp,
        resetPassword,
        clearCart,
        refreshOrders,
        orders,
        addOrder,
        updateOrderStatus,
        rateOrder,
        addOrderRating,
        assignCourier,
        updateOrder,
        vendors,
        updateVendor,
        courierJobs,
        addCourierJob,
        updateCourierJob,
        courierProfiles,
        addCourierProfile,
        updateCourierProfile,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        users,
        updateUser,
        addUser,
        toggleFavorite,
        complaints,
        addComplaint,
        updateComplaint,
        deliveryIssues,
        addDeliveryIssue,
        updateDeliveryIssue,
        payments,
        createPayment,
        updatePaymentStatus,
        generateReceipt,
        getTransactionHistory,
        createRazorpayOrder,
        capturePayment
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}