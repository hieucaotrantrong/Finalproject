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

        const numericTokens = keywords.filter((k) => /\d/.test(k));

        // helper: wrap promise with timeout (dùng chung)
        const callWithTimeout = (p: Promise<any>, ms = 6000) => {
            return Promise.race([
                p,
                new Promise((_, reject) => setTimeout(() => reject(new Error('genAI timeout')), ms)),
            ]);
        };

        const brandAliases: Record<string, string[]> = {
            asus: ['asus'],
            apple: ['apple', 'iphone', 'ios', 'mac', 'macbook', 'macbook air', 'macbook pro'],
            dell: ['dell', 'inspiron', 'xps', 'alienware'],
            lenovo: ['lenovo', 'thinkpad', 'ideaPad', 'ideapad'],
            hp: ['hp', 'hewlett packard', 'pavilion', 'spectre', 'envy'],
            acer: ['acer'],
            msi: ['msi'],
            gigabyte: ['gigabyte'],
            razer: ['razer'],
            samsung: ['samsung', 'galaxy'],
            xiaomi: ['xiaomi', 'redmi', 'poco', 'mi'],
            oppo: ['oppo'],
            vivo: ['vivo'],
            realme: ['realme'],
            nokia: ['nokia'],
            sony: ['sony', 'xperia'],
            wanbo: ['wanbo'],
            benq: ['benq'],
            epson: ['epson'],
            viewsonic: ['viewsonic'],
            optoma: ['optoma'],
            zwatch: ['zwatch'],
            fitbit: ['fitbit'],
            garmin: ['garmin'],
            amazfit: ['amazfit'],
            huawei: ['huawei'],
            sandisk: ['sandisk', 'san disk'],
            seagate: ['seagate'],
            western_digital: ['western digital', 'wd'],
            kingston: ['kingston'],
            crucial: ['crucial'],
            toshiba: ['toshiba'],
        };

        const detectedBrands = Object.entries(brandAliases)
            .filter(([, aliases]) => aliases.some((alias) => normalizedPrompt.includes(alias)))
            .map(([brand]) => brand);

        let forcedCategory: 'phone' | 'laptop' | 'accessory' | 'camera' | 'projector' | 'watch' | 'storage' | null = null;
        if (/(dong ho|đồng hồ|smartwatch|watch|zwatch|fitbit|garmin|amazfit)/.test(normalizedPrompt)) {
            forcedCategory = 'watch';
        } else if (/(iphone|dien thoai|smartphone|mobile|galaxy|redmi|oppo|vivo|realme|nokia)/.test(normalizedPrompt)) {
            forcedCategory = 'phone';
        } else if (/(laptop|notebook|macbook|may tinh xach tay|dell|asus|acer|lenovo|hp)/.test(normalizedPrompt)) {
            forcedCategory = 'laptop';
        } else if (/(camera|may anh|gopro|dslr)/.test(normalizedPrompt)) {
            forcedCategory = 'camera';
        } else if (/(may chieu|máy chiếu|projector)/.test(normalizedPrompt)) {
            forcedCategory = 'projector';
        } else if (/(o cung|ổ cứng|ssd|hdd|hard drive|nvme|sata|external ssd|portable ssd|usb|usb 3|usb3|usb-c)/.test(normalizedPrompt)) {
            forcedCategory = 'storage';
        } else if (/(phu kien|tai nghe|op lung|sac|charger|cable)/.test(normalizedPrompt)) {
            forcedCategory = 'accessory';
        }

        // Quick heuristic: is this a product-related query?
        const productIntentRegex = /(mua|bán|giá|bảo hành|phiên bản|model|ssd|ổ cứng|đồng hồ|dong ho|máy chiếu|may chieu|laptop|notebook|điện thoại|dien thoai|phone|camera|phụ kiện|phu kien|tai nghe|sạc|sac)/i;
        const looksLikeProductQuery = productIntentRegex.test(normalizedPrompt) || Boolean(forcedCategory) || detectedBrands.length > 0 || numericTokens.length > 0;

        const rowText = (p: any) => `${String(p.title || '')} ${String(p.tag || '')} ${String(p.category || '')}`.toLowerCase();
        const applyIntentFilters = (rows: any[]) => {
            let filtered = rows;

            if (forcedCategory) {
                filtered = filtered.filter((p: any) => {
                    const txt = rowText(p);
                    if (forcedCategory === 'phone') return /(phone|dien thoai|smartphone|mobile|iphone|galaxy|redmi|oppo|vivo|realme|nokia)/.test(txt);
                    if (forcedCategory === 'laptop') return /(laptop|notebook|macbook|may tinh xach tay|dell|asus|acer|lenovo|hp)/.test(txt);
                    if (forcedCategory === 'camera') return /(camera|may anh|dslr|gopro)/.test(txt);
                    if (forcedCategory === 'projector') return /(may chieu|máy chiếu|projector|wanbo|benq|epson|viewsonic|optoma)/.test(txt);
                    if (forcedCategory === 'watch') return /(dong ho|đồng hồ|smartwatch|watch|zwatch|fitbit|garmin|amazfit|huawei|apple watch)/.test(txt);
                    if (forcedCategory === 'storage') return /(o cung|ổ cứng|ssd|hdd|hard drive|nvme|sata|external|portable|usb|san disk|sandisk|seagate|western digital|wd|kingston|crucial|toshiba)/.test(txt);
                    return /(accessory|phu kien|tai nghe|op lung|sac|charger|cable)/.test(txt);
                });
            }

            if (detectedBrands.length > 0) {
                filtered = filtered.filter((p: any) => {
                    const txt = rowText(p);
                    return detectedBrands.some((brand) => (brandAliases[brand] || []).some((alias) => txt.includes(alias)));
                });
            }

            if (numericTokens.length > 0) {
                filtered = filtered.filter((p: any) => {
                    const txt = rowText(p);
                    return numericTokens.every((t) => new RegExp(`\\b${t}[a-z0-9-]*\\b`).test(txt));
                });
            }

            return filtered;
        };

        const askGemini = async (message: string) => {
            try {
                const ai = genAI as any;
                const model = ai.getGenerativeModel
                    ? ai.getGenerativeModel({ model: 'gemini-2.5-flash' })
                    : null;

                if (model) {
                    const genPromise = (async () => {
                        const result = await model.generateContent(message);
                        const response = await result.response;
                        // response.text may be a function in some SDKs
                        if (response && typeof response.text === 'function') return response.text();
                        return response?.outputText || response?.text || null;
                    })();

                    return await callWithTimeout(genPromise, 6000);
                }
            } catch (e) {
                console.error('[chatbot] genAI error', (e as any).message || e);
                return null;
            }
        };

        // Mọi câu không giống tìm sản phẩm thì trả cho Gemini
        if (!looksLikeProductQuery) {
            const candidate = await askGemini(prompt);
            if (candidate) {
                res.json({ text: String(candidate) });
                return;
            }

            res.json({ text: 'Mình chưa trả lời được câu này. Bạn thử hỏi lại ngắn hơn nhé.' });
            return;
        }

        const searchParams = keywords.map((k) => `%${k}%`);
        // Use OR between tokens to be more permissive for user queries (e.g., "iphone 17")
        const searchQuery = keywords
            .map((_, index) => `(
                LOWER(title) LIKE LOWER($${index + 1})
                OR LOWER(COALESCE(tag, '')) LIKE LOWER($${index + 1})
                OR LOWER(COALESCE(category, '')) LIKE LOWER($${index + 1})
            )`)
            .join(' OR ');

        const result = await pool.query(
            `SELECT * FROM products WHERE ${searchQuery} ORDER BY title LIMIT 20`,
            searchParams
        );

        let products = result.rows
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

                const brandBoost = detectedBrands.reduce((b: number, brand: string) => {
                    const aliases = brandAliases[brand] || [];
                    return b + (aliases.some((a) => searchableText.includes(a)) ? 8 : 0);
                }, 0);

                const exactPhraseBonus = searchableText.includes(normalizedPrompt) ? 10 : 0;
                const titleLengthPenalty = title.length / 120;

                return {
                    ...product,
                    _score: keywordScore + exactPhraseBonus - titleLengthPenalty + brandBoost,
                };
            });

        products = applyIntentFilters(products);

        // prefer exact phrase in title
        products.sort((a: any, b: any) => {
            const at = String(a.title || '').toLowerCase();
            const bt = String(b.title || '').toLowerCase();
            const aExact = at.includes(normalizedPrompt) ? 1 : 0;
            const bExact = bt.includes(normalizedPrompt) ? 1 : 0;
            if (aExact !== bExact) return bExact - aExact;
            return (b._score || 0) - (a._score || 0) || at.localeCompare(bt);
        });

        // If no products found with OR search (rare), try a looser token-based fallback (any token matches)
        if ((!products || products.length === 0) && keywords.length > 0) {
            const tokenParams = keywords.map((k) => `%${k}%`);
            const tokenConditions = keywords.map((_, i) => `(
                LOWER(title) LIKE LOWER($${i + 1})
                OR LOWER(COALESCE(tag, '')) LIKE LOWER($${i + 1})
                OR LOWER(COALESCE(category, '')) LIKE LOWER($${i + 1})
            )`).join(' OR ');

            try {
                const fallback = await pool.query(`SELECT * FROM products WHERE ${tokenConditions} ORDER BY title LIMIT 50`, tokenParams);
                products = (fallback.rows || []).map((product: any) => ({
                    ...product,
                    _score: 1,
                }));
                products = applyIntentFilters(products);
            } catch (e) {
                console.error('[chatbot] fallback token query error', (e as any).message || e);
            }
        }

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
