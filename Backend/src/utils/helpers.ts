import { parse } from 'json2csv';
import { User } from '@prisma/client';

export const generateOrderId = (): string => {
  return `ORD${Date.now()}`;
};

export const generatePaymentId = (): string => {
  return `PAY${Date.now()}`;
};

export const sanitizeUser = (user: User) => {
  const { passwordHash, ...sanitizedUser } = user;
  
  // Map backend role to frontend requested role string
  let mappedRole = 'CUSTOMER';
  if (user.role === 'vendor') mappedRole = 'VENDOR';
  else if (user.role === 'courier') mappedRole = 'RIDER';
  else if (user.role === 'admin') mappedRole = 'ADMIN';

  return { ...sanitizedUser, role: mappedRole };
};

export const paginateQuery = (page: number, limit: number) => {
  const skip = (page - 1) * limit;
  const take = limit;
  return { skip, take };
};

export const exportToCSV = (data: object[], filename: string): string => {
  return parse(data);
};
