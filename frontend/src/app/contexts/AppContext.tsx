import React, { createContext, useContext, useState, ReactNode } from 'react';

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
  role: 'user' | 'vendor' | 'courier' | 'admin';
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
  kartCoinsEarned: number;
  date: string;
  rating?: number;
  feedback?: string;
  courierRating?: number;
  courierFeedback?: string;
  vendorRating?: number;
  vendorFeedback?: string;
  deliveryAddress: string;
  paymentStatus: 'pending' | 'completed' | 'refunded';
  paymentMethod: string;
}

export interface Vendor {
  id: string;
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
  addProduct: (product: Product) => void;
  removeProduct: (productId: string) => void;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  updateUserCoins: (userId: string, coins: number) => void;
  login: (email: string, password: string) => User | null;
  register: (name: string, email: string, password: string, role: User['role'], phone?: string, address?: string) => User | null;
  
  orders: Order[];
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  addOrderRating: (orderId: string, rating: number, feedback: string) => void;
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
  { id: '1', vendorId: 'v1', vendorName: 'Amul Parlour', name: 'Veg Sandwich', category: 'Food', price: 50, description: 'Fresh veg sandwich with cheese', image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400', inStock: true },
  { id: '2', vendorId: 'v1', vendorName: 'Amul Parlour', name: 'Cold Coffee', category: 'Beverage', price: 40, description: 'Chilled cold coffee', image: 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=400', inStock: true },
  { id: '12', vendorId: 'v1', vendorName: 'Amul Parlour', name: 'Ice Cream', category: 'Food', price: 60, description: 'Amul ice cream 100ml', image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400', inStock: true },
  { id: '13', vendorId: 'v1', vendorName: 'Amul Parlour', name: 'Cheese Burger', category: 'Food', price: 80, description: 'Delicious cheese burger', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', inStock: true },
  { id: '14', vendorId: 'v1', vendorName: 'Amul Parlour', name: 'Milkshake', category: 'Beverage', price: 70, description: 'Thick milkshake', image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400', inStock: true },
  
  // Photocopy Shop
  { id: '3', vendorId: 'v2', vendorName: 'Photocopy Shop', name: 'Color Printout', category: 'Printing', price: 10, description: 'Per page color printing', image: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=400', inStock: true },
  { id: '4', vendorId: 'v2', vendorName: 'Photocopy Shop', name: 'B&W Printout', category: 'Printing', price: 2, description: 'Per page black and white printing', image: 'https://images.unsplash.com/photo-1585012977345-39cef1fc80e0?w=400', inStock: true },
  { id: '15', vendorId: 'v2', vendorName: 'Photocopy Shop', name: 'Spiral Binding', category: 'Printing', price: 30, description: 'Spiral binding service', image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400', inStock: true },
  
  // Wash & Iron
  { id: '5', vendorId: 'v3', vendorName: 'Wash & Iron', name: 'Laundry Service', category: 'Laundry', price: 100, description: 'Wash and iron service per kg', image: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=400', inStock: true },
  { id: '16', vendorId: 'v3', vendorName: 'Wash & Iron', name: 'Dry Cleaning', category: 'Laundry', price: 150, description: 'Professional dry cleaning', image: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=400', inStock: true },
  
  // Chhota Bazaar
  { id: '6', vendorId: 'v4', vendorName: 'Chhota Bazaar', name: 'Notebook A4', category: 'Stationery', price: 40, description: 'A4 size notebook 200 pages', image: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=400', inStock: true },
  { id: '11', vendorId: 'v4', vendorName: 'Chhota Bazaar', name: 'Pen Set', category: 'Stationery', price: 50, description: 'Blue pen set of 5', image: 'https://images.unsplash.com/photo-1586932219544-9d33a58cc6c2?w=400', inStock: true },
  { id: '17', vendorId: 'v4', vendorName: 'Chhota Bazaar', name: 'Calculator', category: 'Stationery', price: 200, description: 'Scientific calculator', image: 'https://images.unsplash.com/photo-1611224885990-ab7363d1f2a3?w=400', inStock: true },
  { id: '18', vendorId: 'v4', vendorName: 'Chhota Bazaar', name: 'File Folder', category: 'Stationery', price: 25, description: 'Plastic file folder', image: 'https://images.unsplash.com/photo-1586105449897-20b5efeb3233?w=400', inStock: true },
  
  // Nescafe
  { id: '7', vendorId: 'v5', vendorName: 'Nescafe', name: 'Cappuccino', category: 'Beverage', price: 30, description: 'Hot cappuccino', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400', inStock: true },
  { id: '8', vendorId: 'v5', vendorName: 'Nescafe', name: 'Chocolate Pastry', category: 'Food', price: 35, description: 'Fresh chocolate pastry', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400', inStock: true },
  { id: '19', vendorId: 'v5', vendorName: 'Nescafe', name: 'Espresso', category: 'Beverage', price: 35, description: 'Strong espresso shot', image: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400', inStock: true },
  { id: '20', vendorId: 'v5', vendorName: 'Nescafe', name: 'Croissant', category: 'Food', price: 45, description: 'Buttery croissant', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400', inStock: true },
  
  // KC Shop
  { id: '9', vendorId: 'v6', vendorName: 'KC Shop', name: 'Maggi', category: 'Food', price: 25, description: 'Hot maggi noodles', image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400', inStock: true },
  { id: '10', vendorId: 'v6', vendorName: 'KC Shop', name: 'Samosa', category: 'Food', price: 15, description: 'Crispy samosa', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400', inStock: true },
  { id: '21', vendorId: 'v6', vendorName: 'KC Shop', name: 'Vada Pav', category: 'Food', price: 20, description: 'Mumbai style vada pav', image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=400', inStock: true },
  { id: '22', vendorId: 'v6', vendorName: 'KC Shop', name: 'Chai', category: 'Beverage', price: 10, description: 'Hot masala chai', image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400', inStock: true },
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
  { id: 'u1', name: 'Rahul Kumar', email: 'rahul@iitk.ac.in', password: 'password123', role: 'user', kartCoins: 150, orderHistory: [], phone: '9876543210', address: 'Hall 2, Room 201' },
  { id: 'u2', name: 'Priya Singh', email: 'priya@iitk.ac.in', password: 'password123', role: 'user', kartCoins: 220, orderHistory: [], phone: '9876543211', address: 'Hall 5, Room 105' },
  { id: 'u3', name: 'Amit Sharma', email: 'amit@iitk.ac.in', password: 'password123', role: 'user', kartCoins: 80, orderHistory: [], phone: '9876543212', address: 'Hall 3, Room 302' },
  { id: 'u4', name: 'Neha Gupta', email: 'neha@iitk.ac.in', password: 'password123', role: 'user', kartCoins: 340, orderHistory: [], phone: '9876543213', address: 'Hall 7, Room 410' },
  // Vendor users
  { id: 'v1', name: 'Amul Parlour', email: 'amul@iitk.ac.in', password: 'password123', role: 'vendor', kartCoins: 0, orderHistory: [], phone: '9876543220', address: 'Campus Vendor Area' },
  { id: 'v2', name: 'Photocopy Shop', email: 'photocopy@iitk.ac.in', password: 'password123', role: 'vendor', kartCoins: 0, orderHistory: [], phone: '9876543221', address: 'Campus Vendor Area' },
  { id: 'v3', name: 'Wash & Iron', email: 'laundry@iitk.ac.in', password: 'password123', role: 'vendor', kartCoins: 0, orderHistory: [], phone: '9876543222', address: 'Campus Vendor Area' },
  { id: 'v4', name: 'Chhota Bazaar', email: 'bazaar@iitk.ac.in', password: 'password123', role: 'vendor', kartCoins: 0, orderHistory: [], phone: '9876543223', address: 'Campus Vendor Area' },
  { id: 'v5', name: 'Nescafe', email: 'nescafe@iitk.ac.in', password: 'password123', role: 'vendor', kartCoins: 0, orderHistory: [], phone: '9876543224', address: 'Campus Vendor Area' },
  { id: 'v6', name: 'KC Shop', email: 'kc@iitk.ac.in', password: 'password123', role: 'vendor', kartCoins: 0, orderHistory: [], phone: '9876543225', address: 'Campus Vendor Area' },
  // Delivery partner users
  { id: 'c1', name: 'Ravi Delivery', email: 'ravi@iitk.ac.in', password: 'password123', role: 'courier', kartCoins: 0, orderHistory: [], phone: '9876543230', address: 'Campus Area' },
  { id: 'c2', name: 'Suresh Rider', email: 'suresh@iitk.ac.in', password: 'password123', role: 'courier', kartCoins: 0, orderHistory: [], phone: '9876543231', address: 'Campus Area' },
  // Admin users
  { id: 'admin1', name: 'Admin User', email: 'admin@iitk.ac.in', password: 'password123', role: 'admin', kartCoins: 0, orderHistory: [], phone: '9876543240', address: 'IIT Kanpur' },
];

const MOCK_ORDERS: Order[] = [
  { id: 'ORD001', userId: 'u1', vendorId: 'v1', products: [{productId: '1', quantity: 2, price: 50}, {productId: '2', quantity: 1, price: 40}], total: 150, status: 'delivered', courierId: 'c1', kartCoinsEarned: 15, date: '2024-01-19T10:30:00', rating: 5, feedback: 'Great service!', courierRating: 5, courierFeedback: 'Very quick and professional delivery!', vendorRating: 4, vendorFeedback: 'Food was good', deliveryAddress: 'Hall 2, Room 201', paymentStatus: 'completed', paymentMethod: 'UPI' },
  { id: 'ORD002', userId: 'u2', vendorId: 'v5', products: [{productId: '7', quantity: 2, price: 30}], total: 70, status: 'delivered', courierId: 'c2', kartCoinsEarned: 7, date: '2024-01-19T11:00:00', rating: 4, feedback: 'Good', courierRating: 4, courierFeedback: 'Delivered on time, thank you!', vendorRating: 5, vendorFeedback: 'Excellent coffee', deliveryAddress: 'Hall 5, Room 105', paymentStatus: 'completed', paymentMethod: 'Card' },
  { id: 'ORD003', userId: 'u3', vendorId: 'v6', products: [{productId: '9', quantity: 1, price: 25}, {productId: '10', quantity: 3, price: 15}], total: 80, status: 'picked', courierId: 'c1', kartCoinsEarned: 8, date: '2024-01-20T08:15:00', deliveryAddress: 'Hall 3, Room 302', paymentStatus: 'completed', paymentMethod: 'UPI' },
  { id: 'ORD004', userId: 'u4', vendorId: 'v1', products: [{productId: '13', quantity: 1, price: 80}], total: 90, status: 'accepted', courierId: 'c2', kartCoinsEarned: 9, date: '2024-01-20T09:00:00', deliveryAddress: 'Hall 7, Room 410', paymentStatus: 'completed', paymentMethod: 'Wallet' },
  { id: 'ORD005', userId: 'u1', vendorId: 'v4', products: [{productId: '6', quantity: 2, price: 40}], total: 90, status: 'pending', kartCoinsEarned: 9, date: '2024-01-20T09:30:00', deliveryAddress: 'Hall 2, Room 201', paymentStatus: 'completed', paymentMethod: 'UPI' },
  // Additional orders for Amul vendor to show delivery partner details
  { id: 'ORD006', userId: 'u2', vendorId: 'v1', products: [{productId: '1', quantity: 1, price: 50}, {productId: '14', quantity: 1, price: 70}], total: 120, status: 'picked', courierId: 'c1', kartCoinsEarned: 12, date: '2024-01-21T14:20:00', deliveryAddress: 'Hall 5, Room 105', paymentStatus: 'completed', paymentMethod: 'UPI' },
  { id: 'ORD007', userId: 'u3', vendorId: 'v1', products: [{productId: '12', quantity: 2, price: 60}, {productId: '2', quantity: 2, price: 40}], total: 200, status: 'accepted', courierId: 'c2', kartCoinsEarned: 20, date: '2024-01-21T15:45:00', deliveryAddress: 'Hall 3, Room 302', paymentStatus: 'completed', paymentMethod: 'Card' },
  { id: 'ORD008', userId: 'u4', vendorId: 'v1', products: [{productId: '13', quantity: 2, price: 80}], total: 160, status: 'picked', courierId: 'c1', kartCoinsEarned: 16, date: '2024-01-22T10:15:00', deliveryAddress: 'Hall 7, Room 410', paymentStatus: 'completed', paymentMethod: 'UPI' },
  { id: 'ORD009', userId: 'u1', vendorId: 'v1', products: [{productId: '1', quantity: 3, price: 50}, {productId: '12', quantity: 1, price: 60}], total: 210, status: 'delivered', courierId: 'c2', kartCoinsEarned: 21, date: '2024-01-18T16:30:00', rating: 5, feedback: 'Excellent food quality!', vendorRating: 5, vendorFeedback: 'Amazing sandwiches and ice cream', deliveryAddress: 'Hall 2, Room 201', paymentStatus: 'completed', paymentMethod: 'Wallet' },
  { id: 'ORD010', userId: 'u2', vendorId: 'v1', products: [{productId: '14', quantity: 2, price: 70}], total: 140, status: 'accepted', courierId: 'c1', kartCoinsEarned: 14, date: '2024-01-22T12:00:00', deliveryAddress: 'Hall 5, Room 105', paymentStatus: 'completed', paymentMethod: 'UPI' },
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
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [vendors, setVendors] = useState<Vendor[]>(MOCK_VENDORS);
  const [courierJobs, setCourierJobs] = useState<CourierJob[]>([]);
  const [courierProfiles, setCourierProfiles] = useState<CourierProfile[]>(MOCK_COURIER_PROFILES);
  const [cart, setCart] = useState<{ productId: string; quantity: number }[]>([]);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [complaints, setComplaints] = useState<Complaint[]>(MOCK_COMPLAINTS);
  const [deliveryIssues, setDeliveryIssues] = useState<DeliveryIssue[]>(MOCK_DELIVERY_ISSUES);
  const [payments, setPayments] = useState<Payment[]>([]);

  const addProduct = (product: Product) => {
    setProducts(prev => [...prev, product]);
  };

  const removeProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  const updateProduct = (productId: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updates } : p));
  };

  const updateUserCoins = (userId: string, coins: number) => {
    if (currentUser && currentUser.id === userId) {
      setCurrentUser({ ...currentUser, kartCoins: currentUser.kartCoins + coins });
    }
  };

  const addOrder = (order: Order) => {
    setOrders(prev => [...prev, order]);
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        kartCoins: currentUser.kartCoins + order.kartCoinsEarned,
        orderHistory: [...currentUser.orderHistory, order]
      });
    }
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  };

  const addOrderRating = (orderId: string, rating: number, feedback: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, rating, feedback } : o));
  };

  const assignCourier = (orderId: string, courierId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, courierId } : o));
  };

  const updateOrder = (orderId: string, updates: Partial<Order>) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
  };

  const updateVendor = (vendorId: string, updates: Partial<Vendor>) => {
    setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, ...updates } : v));
  };

  const addCourierJob = (job: CourierJob) => {
    setCourierJobs(prev => [...prev, job]);
  };

  const updateCourierJob = (jobId: string, updates: Partial<CourierJob>) => {
    setCourierJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...updates } : j));
  };

  const addCourierProfile = (profile: CourierProfile) => {
    setCourierProfiles(prev => [...prev, profile]);
  };

  const updateCourierProfile = (profileId: string, updates: Partial<CourierProfile>) => {
    setCourierProfiles(prev => prev.map(p => p.id === profileId ? { ...p, ...updates } : p));
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
    if (currentUser && currentUser.id === userId) {
      setCurrentUser({ ...currentUser, ...updates });
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

  const login = (email: string, password: string) => {
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      setCurrentUser(user);
    }
    return user || null;
  };

  const register = (name: string, email: string, password: string, role: User['role'], phone?: string, address?: string) => {
    const newUser: User = {
      id: `u${users.length + 1}`,
      name,
      email,
      password,
      role,
      kartCoins: 0,
      orderHistory: [],
      phone,
      address,
      favorites: []
    };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    return newUser;
  };

  const addComplaint = (complaint: Complaint) => {
    setComplaints(prev => [...prev, complaint]);
  };

  const updateComplaint = (complaintId: string, updates: Partial<Complaint>) => {
    setComplaints(prev => prev.map(c => c.id === complaintId ? { ...c, ...updates } : c));
  };

  const addDeliveryIssue = (issue: DeliveryIssue) => {
    setDeliveryIssues(prev => [...prev, issue]);
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
    const newPayment: Payment = {
      paymentID: `PAY${payments.length + 1}`,
      orderID: razorpayOrderID,
      userID: currentUser?.id || '',
      amount: parseFloat(razorpayPaymentID) / 100, // Assuming razorpayPaymentID is a string representation of the amount in paise
      currency: 'INR',
      paymentStatus: 'success',
      createdAt: new Date().toISOString(),
      receipt: generateReceipt(`PAY${payments.length + 1}`)
    };
    setPayments(prev => [...prev, newPayment]);
  };

  return (
    <AppContext.Provider
      value={{
        products,
        addProduct,
        removeProduct,
        updateProduct,
        currentUser,
        setCurrentUser,
        updateUserCoins,
        login,
        register,
        orders,
        addOrder,
        updateOrderStatus,
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
        clearCart,
        users,
        updateUser,
        addUser,
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