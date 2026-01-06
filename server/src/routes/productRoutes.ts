import { Router } from 'express';
import {
    getAllProducts,
    createProduct,
    deleteProduct,
    updateProduct,
    getProductById
} from '../controllers/product.controller';

const router = Router();

/* ----------------------------------------------------

---------------------------------------------------- */
const asyncHandler = (fn: any) => {
    return (req: any, res: any, next: any) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/*----------------------------------
   Routes
-----------------------------------*/
router.get('/', asyncHandler(getAllProducts));
router.get('/:id', asyncHandler(getProductById));
router.post('/', asyncHandler(createProduct));
router.delete('/:id', asyncHandler(deleteProduct));
router.put('/:id', asyncHandler(updateProduct));

export default router;
