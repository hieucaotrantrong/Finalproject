"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_controller_1 = require("../controllers/product.controller");
const router = (0, express_1.Router)();
/* ----------------------------------------------------

---------------------------------------------------- */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
/*----------------------------------
   Routes
-----------------------------------*/
router.get('/', asyncHandler(product_controller_1.getAllProducts));
router.get('/:id', asyncHandler(product_controller_1.getProductById));
router.post('/', asyncHandler(product_controller_1.createProduct));
router.delete('/:id', asyncHandler(product_controller_1.deleteProduct));
router.put('/:id', asyncHandler(product_controller_1.updateProduct));
exports.default = router;
