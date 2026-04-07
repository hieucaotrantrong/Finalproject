"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitOrderUpdated = exports.emitInventoryUpdated = exports.emitRealtimeEvent = exports.removeRealtimeClient = exports.addRealtimeClient = void 0;
const clients = [];
const addRealtimeClient = (id, res) => {
    clients.push({ id, res });
};
exports.addRealtimeClient = addRealtimeClient;
const removeRealtimeClient = (id) => {
    const index = clients.findIndex((client) => client.id === id);
    if (index >= 0) {
        clients.splice(index, 1);
    }
};
exports.removeRealtimeClient = removeRealtimeClient;
const emitRealtimeEvent = (eventName, payload = {}) => {
    const serialized = `event: ${eventName}\ndata: ${JSON.stringify(Object.assign({ event: eventName }, payload))}\n\n`;
    for (const client of clients) {
        client.res.write(serialized);
    }
};
exports.emitRealtimeEvent = emitRealtimeEvent;
const emitInventoryUpdated = (source) => {
    (0, exports.emitRealtimeEvent)('inventory-updated', { source, at: new Date().toISOString() });
};
exports.emitInventoryUpdated = emitInventoryUpdated;
const emitOrderUpdated = (source) => {
    (0, exports.emitRealtimeEvent)('order-updated', { source, at: new Date().toISOString() });
};
exports.emitOrderUpdated = emitOrderUpdated;
