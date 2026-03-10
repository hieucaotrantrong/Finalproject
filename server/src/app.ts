import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import authRoutes from './routes/authRoutes';
import walletRoutes from './routes/wallet';
import bannerRouter from "./routes/bannerRouter";
const app = express();

/*----------------------------------
-----------------------------------*/
app.use(cors());
app.use(bodyParser.json());

/*----------------------------------
-----------------------------------*/
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use("/api/banners", bannerRouter);
export default app;
