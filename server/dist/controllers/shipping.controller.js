"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGhnShippingFee = exports.getGhnWards = exports.getGhnDistricts = exports.getGhnProvinces = void 0;
const axios_1 = __importDefault(require("axios"));
const trimTrailingSlash = (value) => value.replace(/\/+$/, '');
const getConfig = () => {
    const baseUrlRaw = process.env.GHN_BASE_URL || 'https://online-gateway.ghn.vn/shiip/public-api/v2';
    const normalizedRaw = trimTrailingSlash(baseUrlRaw);
    const masterDataBaseUrl = normalizedRaw.replace(/\/v2$/, '');
    const feeBaseUrl = /\/v2$/.test(normalizedRaw) ? normalizedRaw : `${normalizedRaw}/v2`;
    return {
        baseUrlRaw,
        masterDataBaseUrl,
        feeBaseUrl,
        token: process.env.GHN_TOKEN || '',
        shopId: process.env.GHN_SHOP_ID || '',
        fromDistrictId: Number(process.env.GHN_FROM_DISTRICT_ID || 0),
        fromWardCode: process.env.GHN_FROM_WARD_CODE || '',
        serviceTypeId: Number(process.env.GHN_SERVICE_TYPE_ID || 2)
    };
};
const buildHeaders = (config) => {
    const headers = {
        Token: config.token
    };
    if (config.shopId) {
        headers.ShopId = config.shopId;
    }
    return headers;
};
const buildMasterDataHeaders = (config) => {
    return {
        Token: config.token
    };
};
const ensureMasterDataConfig = (res) => {
    const config = getConfig();
    if (!config.token) {
        res.status(500).json({
            message: 'Thiếu cấu hình GHN. Cần GHN_TOKEN.'
        });
        return false;
    }
    return true;
};
const ensureFeeConfig = (res) => {
    const config = getConfig();
    if (!config.token || !config.fromDistrictId || !config.fromWardCode) {
        res.status(500).json({
            message: 'Thiếu cấu hình GHN. Cần GHN_TOKEN, GHN_FROM_DISTRICT_ID, GHN_FROM_WARD_CODE.'
        });
        return false;
    }
    return true;
};
const getGhnProvinces = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (!ensureMasterDataConfig(res))
        return;
    const config = getConfig();
    try {
        const response = yield axios_1.default.get(`${config.masterDataBaseUrl}/master-data/province`, {
            headers: buildMasterDataHeaders(config)
        });
        res.json({
            data: ((_a = response.data) === null || _a === void 0 ? void 0 : _a.data) || []
        });
    }
    catch (error) {
        res.status(500).json({
            message: 'Không lấy được danh sách tỉnh/thành từ GHN.',
            endpoint: `${config.masterDataBaseUrl}/master-data/province`,
            details: ((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.data) || (error === null || error === void 0 ? void 0 : error.message)
        });
    }
});
exports.getGhnProvinces = getGhnProvinces;
const getGhnDistricts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    if (!ensureMasterDataConfig(res))
        return;
    const config = getConfig();
    try {
        const provinceId = Number((_a = req.body) === null || _a === void 0 ? void 0 : _a.provinceId);
        if (!provinceId) {
            res.status(400).json({ message: 'provinceId là bắt buộc.' });
            return;
        }
        const response = yield axios_1.default.post(`${config.masterDataBaseUrl}/master-data/district`, { province_id: provinceId }, { headers: buildMasterDataHeaders(config) });
        res.json({
            data: ((_b = response.data) === null || _b === void 0 ? void 0 : _b.data) || []
        });
    }
    catch (error) {
        res.status(500).json({
            message: 'Không lấy được danh sách quận/huyện từ GHN.',
            endpoint: `${config.masterDataBaseUrl}/master-data/district`,
            details: ((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || (error === null || error === void 0 ? void 0 : error.message)
        });
    }
});
exports.getGhnDistricts = getGhnDistricts;
const getGhnWards = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    if (!ensureMasterDataConfig(res))
        return;
    const config = getConfig();
    try {
        const districtId = Number((_a = req.body) === null || _a === void 0 ? void 0 : _a.districtId);
        if (!districtId) {
            res.status(400).json({ message: 'districtId là bắt buộc.' });
            return;
        }
        const response = yield axios_1.default.post(`${config.masterDataBaseUrl}/master-data/ward`, { district_id: districtId }, { headers: buildMasterDataHeaders(config) });
        res.json({
            data: ((_b = response.data) === null || _b === void 0 ? void 0 : _b.data) || []
        });
    }
    catch (error) {
        res.status(500).json({
            message: 'Không lấy được danh sách phường/xã từ GHN.',
            endpoint: `${config.masterDataBaseUrl}/master-data/ward`,
            details: ((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || (error === null || error === void 0 ? void 0 : error.message)
        });
    }
});
exports.getGhnWards = getGhnWards;
const getGhnShippingFee = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    if (!ensureFeeConfig(res))
        return;
    const config = getConfig();
    try {
        const toDistrictId = Number((_a = req.body) === null || _a === void 0 ? void 0 : _a.toDistrictId);
        const toWardCode = String(((_b = req.body) === null || _b === void 0 ? void 0 : _b.toWardCode) || '').trim();
        const insuranceValue = Number(((_c = req.body) === null || _c === void 0 ? void 0 : _c.insuranceValue) || 0);
        const weight = Number(((_d = req.body) === null || _d === void 0 ? void 0 : _d.weight) || 500);
        const length = Number(((_e = req.body) === null || _e === void 0 ? void 0 : _e.length) || 20);
        const width = Number(((_f = req.body) === null || _f === void 0 ? void 0 : _f.width) || 15);
        const height = Number(((_g = req.body) === null || _g === void 0 ? void 0 : _g.height) || 10);
        if (!toDistrictId || !toWardCode) {
            res.status(400).json({
                message: 'toDistrictId và toWardCode là bắt buộc để tính phí ship.'
            });
            return;
        }
        const payload = {
            from_district_id: config.fromDistrictId,
            from_ward_code: config.fromWardCode,
            service_type_id: config.serviceTypeId,
            to_district_id: toDistrictId,
            to_ward_code: toWardCode,
            height,
            length,
            weight,
            width,
            insurance_value: insuranceValue,
            coupon: null
        };
        const response = yield axios_1.default.post(`${config.feeBaseUrl}/shipping-order/fee`, payload, { headers: buildMasterDataHeaders(config) });
        const feeData = ((_h = response.data) === null || _h === void 0 ? void 0 : _h.data) || {};
        res.json({
            shippingFee: Number(feeData.total || 0),
            breakdown: feeData
        });
    }
    catch (error) {
        const ghnMessage = (_k = (_j = error === null || error === void 0 ? void 0 : error.response) === null || _j === void 0 ? void 0 : _j.data) === null || _k === void 0 ? void 0 : _k.message;
        res.status(500).json({
            message: ghnMessage || 'Không tính được phí ship từ GHN.',
            endpoint: `${config.feeBaseUrl}/shipping-order/fee`,
            details: ((_l = error === null || error === void 0 ? void 0 : error.response) === null || _l === void 0 ? void 0 : _l.data) || (error === null || error === void 0 ? void 0 : error.message)
        });
    }
});
exports.getGhnShippingFee = getGhnShippingFee;
