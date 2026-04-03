"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const cors_2 = require("./config/cors");
const errorMiddleware_1 = require("./middlewares/errorMiddleware");
// Import Routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const vendorRoutes_1 = __importDefault(require("./routes/vendorRoutes"));
const riderRoutes_1 = __importDefault(require("./routes/riderRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const app = (0, express_1.default)();
// Middlewares
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use((0, cors_1.default)(cors_2.corsOptions));
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
if (process.env.NODE_ENV !== 'production') {
    app.use((0, morgan_1.default)('dev'));
}
else {
    app.use((0, morgan_1.default)('combined'));
}
// Static folder for uploads
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Health check
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date() }));
// Mount routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/vendors', vendorRoutes_1.default);
app.use('/api/riders', riderRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/orders', orderRoutes_1.default);
app.use('/api/payments', paymentRoutes_1.default);
// Handle 404
app.use('*', (req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
// Global error handler
app.use(errorMiddleware_1.errorMiddleware);
exports.default = app;
//# sourceMappingURL=app.js.map