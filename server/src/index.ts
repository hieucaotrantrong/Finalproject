import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/database';
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import chatbot from './routes/chatbot';
import orderRoutes from "./routes/order.routes";
import supportRouter from "./routes/support";
import notificationsRoutes from './routes/notifications';
import adminRoutes from './routes/admin';
import path from 'path';
import bannerRouter from './routes/bannerRouter';
import passwordRouter from "./routes/password.routes";
import reviewRoutes from "./routes/reviewRoutes";
import shippingRoutes from './routes/shipping';
import warehouseRoutes from './routes/warehouse.routes';
import discountRoutes from './routes/discount.routes';
import http from 'http';
import net from 'net';
import { Server } from 'socket.io';
/*------------------------------------
Dotnev
--------------------------------------*/
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/*------------------------------------
Create HTTP Server for Socket.io
--------------------------------------*/
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:5174"],
        methods: ["GET", "POST"]
    }
});

/*------------------------------------
Socket.io Events
--------------------------------------*/
io.on('connection', (socket) => {
    console.log(' Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log(' Client disconnected:', socket.id);
    });
});

// Export io để dùng ở routes
export { io };

/*------------------------------------
Middleware
--------------------------------------*/
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/assets', express.static(path.join(__dirname, '../../assets')));

/*------------------------------------
Routes
--------------------------------------*/
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/chatbot', chatbot);
app.use('/api/orders', orderRoutes);
app.use("/api/support", supportRouter);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/banners', bannerRouter);
app.use("/api/password", passwordRouter);
app.use('/api/reviews', reviewRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/inventory', warehouseRoutes);
app.use('/api/discounts', discountRoutes);
/*------------------------------------
Start Servers
--------------------------------------*/
const startServer = async () => {
    const isPortAvailable = await new Promise<boolean>((resolve) => {
        const tester = net.createServer();

        tester.once('error', () => {
            resolve(false);
        });

        tester.once('listening', () => {
            tester.close(() => resolve(true));
        });

        tester.listen(PORT);
    });

    if (!isPortAvailable) {
        return;
    }

    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
};

void startServer();

/*------------------------------------
Check connect Database
--------------------------------------*/
pool.connect()
    .then(client => {
        console.log("Database connected successfully!");
        client.release();
    })
    .catch(err => {
        console.error("Database connection failed:", err);
    });








