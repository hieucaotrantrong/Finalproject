import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import pool from '../config/database';

dotenv.config();
const router = Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface ChatRequest extends Request {
    body: {
        prompt: string;
    }
}

/* --------------------------------------------------------
   FIX EXPRESS TS ERROR (KHÔNG TẠO FILE MỚI)
--------------------------------------------------------- */
const asyncHandler = (fn: any) => {
    return (req: any, res: any, next: any) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/* --------------------------------------------------------
   Chat Handler
--------------------------------------------------------- */
async function chatHandler(req: ChatRequest, res: Response): Promise<void> {
    try {
        const { prompt } = req.body;

        /*----------------------------------
         Phát hiện câu hỏi sản phẩm
        -----------------------------------*/
        const isProductQuery =
            prompt.toLowerCase().includes('có') &&
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
                const result = await pool.query(
                    `SELECT * FROM products WHERE ${searchQuery} ORDER BY title`,
                    searchParams
                );

                const products = result.rows;

                if (products.length > 0) {
                    let response = 'Có, chúng tôi có các sản phẩm sau:\n\n';

                    products.forEach((product: any, index: number) => {
                        response += `${index + 1}. ${product.title}\n`;
                        response += `   - Giá gốc: ${product.originalprice}đ\n`;
                        response += `   - Giá khuyến mãi: ${product.price}đ\n`;
                        response += `   - Giảm giá: ${product.discount}%\n`;
                        if (product.tag) response += `   - Tag: ${product.tag}\n`;
                        response += '\n';
                    });

                    res.json({ text: response });
                    return;
                } else {
                    res.json({
                        text: `Xin lỗi, chúng tôi không tìm thấy sản phẩm: ${keywords.join(
                            ' '
                        )}.`,
                    });
                    return;
                }
            }
        }

        // Nếu không phải hỏi sản phẩm -> dùng Gemini AI
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;

        res.json({ text: response.text() });
    } catch (error: any) {
        console.error('Chatbot error:', error);

        if (error?.status === 429) {
            res.status(429).json({
                error: 'Hệ thống quá tải, vui lòng thử lại sau.',
            });
            return;
        }

        res.status(500).json({
            error: error.message || 'Unknown server error',
        });
    }
}

/* --------------------------------------------------------
   Route
--------------------------------------------------------- */
router.post('/chat', asyncHandler(chatHandler));

export default router;
