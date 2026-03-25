"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const shipping_controller_1 = require("../controllers/shipping.controller");
const router = express_1.default.Router();
router.get('/provinces', shipping_controller_1.getGhnProvinces);
router.post('/districts', shipping_controller_1.getGhnDistricts);
router.post('/wards', shipping_controller_1.getGhnWards);
router.post('/fee', shipping_controller_1.getGhnShippingFee);
exports.default = router;
