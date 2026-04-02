"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
async function test() {
    const api = axios_1.default.create({ baseURL: 'http://localhost:5001/api' });
    try {
        // 1. Create a brand new Rider explicitly
        const riderEmail = `test_rider_${Date.now()}@iitk.ac.in`;
        const regRes = await api.post('/auth/register', {
            name: 'Test Rider',
            email: riderEmail,
            password: 'password123',
            phone: `888${Date.now().toString().slice(-7)}`,
            role: 'courier' // Strictly Courier!
        });
        const riderToken = regRes.data.data.accessToken;
        console.log(`Registered NEW Rider: ${riderEmail}`);
        // Fetch the pending deliveries using the Rider JWT
        api.defaults.headers.common['Authorization'] = `Bearer ${riderToken}`;
        const pendingRes = await api.get('/riders/deliveries/pending');
        console.log('RIDER PENDING ORDERS RETURNED:', pendingRes.data.data.length);
        if (pendingRes.data.data.length > 0) {
            console.log('FIRST PENDING ORDER VENDOR ID:', pendingRes.data.data[0].vendorId);
        }
    }
    catch (err) {
        console.error('ERROR RESPONSE:', err.response?.data || err.message);
    }
}
test();
//# sourceMappingURL=test_order.js.map