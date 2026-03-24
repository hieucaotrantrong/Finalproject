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
const express_1 = require("express");
const generative_ai_1 = require("@google/generative-ai");
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = __importDefault(require("../config/database"));
dotenv_1.default.config();
const router = (0, express_1.Router)();
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
/* --------------------------------------------------------
   FIX EXPRESS TS ERROR (KHÔNG TẠO FILE MỚI)
--------------------------------------------------------- */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
/* --------------------------------------------------------
   Chat Handler
--------------------------------------------------------- */
function chatHandler(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { prompt } = req.body;
            /*----------------------------------
             Phát hiện câu hỏi sản phẩm
            -----------------------------------*/
            const isProductQuery = prompt.toLowerCase().includes('có') &&
                (prompt.toLowerCase().includes('không') ||
                    prompt.toLowerCase().includes('ko'));
            if (isProductQuery) {
                const keywords = prompt
                    .toLowerCase()
                    .replace(/có|không|ko|cái|những|các|sản phẩm|hay|là|nào|gì|thế|như|vậy/g, '')
                    .trim()
                    .split(' ')
                    .filter((word) => word.length > 2);
                if (keywords.length > 0) {
                    /* --------------------------------------------
                        Build PostgreSQL LIKE Query
                       -------------------------------------------- */
                    const searchQuery = keywords
                        .map((_, index) => `LOWER(title) LIKE LOWER($${index + 1})`)
                        .join(' OR ');
                    const searchParams = keywords.map((k) => `%${k}%`);
                    /* --------------------------------------------
                        Query PostgreSQL
                       -------------------------------------------- */
                    const result = yield database_1.default.query(`SELECT * FROM products WHERE ${searchQuery} ORDER BY title`, searchParams);
                    const products = result.rows;
                    if (products.length > 0) {
                        let response = 'Có, chúng tôi có các sản phẩm sau:\n\n';
                        products.forEach((product, index) => {
                            response += `${index + 1}. ${product.title}\n`;
                            response += `   - Giá gốc: ${product.originalprice}đ\n`;
                            response += `   - Giá khuyến mãi: ${product.price}đ\n`;
                            response += `   - Giảm giá: ${product.discount}%\n`;
                            if (product.tag)
                                response += `   - Tag: ${product.tag}\n`;
                            response += '\n';
                        });
                        res.json({ text: response });
                        return;
                    }
                    else {
                        res.json({
                            text: `Xin lỗi, chúng tôi không tìm thấy sản phẩm: ${keywords.join(' ')}.`,
                        });
                        return;
                    }
                }
            }
            // Nếu không phải hỏi sản phẩm -> dùng Gemini AI
            const model = genAI.getGenerativeModel({
                model: 'gemini-2.5-flash',
            });
            const result = yield model.generateContent(prompt);
            const response = yield result.response;
            res.json({ text: response.text() });
        }
        catch (error) {
            console.error('Chatbot error:', error);
            if ((error === null || error === void 0 ? void 0 : error.status) === 429) {
                res.status(429).json({
                    error: 'Hệ thống quá tải, vui lòng thử lại sau.',
                });
                return;
            }
            res.status(500).json({
                error: error.message || 'Unknown server error',
            });
        }
    });
}
/* --------------------------------------------------------
   Route
--------------------------------------------------------- */
router.post('/chat', asyncHandler(chatHandler));
exports.default = router;
