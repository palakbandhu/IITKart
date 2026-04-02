import { Router } from 'express';
import * as riderController from '../controllers/riderController';
import { verifyToken, requireRole } from '../middlewares/authMiddleware';

const router = Router();

router.use(verifyToken);
router.use(requireRole('courier'));

router.get('/profile', riderController.getProfile);
router.patch('/profile', riderController.updateProfile);

router.get('/deliveries/pending', riderController.getPendingDeliveries);
router.post('/deliveries/:orderId/accept', riderController.acceptDelivery);
router.post('/deliveries/:orderId/reject', riderController.rejectDelivery);
router.patch('/deliveries/:orderId/delivered', riderController.markDelivered);
router.get('/deliveries/active', riderController.getActiveDeliveries);
router.get('/deliveries/history', riderController.getDeliveryHistory);

router.get('/earnings', riderController.getEarnings);
router.post('/issues', riderController.reportIssue);
router.get('/jobs', riderController.getCourierJobs);
router.get('/feedbacks', riderController.getFeedbacks);

export default router;
