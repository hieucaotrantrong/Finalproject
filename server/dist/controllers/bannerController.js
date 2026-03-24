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
exports.updateBanner = exports.deleteBanner = exports.createBanner = exports.getBanners = void 0;
const database_1 = __importDefault(require("../config/database"));
/*----------------------------------*/
const getBanners = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield database_1.default.query("SELECT * FROM banners ORDER BY id ASC");
    res.json(result.rows);
});
exports.getBanners = getBanners;
/*----------------------------------*/
const createBanner = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { image_url } = req.body;
    const result = yield database_1.default.query("INSERT INTO banners (image_url) VALUES ($1) RETURNING *", [image_url]);
    res.json(result.rows[0]);
});
exports.createBanner = createBanner;
/*----------------------------------*/
const deleteBanner = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    yield database_1.default.query("DELETE FROM banners WHERE id = $1", [id]);
    res.json({ message: "Banner deleted" });
});
exports.deleteBanner = deleteBanner;
/*----------------------------------*/
const updateBanner = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { image_url } = req.body;
    const result = yield database_1.default.query("UPDATE banners SET image_url = $1 WHERE id = $2 RETURNING *", [image_url, id]);
    res.json(result.rows[0]);
});
exports.updateBanner = updateBanner;
