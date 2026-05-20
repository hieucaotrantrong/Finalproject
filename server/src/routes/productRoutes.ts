import { Router } from 'express';
import {
    getAllProducts,
    createProduct,
    deleteProduct,
    updateProduct,
    getProductById,
    updateProductStockStatus
} from '../controllers/product.controller';
import { io } from '../index';

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

// CREATE Product - emit socket event
router.post('/', asyncHandler(async (req: any, res: any) => {
    await createProduct(req, res);
    if (res.statusCode === 200 || res.statusCode === 201) {
        const product = res.locals.product || req.body;
        io.emit('productAdded', { product, message: `✅ Admin vừa thêm sản phẩm: ${product.title}` });
    }
}));

// UPDATE Product - emit socket event
router.put('/:id', asyncHandler(async (req: any, res: any) => {
    await updateProduct(req, res);
    if (res.statusCode === 200) {
        const product = res.locals.product || req.body;
        io.emit('productUpdated', { product, message: `🔄 Admin vừa cập nhật: ${product.title}` });
    }
}));

// DELETE Product - emit socket event
router.delete('/:id', asyncHandler(async (req: any, res: any) => {
    const productId = req.params.id;
    await deleteProduct(req, res);
    if (res.statusCode === 200) {
        io.emit('productDeleted', { productId, message: `🗑️ Admin vừa xóa sản phẩm` });
    }
}));

// Stock Status Update - emit socket event
router.patch('/:id/stock-status', asyncHandler(async (req: any, res: any) => {
    await updateProductStockStatus(req, res);
    if (res.statusCode === 200) {
        const { is_out_of_stock } = req.body;
        io.emit('stockStatusChanged', { 
            productId: req.params.id, 
            is_out_of_stock,
            message: is_out_of_stock ? '⚠️ Sản phẩm hết hàng' : '✅ Sản phẩm có hàng lại'
        });
    }
}));

export default router;
