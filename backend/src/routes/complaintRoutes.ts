import express from 'express';
import { fileComplaint, getMyComplaints, getComplaintById } from '../controllers/complaintController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/',      fileComplaint);
router.get('/my',     getMyComplaints);
router.get('/:id',    getComplaintById);

export default router;
