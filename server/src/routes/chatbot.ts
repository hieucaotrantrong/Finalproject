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
        const normalizedPrompt = String(prompt || '')
            .toLowerCase()
            .replace(/[^a-z0-9\s\u00c0-\u1ef9]/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const keywords = normalizedPrompt
            .replace(/\b(có|không|ko|cái|những|các|sản phẩm|hay|là|nào|gì|thế|như|vậy|đang|đã|còn|có\s*bán|mua|bán|tìm|kiếm)\b/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .split(' ')
            .filter((word) => word.length > 1);

        if (keywords.length === 0) {
            res.json({ text: 'Xin lỗi, chúng tôi chỉ hỗ trợ tra cứu sản phẩm trong hệ thống.' });
            return;
        }

        const searchParams = keywords.map((k) => `%${k}%`);
        const searchQuery = keywords
            .map((_, index) => `(
                LOWER(title) LIKE LOWER($${index + 1})
                OR LOWER(COALESCE(tag, '')) LIKE LOWER($${index + 1})
                OR LOWER(COALESCE(category, '')) LIKE LOWER($${index + 1})
            )`)
            .join(' AND ');

        const result = await pool.query(
            `SELECT * FROM products WHERE ${searchQuery} ORDER BY title LIMIT 20`,
            searchParams
        );

        const products = result.rows
            .map((product: any) => {
                const title = String(product.title || '').toLowerCase();
                const tag = String(product.tag || '').toLowerCase();
                const category = String(product.category || '').toLowerCase();
                const searchableText = `${title} ${tag} ${category}`;

                const keywordScore = keywords.reduce((score, keyword) => {
                    if (title.includes(keyword)) return score + 5;
                    if (tag.includes(keyword)) return score + 3;
                    if (category.includes(keyword)) return score + 2;
                    return score;
                }, 0);

                const exactPhraseBonus = searchableText.includes(normalizedPrompt) ? 10 : 0;
                const titleLengthPenalty = title.length / 120;

                return {
                    ...product,
                    _score: keywordScore + exactPhraseBonus - titleLengthPenalty,
                };
            })
            .filter((product: any) => product._score > 0)
            .sort((a: any, b: any) => b._score - a._score || String(a.title).localeCompare(String(b.title)));

        if (products.length > 0) {
            const matchedProducts = products.slice(0, 4);
            res.json({
                text: matchedProducts.length > 1
                    ? `Có, mình tìm thấy ${matchedProducts.length} sản phẩm phù hợp nhất.`
                    : `Có, sản phẩm phù hợp nhất là ${matchedProducts[0].title}.`,
                products: matchedProducts.map((product: any) => ({
                    id: product.id,
                    title: product.title,
                    price: product.price,
                    originalprice: product.originalprice,
                    image: product.image,
                    tag: product.tag,
                    category: product.category,
                    average_rating: product.average_rating,
                    review_count: product.review_count,
                })),
                product: matchedProducts[0]
                    ? {
                        id: matchedProducts[0].id,
                        title: matchedProducts[0].title,
                        price: matchedProducts[0].price,
                        originalprice: matchedProducts[0].originalprice,
                        image: matchedProducts[0].image,
                        tag: matchedProducts[0].tag,
                        category: matchedProducts[0].category,
                        average_rating: matchedProducts[0].average_rating,
                        review_count: matchedProducts[0].review_count,
                    }
                    : null,
            });
            return;
        }

        res.json({ text: 'Xin lỗi, hiện tại chúng tôi không có sản phẩm phù hợp trong hệ thống.' });
        return;
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
