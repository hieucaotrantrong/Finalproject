"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = require("crypto");
const eventBus_1 = require("../realtime/eventBus");
const router = (0, express_1.Router)();
router.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    const clientId = (0, crypto_1.randomUUID)();
    (0, eventBus_1.addRealtimeClient)(clientId, res);
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId, at: new Date().toISOString() })}\n\n`);
    const heartbeat = setInterval(() => {
        res.write(`event: heartbeat\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);
    }, 25000);
    req.on('close', () => {
        clearInterval(heartbeat);
        (0, eventBus_1.removeRealtimeClient)(clientId);
        res.end();
    });
});
exports.default = router;
