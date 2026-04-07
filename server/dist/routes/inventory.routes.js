"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminAuth_1 = require("../middleware/adminAuth");
const inventory_controller_1 = require("../controllers/inventory.controller");
const router = (0, express_1.Router)();
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
router.get('/', adminAuth_1.adminAuth, asyncHandler(inventory_controller_1.getInventorySummary));
router.get('/transactions', adminAuth_1.adminAuth, asyncHandler(inventory_controller_1.getInventoryTransactions));
router.post('/import', adminAuth_1.adminAuth, asyncHandler(inventory_controller_1.importInventory));
router.post('/export', adminAuth_1.adminAuth, asyncHandler(inventory_controller_1.exportInventory));
exports.default = router;
