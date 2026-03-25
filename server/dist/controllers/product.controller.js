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
exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getAllProducts = void 0;
const database_1 = __importDefault(require("../config/database"));
/*----------------------------------
Get all products
-----------------------------------*/
const getAllProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield database_1.default.query('SELECT * FROM products');
        res.json(result.rows);
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
        const result = yield database_1.default.query('SELECT * FROM products WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Sản phẩm không tồn tại' });
            return;
        }
        const product = result.rows[0];
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
    const { title, originalprice, price, discount, tag, image, category, images, specs } = req.body;
    const client = yield database_1.default.connect();
    try {
        yield client.query('BEGIN');
        // 1. insert product
        const result = yield client.query(`INSERT INTO products (title, originalprice, price, discount, tag, image, category)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`, [title, originalprice, price, discount, tag, image, category]);
        const newProduct = result.rows[0];
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
        res.status(201).json(newProduct);
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
    var _a;
    const { id } = req.params;
    const { title, originalprice, price, discount, tag, image, category, images, specs } = req.body;
    const client = yield database_1.default.connect();
    try {
        yield client.query('BEGIN');
        // 1. update product
        const result = yield client.query(`UPDATE products 
             SET title = $1,
                 "originalprice" = $2,
                 price = $3,
                 discount = $4,
                 tag = $5,
                 image = $6,
                 category = $7
             WHERE id = $8`, [title, originalprice, price, discount, tag, image, category, id]);
        if (((_a = result.rowCount) !== null && _a !== void 0 ? _a : 0) === 0) {
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
