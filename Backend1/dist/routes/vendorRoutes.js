"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const vendorController = __importStar(require("../controllers/vendorController"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const uploadMiddleware_1 = require("../middlewares/uploadMiddleware");
const router = (0, express_1.Router)();
// Public routes
router.get('/', vendorController.getVendors);
router.get('/products', vendorController.getAllProducts);
router.get('/:id', vendorController.getVendorById);
// Protected routes (Vendor only)
router.use('/me', authMiddleware_1.verifyToken, (0, authMiddleware_1.requireRole)('vendor'));
router.get('/me/profile', vendorController.getVendorProfile);
router.patch('/me/profile', vendorController.updateVendorProfile);
router.get('/me/products', vendorController.getVendorProducts);
router.post('/me/products', uploadMiddleware_1.upload.single('image'), vendorController.addProduct);
router.patch('/me/products/:id', uploadMiddleware_1.upload.single('image'), vendorController.updateProduct);
router.delete('/me/products/:id', vendorController.deleteProduct);
router.get('/me/orders', vendorController.getVendorOrders);
router.patch('/me/orders/:orderId/accept', vendorController.acceptOrder);
router.get('/me/reviews', vendorController.getVendorReviews);
router.get('/me/analytics', vendorController.getVendorAnalytics);
router.get('/me/delivery-issues', vendorController.getVendorDeliveryIssues);
router.patch('/me/delivery-issues/:issueId/status', vendorController.updateDeliveryIssueStatus);
router.post('/me/courier-jobs', vendorController.createCourierJob);
router.patch('/me/courier-jobs/:jobId', vendorController.updateCourierJob);
exports.default = router;
//# sourceMappingURL=vendorRoutes.js.map