import { Router } from 'express';
import { adminAuth } from '../middleware/adminAuth';
import {
    exportInventory,
    getInventorySummary,
    getInventoryTransactions,
    importInventory
} from '../controllers/inventory.controller';

const router = Router();

const asyncHandler = (fn: any) => {
    return (req: any, res: any, next: any) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

router.get('/', adminAuth, asyncHandler(getInventorySummary));
router.get('/transactions', adminAuth, asyncHandler(getInventoryTransactions));
router.post('/import', adminAuth, asyncHandler(importInventory));
router.post('/export', adminAuth, asyncHandler(exportInventory));

export default router;
