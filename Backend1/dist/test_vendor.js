"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
async function test() {
    const api = axios_1.default.create({ baseURL: 'http://localhost:5001/api' });
    try {
        const testEmail = `test_vendor_${Date.now()}@iitk.ac.in`;
        const regRes = await api.post('/auth/register', {
            name: 'Test Vendor Shop',
            email: testEmail,
            password: 'password123',
            phone: `777${Date.now().toString().slice(-7)}`,
            role: 'vendor'
        });
        const token = regRes.data.data.accessToken;
        console.log(`Registered NEW VENDOR: ${testEmail} with Role: ${regRes.data.data.user.role}`);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        // Check Vendor profile
        const profRes = await api.get('/vendors/me/profile');
        console.log('VENDOR PROFILE ID:', profRes.data.data.id, 'Status:', profRes.data.data.status);
        // Check Vendor orders
        const ordersRes = await api.get('/vendors/me/orders');
        console.log('VENDOR ORDERS RETURNED:', ordersRes.data.data.length);
    }
    catch (err) {
        if (err.response) {
            console.error('ERROR RESPONSE STATUS:', err.response.status);
            console.error('ERROR RESPONSE BODY:', JSON.stringify(err.response.data));
        }
        else {
            console.error('ERROR:', err.message);
        }
    }
}
test();
//# sourceMappingURL=test_vendor.js.map