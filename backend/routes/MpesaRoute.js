// backend/routes/MpesaRoute.js
import express from 'express';
import { verifyClerkToken } from '../middleware/verifyClerkToken.js';
import {
  initiateSTKPush,
  mpesaCallback,
  querySTKStatus
} from '../controllers/MpesaController.js';

const router = express.Router();

// Initiate M-Pesa payment (requires authentication)
router.post('/stk-push', verifyClerkToken, initiateSTKPush);

// M-Pesa callback (no auth needed - called by Safaricom)
router.post('/callback', mpesaCallback);

// Query payment status (requires authentication)
router.post('/query-status', verifyClerkToken, querySTKStatus);

export default router;