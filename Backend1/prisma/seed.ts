import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Clean the database
  await prisma.passwordResetToken.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.deliveryIssue.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productReview.deleteMany();
  await prisma.product.deleteMany();
  await prisma.courierJob.deleteMany();
  await prisma.courierProfile.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 12);

  // 1. Create Users
  const rahul = await prisma.user.create({
    data: { name: 'Rahul Kumar', email: 'rahul@iitk.ac.in', passwordHash, role: 'user', kartCoins: 150, address: 'Hall 2, Room 201', phone: '9876543210' }
  });
  const priya = await prisma.user.create({
    data: { name: 'Priya Singh', email: 'priya@iitk.ac.in', passwordHash, role: 'user', kartCoins: 220, address: 'Hall 5, Room 105', phone: '9876543211' }
  });
  const amit = await prisma.user.create({
    data: { name: 'Amit Sharma', email: 'amit@iitk.ac.in', passwordHash, role: 'user', kartCoins: 80, address: 'Hall 3, Room 302', phone: '9876543212' }
  });
  const neha = await prisma.user.create({
    data: { name: 'Neha Gupta', email: 'neha@iitk.ac.in', passwordHash, role: 'user', kartCoins: 340, address: 'Hall 7, Room 410', phone: '9876543213' }
  });

  // Admin
  await prisma.user.create({
    data: { name: 'Admin', email: 'admin@iitk.ac.in', passwordHash, role: 'admin' }
  });

  // Super Admin
  await prisma.user.create({
    data: { name: 'Super Admin', email: 'superadmin@iitk.ac.in', passwordHash, role: 'admin' }
  });

  // 2. Create Vendors and linked Users
  const vendorsData = [
    { email: 'amul@iitk.ac.in', name: 'Amul Parlour', location: 'OAT' },
    { email: 'photocopy@iitk.ac.in', name: 'Photocopy Shop', location: 'Library' },
    { email: 'laundry@iitk.ac.in', name: 'Wash & Iron', location: 'Hall 1' },
    { email: 'bazaar@iitk.ac.in', name: 'Chhota Bazaar', location: 'Shopping Centre' },
    { email: 'nescafe@iitk.ac.in', name: 'Nescafe', location: 'Academic Area' },
    { email: 'kc@iitk.ac.in', name: 'KC Shop', location: 'Hall 3' }
  ];

  const vendorRecords = [];
  for (const v of vendorsData) {
    const user = await prisma.user.create({
      data: { name: v.name + ' Owner', email: v.email, passwordHash, role: 'vendor', phone: '9000000000' }
    });
    const vendor = await prisma.vendor.create({
      data: { userId: user.id, name: v.name, email: v.email, rating: 4.5, totalOrders: 100, totalEarnings: 50000, location: v.location, availability: '9 AM - 9 PM' }
    });
    vendorRecords.push(vendor);
  }

  // 3. Create Couriers and linked Users
  const couriersData = [
    { email: 'ravi@iitk.ac.in', name: 'Ravi Verma', totalDeliveries: 234 },
    { email: 'suresh@iitk.ac.in', name: 'Suresh Das', totalDeliveries: 156 }
  ];
  
  const courierRecords = [];
  for (const c of couriersData) {
    const user = await prisma.user.create({
      data: { name: c.name, email: c.email, passwordHash, role: 'courier', phone: '8000000000' }
    });
    const profile = await prisma.courierProfile.create({
      data: { userId: user.id, totalDeliveries: c.totalDeliveries, totalEarnings: c.totalDeliveries * 30, experience: '1 year', availability: 'Evening' }
    });
    courierRecords.push({ user, profile });
  }

  // 4. Create Products
  const amul = vendorRecords.find(v => v.email === 'amul@iitk.ac.in')!;
  const photocopy = vendorRecords.find(v => v.email === 'photocopy@iitk.ac.in')!;
  const laundry = vendorRecords.find(v => v.email === 'laundry@iitk.ac.in')!;
  const bazaar = vendorRecords.find(v => v.email === 'bazaar@iitk.ac.in')!;
  const nescafe = vendorRecords.find(v => v.email === 'nescafe@iitk.ac.in')!;
  const kc = vendorRecords.find(v => v.email === 'kc@iitk.ac.in')!;
  
  const productsData = [
    // Amul Parlour - Dairy & Snacks
    { vendorId: amul.id, name: 'Amul Kool - Chocolate', category: 'Beverage', price: 25, description: 'Chilled chocolate flavoured milk - 200ml', image: 'https://via.placeholder.com/150', inStock: true, isBestseller: true, rating: 4.8 },
    { vendorId: amul.id, name: 'Amul Kool - Strawberry', category: 'Beverage', price: 25, description: 'Refreshing strawberry flavoured milk - 200ml', image: 'https://via.placeholder.com/150', inStock: true, isBestseller: true, rating: 4.7 },
    { vendorId: amul.id, name: 'Cheese Sandwich', category: 'Food', price: 40, description: 'Fresh grilled cheese sandwich with butter & mayo', image: 'https://via.placeholder.com/150', inStock: true, rating: 4.6 },
    { vendorId: amul.id, name: 'Butter Toast', category: 'Food', price: 20, description: 'Crispy toasted bread with butter', image: 'https://via.placeholder.com/150', inStock: true, rating: 4.5 },
    { vendorId: amul.id, name: 'Amul Ice Cream - Vanilla', category: 'Food', price: 50, description: 'Creamy vanilla ice cream - 100ml', image: 'https://via.placeholder.com/150', inStock: true, rating: 4.9 },
    { vendorId: amul.id, name: 'Paneer Paratha', category: 'Food', price: 60, description: 'Stuffed paneer paratha with curd & pickle', image: 'https://via.placeholder.com/150', inStock: true, isBestseller: true, rating: 4.8 },
    
    // Photocopy Shop - Printing & Stationery
    { vendorId: photocopy.id, name: 'A4 Print - B&W (Single sided)', category: 'Printing', price: 2, description: 'Black & white print on single side', image: 'https://via.placeholder.com/150', inStock: true, rating: 4.7 },
    { vendorId: photocopy.id, name: 'A4 Print - Color (Single sided)', category: 'Printing', price: 10, description: 'Full color print on single side', image: 'https://via.placeholder.com/150', inStock: true, rating: 4.8 },
    { vendorId: photocopy.id, name: 'Spiral Binding (50 pages)', category: 'Stationery', price: 30, description: 'Professional spiral binding up to 50 pages', image: 'https://via.placeholder.com/150', inStock: true, isBestseller: true, rating: 4.6 },
    { vendorId: photocopy.id, name: 'Lamination - A4', category: 'Printing', price: 20, description: 'Glossy lamination for A4 size', image: 'https://via.placeholder.com/150', inStock: true, rating: 4.5 },
    { vendorId: photocopy.id, name: 'Notebook - 100 pages', category: 'Stationery', price: 35, description: 'Ruled notebook 100 pages premium quality', image: 'https://via.placeholder.com/150', inStock: true, rating: 4.4 },
    { vendorId: photocopy.id, name: 'Pen - Ballpoint (pack of 10)', category: 'Stationery', price: 50, description: 'Smooth writing ballpoint pens - pack of 10', image: 'https://via.placeholder.com/150', inStock: true, rating: 4.3 },
    
    // Wash & Iron - Laundry Services
    { vendorId: laundry.id, name: 'Shirt Wash & Iron', category: 'Laundry', price: 30, description: 'Professional wash and iron service per shirt', image: 'https://via.placeholder.com/150', inStock: true, rating: 4.7 },
    { vendorId: laundry.id, name: 'Trouser Dry Clean', category: 'Laundry', price: 50, description: 'Dry cleaning service for trousers', image: 'https://via.placeholder.com/150', inStock: true, isBestseller: true, rating: 4.8 },
    { vendorId: laundry.id, name: 'Bedsheet Washing (per set)', category: 'Laundry', price: 60, description: 'Complete washing and ironing of bedsheet set', image: 'https://via.placeholder.com/150', inStock: true, rating: 4.6 },
    { vendorId: laundry.id, name: 'Blanket Wash', category: 'Laundry', price: 100, description: 'Heavy duty washing for blankets', image: 'https://via.placeholder.com/150', inStock: true, rating: 4.5 },
    
    // Chhota Bazaar - General Items
    { vendorId: bazaar.id, name: 'Chocolate - Dairy Milk', category: 'Food', price: 20, description: 'Dairy Milk chocolate bar', image: 'https://via.placeholder.com/150', inStock: true, isBestseller: true, rating: 4.8 },
    { vendorId: bazaar.id, name: 'Chips - Lay\'s (Classic)', category: 'Food', price: 15, description: 'Lay\'s classic salted potato chips - 30g', image: 'https://via.placeholder.com/150', inStock: true, rating: 4.6 },
    { vendorId: bazaar.id, name: 'Biscuits - Hide & Seek', category: 'Food', price: 10, description: 'Hide & Seek chocolate chip cookies', image: 'https://via.placeholder.com/150', inStock: true, rating: 4.5 },
    { vendorId: bazaar.id, name: 'Magic - Instant Noodles', category: 'Food', price: 12, description: 'Magic instant noodles - 75g', image: 'https://via.placeholder.com/150', inStock: true, isBestseller: true, rating: 4.7 },
    
    // Nescafe - Beverages
    { vendorId: nescafe.id, name: 'Coffee - Americano', category: 'Beverage', price: 30, description: 'Hot Americano coffee', image: 'https://via.placeholder.com/150', inStock: true, isBestseller: true, rating: 4.9 },
    { vendorId: nescafe.id, name: 'Coffee - Cappuccino', category: 'Beverage', price: 45, description: 'Creamy cappuccino with foam', image: 'https://via.placeholder.com/150', inStock: true, rating: 4.8 },
    { vendorId: nescafe.id, name: 'Tea - Masala Chai', category: 'Beverage', price: 20, description: 'Traditional Indian masala tea', image: 'https://via.placeholder.com/150', inStock: true, rating: 4.7 },
    { vendorId: nescafe.id, name: 'Coffee - Mocha', category: 'Beverage', price: 50, description: 'Rich chocolate mocha coffee', image: 'https://via.placeholder.com/150', inStock: true, rating: 4.6 },
    
    // KC Shop - Electronics/Accessories  
    { vendorId: kc.id, name: 'Phone Charger - USB-C', category: 'Electronics', price: 200, description: 'Fast charging USB-C charger 18W', image: 'https://via.placeholder.com/150', inStock: true, isBestseller: true, rating: 4.8 },
    { vendorId: kc.id, name: 'Earphones - Wired', category: 'Electronics', price: 150, description: 'Quality wired earphones with microphone', image: 'https://via.placeholder.com/150', inStock: true, rating: 4.6 },
    { vendorId: kc.id, name: 'Phone Case - Protective', category: 'Accessories', price: 250, description: 'Durable protective phone case', image: 'https://via.placeholder.com/150', inStock: true, rating: 4.7 },
    { vendorId: kc.id, name: 'Screen Protector - Glass', category: 'Accessories', price: 100, description: 'Tempered glass screen protector', image: 'https://via.placeholder.com/150', inStock: true, rating: 4.5 },
  ];

  const products = [];
  for (const p of productsData) {
    const product = await prisma.product.create({ 
      data: {
        ...p,
        rating: p.rating || undefined,
        isBestseller: p.isBestseller || false,
        totalReviews: Math.floor(Math.random() * 50) + 10
      }
    });
    products.push(product);
  }

  // 5. Create Orders
  for (let i = 1; i <= 10; i++) {
    const user = i % 2 === 0 ? rahul : priya;
    const vendor = vendorRecords[i % vendorRecords.length];
    const vendorProducts = products.filter(p => p.vendorId === vendor.id);
    const p1 = vendorProducts[0];
    const p2 = vendorProducts[1] || vendorProducts[0];
    
    const courier = (i % 3 === 0) ? courierRecords[0].user : (i % 3 === 1 ? courierRecords[1].user : null);
    let status: 'pending' | 'accepted' | 'picked' | 'delivered' | 'cancelled' = 'delivered';
    if (!courier) status = 'pending';
    else if (i % 4 === 0) status = 'picked';
    else if (i % 5 === 0) status = 'accepted';

    const orderTotal = p1.price * 2 + p2.price * 1;
    
    const order = await prisma.order.create({
      data: {
        id: `ORD00${i}`,
        userId: user.id,
        vendorId: vendor.id,
        courierId: courier?.id,
        total: orderTotal,
        status: status,
        kartCoinsEarned: Math.floor(orderTotal * 0.1),
        deliveryAddress: user.address || 'Campus',
        paymentStatus: status === 'delivered' ? 'success' : 'pending',
        paymentMethod: 'UPI',
        items: {
          create: [
            { productId: p1.id, quantity: 2, price: p1.price },
            { productId: p2.id, quantity: 1, price: p2.price }
          ]
        }
      }
    });

    if (status === 'delivered') {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          userId: user.id,
          amount: orderTotal + 30,
          paymentStatus: 'success',
          method: 'UPI',
        }
      });
    }
  }

  // 6. Complaints & Delivery Issues
  const orders = await prisma.order.findMany();
  await prisma.complaint.create({
    data: { userId: rahul.id, orderId: orders[0].id, subject: 'Late Delivery', description: 'Order was 30 mins late', type: 'delivery', status: 'pending' }
  });
  await prisma.complaint.create({
    data: { userId: priya.id, orderId: orders[1].id, subject: 'Missing Item', description: 'Did not receive one item', type: 'order', status: 'resolved' }
  });

  await prisma.deliveryIssue.create({
    data: { orderId: orders[2].id, courierId: courierRecords[0].user.id, issueType: 'customer_unavailable', description: 'Student not answering phone', status: 'pending' }
  });
  await prisma.deliveryIssue.create({
    data: { orderId: orders[3].id, courierId: courierRecords[1].user.id, issueType: 'vehicle_breakdown', description: 'Cycle chain broke', status: 'resolved' }
  });

  console.log('Seed completed successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
