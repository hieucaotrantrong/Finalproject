import express from 'express';
import {
    getGhnDistricts,
    getGhnProvinces,
    getGhnShippingFee,
    getGhnWards
} from '../controllers/shipping.controller';

const router = express.Router();

router.get('/provinces', getGhnProvinces);
router.post('/districts', getGhnDistricts);
router.post('/wards', getGhnWards);
router.post('/fee', getGhnShippingFee);

export default router;
