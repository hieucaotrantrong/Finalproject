"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const wallet_1 = __importDefault(require("./routes/wallet"));
const bannerRouter_1 = __importDefault(require("./routes/bannerRouter"));
const app = (0, express_1.default)();
/*----------------------------------
-----------------------------------*/
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json({ limit: '15mb' }));
app.use(body_parser_1.default.urlencoded({ extended: true, limit: '15mb' }));
/*----------------------------------
-----------------------------------*/
app.use('/api/auth', authRoutes_1.default);
app.use('/api/wallet', wallet_1.default);
app.use("/api/banners", bannerRouter_1.default);
exports.default = app;
