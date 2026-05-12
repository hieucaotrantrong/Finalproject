import { Router } from 'express';
import {
    getAllDiscounts,
    getDiscountById,
    createDiscount,
    updateDiscount,
    deleteDiscount,
    verifyDiscount
} from '../controllers/discount.controller';
import { auth } from '../types/auth';

const router = Router();

const asyncHandler = (fn: any) => {
    return (req: any, res: any, next: any) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/*----------------------------------
   Routes
-----------------------------------*/
router.get('/', asyncHandler(getAllDiscounts));
router.post('/', asyncHandler(createDiscount));
router.post('/verify', auth, asyncHandler(verifyDiscount));
router.get('/:id', asyncHandler(getDiscountById));
router.put('/:id', asyncHandler(updateDiscount));
router.delete('/:id', asyncHandler(deleteDiscount));

export default router;
