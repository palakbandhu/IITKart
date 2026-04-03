"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const db_1 = __importDefault(require("./config/db"));
const logger_1 = require("./utils/logger");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function ensureSuperAdmin() {
    const email = 'admin@iitk.ac.in';
    try {
        const passwordHash = await bcryptjs_1.default.hash('admin@123', 12);
        await db_1.default.user.upsert({
            where: { email },
            update: { passwordHash, role: 'admin', isVerified: true },
            create: {
                name: 'Super Admin',
                email,
                passwordHash,
                role: 'admin',
                isVerified: true
            }
        });
        logger_1.logger.info('🔑 Super Admin account guaranteed (admin@iitk.ac.in / admin@123)');
    }
    catch (error) {
        logger_1.logger.error('Failed to ensure Super Admin:', error);
    }
}
async function main() {
    try {
        await db_1.default.$connect();
        logger_1.logger.info('✅ Database connected successfully');
        await ensureSuperAdmin();
        app_1.default.listen(env_1.env.PORT, () => {
            logger_1.logger.info(`🚀 Server running on port ${env_1.env.PORT} in ${env_1.env.NODE_ENV} mode`);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
}
main();
// Handle unexpected closures
process.on('SIGINT', async () => {
    await db_1.default.$disconnect();
    logger_1.logger.info('Database disconnected on app termination');
    process.exit(0);
});
//# sourceMappingURL=server.js.map