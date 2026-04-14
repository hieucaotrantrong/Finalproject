import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import authRoutes from './routes/authRoutes';
import bannerRouter from "./routes/bannerRouter";
import shippingRoutes from './routes/shipping';
import orderRoutes from './routes/order.routes';
import warehouseRoutes from './routes/warehouse.routes';

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '15mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '15mb' }));

app.use('/api/auth', authRoutes);
app.use("/api/banners", bannerRouter);
app.use('/api/shipping', shippingRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', warehouseRoutes);

export default app;