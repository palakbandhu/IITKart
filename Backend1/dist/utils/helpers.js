"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportToCSV = exports.paginateQuery = exports.sanitizeUser = exports.generatePaymentId = exports.generateOrderId = void 0;
const json2csv_1 = require("json2csv");
const generateOrderId = () => {
    return `ORD${Date.now()}`;
};
exports.generateOrderId = generateOrderId;
const generatePaymentId = () => {
    return `PAY${Date.now()}`;
};
exports.generatePaymentId = generatePaymentId;
const sanitizeUser = (user) => {
    const { passwordHash, ...sanitizedUser } = user;
    // Map backend role to frontend requested role string
    let mappedRole = 'CUSTOMER';
    if (user.role === 'vendor')
        mappedRole = 'VENDOR';
    else if (user.role === 'courier')
        mappedRole = 'RIDER';
    else if (user.role === 'admin')
        mappedRole = 'ADMIN';
    return { ...sanitizedUser, role: mappedRole };
};
exports.sanitizeUser = sanitizeUser;
const paginateQuery = (page, limit) => {
    const skip = (page - 1) * limit;
    const take = limit;
    return { skip, take };
};
exports.paginateQuery = paginateQuery;
const exportToCSV = (data, filename) => {
    return (0, json2csv_1.parse)(data);
};
exports.exportToCSV = exportToCSV;
//# sourceMappingURL=helpers.js.map