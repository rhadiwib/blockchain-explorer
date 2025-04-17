import { Router } from 'express';
import { getLatestBlock, getBlockByNumber } from '../controllers/block.controller';
import { getOverallStats, getStatsForRange } from '../controllers/stats.controller';
import { getLatestTransaction, getTransactionByHash } from '../controllers/transaction.controller';
import { triggerIndexing } from '../controllers/index.controller';
import { healthCheck } from '../controllers/health.controller';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';

const router = Router();

router.get('/health', asyncHandler(healthCheck));

router.get('/block', asyncHandler(getLatestBlock));
router.get('/block/:number', asyncHandler(getBlockByNumber));

router.get('/stats', asyncHandler(getOverallStats));
router.get('/stats/:range', asyncHandler(getStatsForRange));

router.get('/tx', asyncHandler(getLatestTransaction));
router.get('/tx/:hash', asyncHandler(getTransactionByHash));

// protected with auth.
router.post('/index', authenticateToken, asyncHandler(triggerIndexing));

export default router;