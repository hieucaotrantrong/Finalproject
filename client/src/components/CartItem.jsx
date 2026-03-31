import React from "react";
import { Link, useNavigate } from "react-router-dom";

const formatPrice = (price) => {
    const numPrice = Math.floor(parseFloat(price));
    return numPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// 🔥 thêm format sold
const formatSold = (num) => {
    if (!num) return 0;
    if (num >= 1000) return (num / 1000).toFixed(1) + "k";
    return num;
};

const formatRating = (num) => {
    const parsed = Number(num);
    if (Number.isNaN(parsed) || parsed <= 0) return "0.0";
    return parsed.toFixed(1);
};

// 🔥 thêm sold vào props
const CartItem = ({ id, image, title, originalprice, price, discount, sold, rating, average_rating }) => {
    const navigate = useNavigate();
    const displayRating = rating ?? average_rating;

    const handleBuyNow = () => {
        const token = localStorage.getItem("token");
        const savedAddress = localStorage.getItem('userAddress') || '';

        const productState = {
            id,
            image,
            title,
            originalprice,
            price,
            discount,
            userAddress: savedAddress
        };

        if (!token) {
            alert("Vui lòng đăng nhập để mua hàng");
            navigate("/login", {
                state: {
                    redirect: "/cartpay",
                    product: productState
                }
            });
            return;
        }

        navigate("/cartpay", {
            state: productState
        });
    };

    return (
        <div className="bg-white shadow-md rounded-lg p-3 w-full flex flex-col h-full transition hover:shadow-lg">
            
            <Link to={`/product/${id}`} className="block">
                <div className="w-full h-32 flex items-center justify-center mb-1">
                    <img
                        src={image}
                        alt={title}
                        className="max-h-full max-w-full object-contain cursor-pointer hover:opacity-90 transition"
                    />
                </div>
            </Link>

            <div className="flex flex-col flex-grow">
                <h2 className="text-sm font-medium mb-1 line-clamp-2 h-10 leading-tight">
                    {title}
                </h2>

                <div className="text-xs text-gray-500 mb-1 font-normal">
                    Quad HD+ (2K+)
                </div>

                <div className="mb-1 leading-tight">
                    <div className="text-red-600 text-base font-bold">
                        {formatPrice(price)}₫
                    </div>
                    <div className="text-gray-400 line-through text-xs">
                        {formatPrice(originalprice)}₫
                    </div>
                </div>

                <div className="text-orange-500 text-xs font-medium mb-1">
                    Giảm giá {Number(discount)}%
                </div>

                {/* 🔥 CHỖ ĐÃ SỬA */}
                <div className="flex items-center text-xs text-gray-600 mb-2">
                    <span className="text-yellow-500">★</span>
                    <span className="ml-1">
                        {formatRating(displayRating)} • Đã bán {formatSold(sold)}
                    </span>
                </div>

                <div className="mt-auto flex items-center justify-between gap-1">
                    <span className="text-[10px] text-orange-600 bg-orange-100 px-2 py-1 rounded font-normal whitespace-nowrap">
                        Bán chạy
                    </span>

                    <button
                        onClick={handleBuyNow}
                        className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 text-xs rounded transition whitespace-nowrap"
                    >
                        Mua Ngay
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CartItem;