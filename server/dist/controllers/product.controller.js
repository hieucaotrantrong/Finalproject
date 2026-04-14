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
exports.updateProductStockStatus = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getAllProducts = void 0;
const database_1 = __importDefault(require("../config/database"));
const warehouse_service_1 = require("../services/warehouse.service");
const toProductResponse = (product) => (Object.assign(Object.assign({}, product), { is_out_of_stock: Boolean(product === null || product === void 0 ? void 0 : product.is_out_of_stock), stock_quantity: Number((product === null || product === void 0 ? void 0 : product.stock_quantity) || 0) }));
/*----------------------------------
Get all products
-----------------------------------*/
const getAllProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield database_1.default.query(`
            SELECT
                p.*,
                COALESCE(inv.quantity, 0)::int AS stock_quantity,
                COALESCE(r.avg_rating, 0) AS average_rating,
                COALESCE(r.review_count, 0) AS review_count
            FROM products p
            LEFT JOIN product_inventory inv ON inv.product_id = p.id
            LEFT JOIN (
                SELECT
                    product_id,
                    ROUND(AVG(rating)::numeric, 1) AS avg_rating,
                    COUNT(*)::int AS review_count
                FROM reviews
                GROUP BY product_id
            ) r ON r.product_id = p.id
        `);
        res.json((result.rows || []).map(toProductResponse));
    }
    catch (err) {
        console.error('Lỗi khi lấy sản phẩm:', err);
        res.status(500).json({ error: 'Lỗi khi lấy sản phẩm' });
    }
});
exports.getAllProducts = getAllProducts;
/*----------------------------------
Get product by id (FULL: product + images + specs)
-----------------------------------*/
const getProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        // 1. product
        const result = yield database_1.default.query(`SELECT
                p.*,
                COALESCE(inv.quantity, 0)::int AS stock_quantity,
                COALESCE(r.avg_rating, 0) AS average_rating,
                COALESCE(r.review_count, 0) AS review_count
             FROM products p
             LEFT JOIN product_inventory inv ON inv.product_id = p.id
             LEFT JOIN (
                SELECT
                    product_id,
                    ROUND(AVG(rating)::numeric, 1) AS avg_rating,
                    COUNT(*)::int AS review_count
                FROM reviews
                GROUP BY product_id
             ) r ON r.product_id = p.id
             WHERE p.id = $1`, [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Sản phẩm không tồn tại' });
            return;
        }
        const product = toProductResponse(result.rows[0]);
        // 2. images
        const imageResult = yield database_1.default.query('SELECT image_url FROM product_images WHERE product_id = $1', [id]);
        product.images = imageResult.rows.map((img) => img.image_url);
        // 🔥 3. specs
        const specResult = yield database_1.default.query('SELECT group_name, spec_key, spec_value FROM product_specs WHERE product_id = $1', [id]);
        product.specs = specResult.rows;
        res.json(product);
    }
    catch (err) {
        console.error('Lỗi khi lấy sản phẩm:', err);
        res.status(500).json({ error: 'Lỗi khi lấy sản phẩm' });
    }
});
exports.getProductById = getProductById;
/*----------------------------------
Create product (FULL: product + images + specs)
-----------------------------------*/
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, originalprice, price, discount, tag, image, category, images, specs, is_out_of_stock } = req.body;
    const client = yield database_1.default.connect();
    try {
        yield client.query('BEGIN');
        // 1. insert product
        const result = yield client.query(`INSERT INTO products (title, originalprice, price, discount, tag, image, category, is_out_of_stock)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`, [title, originalprice, price, discount, tag, image, category, Boolean(is_out_of_stock)]);
        const newProduct = result.rows[0];
        // Ensure each product always has an inventory row, default quantity = 0.
        yield (0, warehouse_service_1.ensureInventoryRow)(client, Number(newProduct.id));
        newProduct.stock_quantity = 0;
        // 2. insert images
        if (Array.isArray(images)) {
            for (const img of images) {
                if (!img)
                    continue;
                yield client.query(`INSERT INTO product_images (product_id, image_url)
                     VALUES ($1, $2)`, [newProduct.id, img]);
            }
        }
        // 🔥 3. insert specs
        if (Array.isArray(specs)) {
            for (const spec of specs) {
                if (!spec.spec_key || !spec.spec_value)
                    continue;
                yield client.query(`INSERT INTO product_specs (product_id, group_name, spec_key, spec_value)
                     VALUES ($1, $2, $3, $4)`, [
                    newProduct.id,
                    spec.group_name,
                    spec.spec_key,
                    spec.spec_value
                ]);
            }
        }
        yield client.query('COMMIT');
        res.status(201).json(toProductResponse(newProduct));
    }
    catch (err) {
        yield client.query('ROLLBACK');
        console.error('Lỗi khi thêm sản phẩm:', err);
        res.status(500).json({ error: 'Lỗi khi thêm sản phẩm' });
    }
    finally {
        client.release();
    }
});
exports.createProduct = createProduct;
/*----------------------------------
Update product (FULL: product + images + specs)
-----------------------------------*/
const updateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { id } = req.params;
    const { title, originalprice, price, discount, tag, image, category, images, specs, is_out_of_stock } = req.body;
    const client = yield database_1.default.connect();
    try {
        yield client.query('BEGIN');
        const currentProduct = yield client.query('SELECT is_out_of_stock FROM products WHERE id = $1 LIMIT 1', [id]);
        if (currentProduct.rows.length === 0) {
            yield client.query('ROLLBACK');
            res.status(404).json({ error: 'Sản phẩm không tồn tại' });
            return;
        }
        const nextOutOfStock = typeof is_out_of_stock === 'boolean'
            ? is_out_of_stock
            : Boolean((_a = currentProduct.rows[0]) === null || _a === void 0 ? void 0 : _a.is_out_of_stock);
        // 1. update product
        const result = yield client.query(`UPDATE products 
             SET title = $1,
                 "originalprice" = $2,
                 price = $3,
                 discount = $4,
                 tag = $5,
                 image = $6,
                 category = $7,
                 is_out_of_stock = $8
             WHERE id = $9`, [title, originalprice, price, discount, tag, image, category, nextOutOfStock, id]);
        if (((_b = result.rowCount) !== null && _b !== void 0 ? _b : 0) === 0) {
            yield client.query('ROLLBACK');
            res.status(404).json({ error: 'Sản phẩm không tồn tại' });
            return;
        }
        // 2. update images
        if (Array.isArray(images)) {
            yield client.query('DELETE FROM product_images WHERE product_id = $1', [id]);
            for (const img of images) {
                if (!img)
                    continue;
                yield client.query(`INSERT INTO product_images (product_id, image_url)
                     VALUES ($1, $2)`, [id, img]);
            }
        }
        // 🔥 3. update specs
        if (Array.isArray(specs)) {
            yield client.query('DELETE FROM product_specs WHERE product_id = $1', [id]);
            for (const spec of specs) {
                if (!spec.spec_key || !spec.spec_value)
                    continue;
                yield client.query(`INSERT INTO product_specs (product_id, group_name, spec_key, spec_value)
                     VALUES ($1, $2, $3, $4)`, [
                    id,
                    spec.group_name,
                    spec.spec_key,
                    spec.spec_value
                ]);
            }
        }
        yield client.query('COMMIT');
        res.json({ message: 'Cập nhật sản phẩm thành công' });
    }
    catch (err) {
        yield client.query('ROLLBACK');
        console.error('Lỗi khi cập nhật sản phẩm:', err);
        res.status(500).json({ error: 'Lỗi khi cập nhật sản phẩm' });
    }
    finally {
        client.release();
    }
});
exports.updateProduct = updateProduct;
/*----------------------------------
Delete product
-----------------------------------*/
const deleteProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    try {
        const result = yield database_1.default.query('DELETE FROM products WHERE id = $1', [id]);
        if (((_a = result.rowCount) !== null && _a !== void 0 ? _a : 0) > 0) {
            res.json({ message: 'Xóa sản phẩm thành công' });
        }
        else {
            res.status(404).json({ error: 'Sản phẩm không tồn tại' });
        }
    }
    catch (err) {
        console.error('Lỗi khi xóa sản phẩm:', err);
        res.status(500).json({ error: 'Lỗi khi xóa sản phẩm' });
    }
});
exports.deleteProduct = deleteProduct;
/*----------------------------------
Update stock status (in/out of stock)
-----------------------------------*/
const updateProductStockStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { is_out_of_stock } = req.body;
    if (typeof is_out_of_stock !== 'boolean') {
        res.status(400).json({ error: 'is_out_of_stock phải là boolean' });
        return;
    }
    try {
        const existing = yield database_1.default.query('SELECT id FROM products WHERE id = $1 LIMIT 1', [id]);
        if (existing.rows.length === 0) {
            res.status(404).json({ error: 'Sản phẩm không tồn tại' });
            return;
        }
        const updated = yield database_1.default.query(`UPDATE products
             SET is_out_of_stock = $1
             WHERE id = $2
             RETURNING *`, [is_out_of_stock, id]);
        res.json({
            message: 'Cập nhật trạng thái hàng thành công',
            product: toProductResponse(updated.rows[0])
        });
    }
    catch (err) {
        console.error('Lỗi khi cập nhật trạng thái hàng:', err);
        res.status(500).json({ error: 'Lỗi khi cập nhật trạng thái hàng' });
    }
});
exports.updateProductStockStatus = updateProductStockStatus;
