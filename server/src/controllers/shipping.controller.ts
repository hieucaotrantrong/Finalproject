import { Request, Response } from 'express';
import axios from 'axios';

type GhnConfig = {
    baseUrlRaw: string;
    masterDataBaseUrl: string;
    feeBaseUrl: string;
    token: string;
    shopId: string;
    fromDistrictId: number;
    fromWardCode: string;
    serviceTypeId: number;
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const getConfig = (): GhnConfig => {
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

const buildHeaders = (config: GhnConfig) => {
    const headers: Record<string, string> = {
        Token: config.token
    };

    if (config.shopId) {
        headers.ShopId = config.shopId;
    }

    return headers;
};

const buildMasterDataHeaders = (config: GhnConfig) => {
    return {
        Token: config.token
    };
};

const ensureMasterDataConfig = (res: Response): boolean => {
    const config = getConfig();
    if (!config.token) {
        res.status(500).json({
            message: 'Thiếu cấu hình GHN. Cần GHN_TOKEN.'
        });
        return false;
    }
    return true;
};

const ensureFeeConfig = (res: Response): boolean => {
    const config = getConfig();
    if (!config.token || !config.fromDistrictId || !config.fromWardCode) {
        res.status(500).json({
            message: 'Thiếu cấu hình GHN. Cần GHN_TOKEN, GHN_FROM_DISTRICT_ID, GHN_FROM_WARD_CODE.'
        });
        return false;
    }
    return true;
};

export const getGhnProvinces = async (_req: Request, res: Response): Promise<void> => {
    if (!ensureMasterDataConfig(res)) return;
    const config = getConfig();

    try {
        const response = await axios.get(`${config.masterDataBaseUrl}/master-data/province`, {
            headers: buildMasterDataHeaders(config)
        });

        res.json({
            data: response.data?.data || []
        });
    } catch (error: any) {
        res.status(500).json({
            message: 'Không lấy được danh sách tỉnh/thành từ GHN.',
            endpoint: `${config.masterDataBaseUrl}/master-data/province`,
            details: error?.response?.data || error?.message
        });
    }
};

export const getGhnDistricts = async (req: Request, res: Response): Promise<void> => {
    if (!ensureMasterDataConfig(res)) return;
    const config = getConfig();

    try {
        const provinceId = Number(req.body?.provinceId);
        if (!provinceId) {
            res.status(400).json({ message: 'provinceId là bắt buộc.' });
            return;
        }

        const response = await axios.post(
            `${config.masterDataBaseUrl}/master-data/district`,
            { province_id: provinceId },
            { headers: buildMasterDataHeaders(config) }
        );

        res.json({
            data: response.data?.data || []
        });
    } catch (error: any) {
        res.status(500).json({
            message: 'Không lấy được danh sách quận/huyện từ GHN.',
            endpoint: `${config.masterDataBaseUrl}/master-data/district`,
            details: error?.response?.data || error?.message
        });
    }
};

export const getGhnWards = async (req: Request, res: Response): Promise<void> => {
    if (!ensureMasterDataConfig(res)) return;
    const config = getConfig();

    try {
        const districtId = Number(req.body?.districtId);
        if (!districtId) {
            res.status(400).json({ message: 'districtId là bắt buộc.' });
            return;
        }

        const response = await axios.post(
            `${config.masterDataBaseUrl}/master-data/ward`,
            { district_id: districtId },
            { headers: buildMasterDataHeaders(config) }
        );

        res.json({
            data: response.data?.data || []
        });
    } catch (error: any) {
        res.status(500).json({
            message: 'Không lấy được danh sách phường/xã từ GHN.',
            endpoint: `${config.masterDataBaseUrl}/master-data/ward`,
            details: error?.response?.data || error?.message
        });
    }
};

export const getGhnShippingFee = async (req: Request, res: Response): Promise<void> => {
    if (!ensureFeeConfig(res)) return;
    const config = getConfig();

    try {
        const toDistrictId = Number(req.body?.toDistrictId);
        const toWardCode = String(req.body?.toWardCode || '').trim();
        const insuranceValue = Number(req.body?.insuranceValue || 0);
        const weight = Number(req.body?.weight || 500);
        const length = Number(req.body?.length || 20);
        const width = Number(req.body?.width || 15);
        const height = Number(req.body?.height || 10);

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

        const response = await axios.post(
            `${config.feeBaseUrl}/shipping-order/fee`,
            payload,
            { headers: buildMasterDataHeaders(config) }
        );

        const feeData = response.data?.data || {};

        res.json({
            shippingFee: Number(feeData.total || 0),
            breakdown: feeData
        });
    } catch (error: any) {
        const ghnMessage = error?.response?.data?.message;

        res.status(500).json({
            message: ghnMessage || 'Không tính được phí ship từ GHN.',
            endpoint: `${config.feeBaseUrl}/shipping-order/fee`,
            details: error?.response?.data || error?.message
        });
    }
};
