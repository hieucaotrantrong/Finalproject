import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { FiSend, FiShoppingCart } from 'react-icons/fi';
import { IoMdClose } from 'react-icons/io';
import { useCart } from '../context/CartContext';

const WELCOME_MESSAGES = [
    {
        text: 'Xin chào Anh/Chị! Em là trợ lý AI của Techworld',
        isUser: false,
    },
    {
        text: 'Em rất sẵn lòng hỗ trợ Anh/Chị 😊',
        isUser: false,
    },
];

const ChatBotIcon = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [responses, setResponses] = useState(WELCOME_MESSAGES);
    const messagesEndRef = useRef(null);
    const { addToCart } = useCart();

    const handleToggle = () => setIsOpen((prev) => !prev);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [responses, isOpen]);

    const handleSendMessage = async () => {
        if (!message.trim()) return;

        const newResponses = [...responses, { text: message, isUser: true }];
        setResponses(newResponses);

        try {
            const response = await axios.post('http://localhost:5000/api/chatbot/chat', { prompt: message });
            setResponses([
                ...newResponses,
                {
                    text: response.data.text,
                    isUser: false,
                    product: response.data.product || null,
                    products: response.data.products || null,
                },
            ]);
            setMessage('');
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSendMessage();
    };

    const resolveProductImageSrc = (image = '') => {
        if (!image) return '';

        const value = String(image).trim();
        if (!value) return '';

        if (/^(https?:\/\/|data:|blob:|\/)/i.test(value)) {
            return value;
        }

        const normalizedFileName = value.split(/[/\\]/).pop();
        if (!normalizedFileName) return '';

        return `/assets/${normalizedFileName}`;
    };

    const formatPrice = (value) => Number(value || 0).toLocaleString('vi-VN');

    const getRatingValue = (product) => {
        const parsedRating = Number(product?.average_rating);
        if (Number.isFinite(parsedRating) && parsedRating > 0) {
            return Math.max(0, Math.min(5, parsedRating));
        }

        return null;
    };

    const getReviewCount = (product) => {
        const parsedCount = Number(product?.review_count);
        if (Number.isFinite(parsedCount) && parsedCount > 0) {
            return parsedCount;
        }

        return 0;
    };

    const formatReviewCount = (value) => value.toLocaleString('vi-VN');

    const formatRatingValue = (value) => {
        if (!Number.isFinite(value)) {
            return 'Chưa có đánh giá';
        }

        return value.toFixed(1);
    };

    const renderStars = (rating) => {
        return Array.from({ length: 5 }, (_, index) => {
            const filled = index < Math.round(rating);

            return (
                <span key={index} className={filled ? 'text-[#ff6b2c]' : 'text-[#d9d9d9]'}>
                    ★
                </span>
            );
        });
    };

    const ProductCard = ({ product, compact = false }) => {
        const productImage = resolveProductImageSrc(product?.image);
        const ratingValue = getRatingValue(product);
        const reviewCount = getReviewCount(product);

        return (
            <div className={`flex h-full flex-col overflow-hidden rounded-[20px] border border-[#e8e8e8] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)] ${compact ? 'p-2' : 'p-2.5'}`}>
                <div className="overflow-hidden rounded-[16px] bg-[#fafafa]">
                    <div className={`flex aspect-square items-center justify-center ${compact ? 'p-2' : 'p-3'}`}>
                        {productImage ? (
                            <img
                                src={productImage}
                                alt={product.title || 'Product'}
                                className="h-full w-full object-contain"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center rounded-[14px] border border-dashed border-[#e1e1e1] text-[11px] text-gray-400">
                                Không có ảnh
                            </div>
                        )}
                    </div>
                </div>

                <div className={`mt-2 flex flex-1 flex-col ${compact ? 'gap-1.5 px-0.5 pb-0.5' : 'gap-2 px-0.5 pb-0.5'}`}>
                    <div className="min-h-[38px] text-[13px] font-semibold leading-5 text-gray-900 line-clamp-2">
                        {product.title}
                    </div>

                    <div className="text-[14px] font-extrabold leading-none text-[#ff5a1f]">
                        {formatPrice(product.price)}đ
                    </div>

                    <div className="flex items-center gap-1 text-[11px]">
                        {Number.isFinite(ratingValue) ? (
                            <>
                                <div className="flex items-center gap-0.5 text-[11px] leading-none">
                                    {renderStars(ratingValue)}
                                </div>
                                <span className="text-gray-700 font-medium">{formatRatingValue(ratingValue)}</span>
                                <span className="text-gray-500">({formatReviewCount(reviewCount)})</span>
                            </>
                        ) : (
                            <span className="text-gray-500">Chưa có đánh giá</span>
                        )}
                    </div>

                    <div className="mt-auto pt-1">
                        <button
                            type="button"
                            onClick={() => {
                                addToCart(product);
                                setResponses((prev) => [
                                    ...prev,
                                    {
                                        text: `Đã thêm ${product.title} vào giỏ hàng.`,
                                        isUser: false,
                                    },
                                ]);
                            }}
                            className="inline-flex w-full flex-nowrap items-center justify-center gap-1 rounded-[10px] border border-[#d9d9d9] bg-white px-2 py-1.5 text-[11px] font-medium leading-none text-gray-700 whitespace-nowrap transition hover:border-[#cfcfcf] hover:bg-[#f7f7f7]"
                        >
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#cfcfcf] text-[9px] text-gray-600">
                                <FiShoppingCart />
                            </span>
                            Thêm vào giỏ
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const MessageContent = ({ text, product, products }) => {
        if (text.includes('/assets/')) {
            const [prefix, imageName] = text.split('/assets/');

            return (
                <>
                    <div>{prefix}</div>
                    <img
                        src={`/assets/${imageName}`}
                        alt="Product"
                        className="mt-2 h-auto w-full rounded-lg"
                    />
                </>
            );
        }

        if (Array.isArray(products) && products.length > 0) {
            return (
                <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2">
                        {products.map((item) => (
                            <ProductCard key={item.id} product={item} compact />
                        ))}
                    </div>
                    <div className="text-[12px] leading-5 text-gray-600">{text}</div>
                </div>
            );
        }

        if (product?.id) {
            const productImage = resolveProductImageSrc(product.image);

            return (
                <div className="space-y-3">
                    <div className="rounded-[18px] border border-[#e9e9e9] bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                        <div className="flex items-start gap-3">
                            {productImage ? (
                                <img
                                    src={productImage}
                                    alt={product.title || 'Product'}
                                    className="h-20 w-20 shrink-0 rounded-xl object-contain bg-[#fbfbfb]"
                                />
                            ) : null}

                            <div className="min-w-0 flex-1">
                                <div className="line-clamp-2 text-[13px] font-medium leading-5 text-gray-900">
                                    {product.title}
                                </div>
                                <div className="mt-1 text-sm font-bold text-[#ff5a1f]">
                                    {formatPrice(product.price)}đ
                                </div>
                                <div className="mt-1 flex items-center gap-1 text-[11px]">
                                    {Number.isFinite(getRatingValue(product)) ? (
                                        <>
                                            <div className="flex items-center gap-0.5 text-[11px] leading-none">
                                                {renderStars(getRatingValue(product))}
                                            </div>
                                            <span className="text-gray-700 font-medium">{formatRatingValue(getRatingValue(product))}</span>
                                            <span className="text-gray-500">({formatReviewCount(getReviewCount(product))})</span>
                                        </>
                                    ) : (
                                        <span className="text-gray-500">Chưa có đánh giá</span>
                                    )}
                                </div>
                                {product.originalprice ? (
                                    <div className="text-[11px] text-gray-400 line-through">
                                        {formatPrice(product.originalprice)}đ
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                addToCart(product);
                                setResponses((prev) => [
                                    ...prev,
                                    {
                                        text: `Đã thêm ${product.title} vào giỏ hàng.`,
                                        isUser: false,
                                    },
                                ]);
                            }}
                            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-[#d9d9d9] bg-white px-2.5 py-1.5 text-[12px] font-medium text-gray-700 transition hover:border-[#cfcfcf] hover:bg-[#f7f7f7]"
                        >
                            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-[#cfcfcf] text-[10px] text-gray-600">
                                <FiShoppingCart />
                            </span>
                            Thêm vào giỏ
                        </button>
                    </div>

                    <div className="text-[12px] leading-5 text-gray-600">{text}</div>
                </div>
            );
        }

        return <div>{text}</div>;
    };

    const ChatAvatar = ({ isUser }) => {
        if (isUser) return null;

        return (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#ffd400] shadow-sm border border-white/80">
                <img src="/assets/chatbot.png" alt="bot" className="h-5 w-5 rounded-full object-cover" />
            </div>
        );
    };

    return (
        <div>
            {!isOpen && (
                <div className="fixed bottom-24 right-6 z-40 max-w-[240px] rounded-[22px] border border-[#e9e9e9] bg-white px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.12)] backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#ffd400] to-[#ffdd66]">
                            <img src="/assets/chatbot.png" alt="Chatbot" className="h-6 w-6 rounded-full object-cover" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900">Trợ lý TechWorld</p>
                            <p className="mt-1 text-xs leading-5 text-gray-600">
                                Xin chào Anh/Chị!
                                <br />
                                Em rất sẵn lòng hỗ trợ.
                            </p>
                        </div>
                    </div>
                    <div className="absolute -bottom-1 right-8 h-3 w-3 rotate-45 border-r border-b border-[#e7e7e7] bg-white" />
                </div>
            )}

            <button
                onClick={handleToggle}
                className="fixed bottom-6 right-6 z-50 h-16 w-16 overflow-hidden rounded-full border border-[#f0c400] bg-gradient-to-br from-[#ffd400] to-[#ffde59] shadow-[0_12px_34px_rgba(0,0,0,0.18)] transition-all duration-300 ease-in-out hover:scale-110"
            >
                <img src="/assets/chatbot.png" alt="Chatbot" className="h-14 w-14 rounded-full object-cover" />
            </button>

            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 flex h-[560px] w-[min(430px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[30px] border border-[#e3e3e3] bg-[#f6f6f8] shadow-[0_24px_70px_rgba(15,23,42,0.25)]">
                    <div className="flex items-center justify-between bg-gradient-to-r from-[#343a40] via-[#4d4d4d] to-[#5a5a5a] px-4 py-3 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#ffd400]">
                                <img src="/assets/chatbot.png" alt="Chatbot" className="h-7 w-7 rounded-full object-cover" />
                            </div>
                            <div>
                                <h3 className="text-[15px] font-semibold leading-tight">Thế giới công nghệ</h3>
                                <p className="text-[11px] text-white/70">Tìm sản phẩm trong hệ thống</p>
                            </div>
                        </div>

                        <button onClick={handleToggle} className="rounded-full p-1.5 text-white/90 transition hover:bg-white/10 hover:text-white">
                            <IoMdClose />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),rgba(246,246,248,1))] px-4 py-4">
                        <div className="space-y-3">
                            {responses.map((res, index) => {
                                const hasProductContent = !res.isUser && (
                                    (Array.isArray(res.products) && res.products.length > 0)
                                    || !!res.product?.id
                                );

                                return (
                                <div key={index} className={`flex items-end gap-2 ${res.isUser ? 'justify-end' : 'justify-start'}`}>
                                    {!res.isUser && <ChatAvatar isUser={false} />}

                                    <div
                                        className={`text-sm leading-6 ${
                                            res.isUser
                                                ? 'max-w-[86%] rounded-[20px] rounded-br-md bg-[#ffd400] px-4 py-3 text-gray-900 shadow-sm'
                                                : hasProductContent
                                                    ? 'max-w-[92%] bg-transparent p-0 text-gray-800 shadow-none'
                                                    : 'max-w-[86%] rounded-[20px] rounded-bl-md border border-[#ececec] bg-white px-4 py-3 text-gray-800 shadow-sm'
                                        }`}
                                    >
                                        <MessageContent text={res.text} product={res.product} products={res.products} />
                                    </div>

                                    {res.isUser && (
                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4f8cff] text-[10px] font-bold text-white shadow-sm">
                                            <span>AI</span>
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    <div className="border-t border-[#dedede] bg-[#f8f8f8] px-4 py-3">
                        <div className="flex items-center gap-2 rounded-full border border-[#d8d8d8] bg-white px-3 py-2 shadow-[inset_0_1px_2px_rgba(15,23,42,0.05)]">
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="Nhập tin nhắn..."
                                className="min-w-0 flex-1 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-gray-400"
                            />
                            <button
                                onClick={handleSendMessage}
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d9d9d9] text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                            >
                                <FiSend />
                            </button>
                        </div>

                        <p className="mt-2 px-2 text-center text-[11px] text-gray-500">
                            Thông tin chỉ mang tính tham khảo, được tư vấn bởi Trí Tuệ Nhân Tạo
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatBotIcon;
