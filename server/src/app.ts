import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import authRoutes from './routes/authRoutes';
import walletRoutes from './routes/wallet';
import bannerRouter from "./routes/bannerRouter";
import shippingRoutes from './routes/shipping';

const app = express();

/*----------------------------------
-----------------------------------*/
app.use(cors());
app.use(bodyParser.json({ limit: '15mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '15mb' }));

/*----------------------------------
-----------------------------------*/
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use("/api/banners", bannerRouter);
app.use('/api/shipping', shippingRoutes);

export default app;
