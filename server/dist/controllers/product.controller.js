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
        console.log('Attempting to query products...');
        const result = yield database_1.default.query('SELECT * FROM products');
        console.log('Query successful, rows:', result.rows.length);
        res.json(result.rows);
    }
    catch (err) {
        console.error('Lỗi khi lấy sản phẩm:', err);
        // Trả về thông tin lỗi chi tiết hơn trong development
        res.status(500).json({
            error: 'Lỗi khi lấy sản phẩm',
            details: process.env.NODE_ENV !== 'production' ? err : undefined
        });
    }
});
exports.getAllProducts = getAllProducts;
/*----------------------------------
Get product by id
-----------------------------------*/
const getProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        // 1. lấy product
        const result = yield database_1.default.query('SELECT * FROM products WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Sản phẩm không tồn tại' });
            return;
        }
        const product = result.rows[0];
        // 2. lấy danh sách ảnh
        const imageResult = yield database_1.default.query('SELECT image_url FROM product_images WHERE product_id = $1', [id]);
        // 3. gộp images vào product
        product.images = imageResult.rows.map((img) => img.image_url);
        // 4. trả về
        res.json(product);
    }
    catch (err) {
        console.error('Lỗi khi lấy sản phẩm:', err);
        res.status(500).json({ error: 'Lỗi khi lấy sản phẩm' });
    }
});
exports.getProductById = getProductById;
/*----------------------------------
Create product
-----------------------------------*/
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, originalprice, price, discount, tag, image, category, images } = req.body;
    console.log('Received data:', req.body);
    try {
        // 1. thêm product
        const result = yield database_1.default.query(`INSERT INTO products (title, originalprice, price, discount, tag, image, category)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`, [title, originalprice, price, discount, tag, image, category]);
        const newProduct = result.rows[0];
        // 2. thêm nhiều ảnh vào bảng product_images
        if (images && images.length > 0) {
            for (const img of images) {
                yield database_1.default.query(`INSERT INTO product_images (product_id, image_url)
                     VALUES ($1, $2)`, [newProduct.id, img]);
            }
        }
        res.status(201).json(newProduct);
    }
    catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Lỗi khi thêm sản phẩm' });
    }
});
exports.createProduct = createProduct;
/*----------------------------------
Update product
-----------------------------------*/
const updateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const { title, originalprice, price, discount, tag, image, category, images } = req.body;
    console.log('Update product ID:', id);
    console.log('Update data:', req.body);
    try {
        const result = yield database_1.default.query(`UPDATE products 
             SET title = $1,
                 "originalprice" = $2,
                 price = $3,
                 discount = $4,
                 tag = $5,
                 image = $6,
                 category = $7
             WHERE id = $8`, [title, originalprice, price, discount, tag, image, category, id]);
        if (Array.isArray(images)) {
            yield database_1.default.query('DELETE FROM product_images WHERE product_id = $1', [id]);
            for (const img of images) {
                if (!img)
                    continue;
                yield database_1.default.query(`INSERT INTO product_images (product_id, image_url)
                     VALUES ($1, $2)`, [id, img]);
            }
        }
        console.log('Update result rowCount:', result.rowCount);
        if (((_a = result.rowCount) !== null && _a !== void 0 ? _a : 0) > 0) {
            res.json({ message: 'Cập nhật sản phẩm thành công' });
        }
        else {
            res.status(404).json({ error: 'Sản phẩm không tồn tại' });
        }
    }
    catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Lỗi khi cập nhật sản phẩm' });
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
        console.error('Database error:', err);
        res.status(500).json({ error: 'Lỗi khi xóa sản phẩm' });
    }
});
exports.deleteProduct = deleteProduct;
