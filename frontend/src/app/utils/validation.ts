export const isValidPhone = (phone: string): boolean => {
  const cleanPhone = phone.trim();
  return /^[0-9]{10}$/.test(cleanPhone);
};
