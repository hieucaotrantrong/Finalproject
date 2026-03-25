"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = __importDefault(require("./config/database"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const chatbot_1 = __importDefault(require("./routes/chatbot"));
const order_routes_1 = __importDefault(require("./routes/order.routes"));
const support_1 = __importDefault(require("./routes/support"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const wallet_1 = __importDefault(require("./routes/wallet"));
const admin_1 = __importDefault(require("./routes/admin"));
const path_1 = __importDefault(require("path"));
const bannerRouter_1 = __importDefault(require("./routes/bannerRouter"));
const password_routes_1 = __importDefault(require("./routes/password.routes"));
const reviewRoutes_1 = __importDefault(require("./routes/reviewRoutes"));
const shipping_1 = __importDefault(require("./routes/shipping"));
/*------------------------------------
Dotnev
--------------------------------------*/
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
/*------------------------------------
Middleware
--------------------------------------*/
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ limit: '50mb', extended: true }));
app.use('/assets', express_1.default.static(path_1.default.join(__dirname, '../../assets')));
/*------------------------------------
Routes
--------------------------------------*/
app.use('/api/auth', authRoutes_1.default);
app.use('/api/products', productRoutes_1.default);
app.use('/api/chatbot', chatbot_1.default);
app.use('/api/orders', order_routes_1.default);
app.use("/api/support", support_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/wallet', wallet_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/banners', bannerRouter_1.default);
app.use("/api/password", password_routes_1.default);
app.use('/api/reviews', reviewRoutes_1.default);
app.use('/api/shipping', shipping_1.default);
/*------------------------------------
Start Servers
--------------------------------------*/
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
/*------------------------------------
Check connect Database
--------------------------------------*/
database_1.default.connect()
    .then(client => {
    console.log("Database connected successfully!");
    client.release();
})
    .catch(err => {
    console.error("Database connection failed:", err);
});
