import React from "react";
import { Link, useNavigate } from "react-router-dom";

const formatPrice = (price) => {
    const numPrice = Math.floor(parseFloat(price));
    return numPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const CartItem = ({ id, image, title, originalprice, price, discount }) => {
    const navigate = useNavigate();

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
        /* Giữ shadow-md, rounded-lg, p-3. Thêm flex flex-col h-full để nút luôn nằm dưới */
        <div className="bg-white shadow-md rounded-lg p-3 w-full flex flex-col h-full transition hover:shadow-lg">
            
            <Link to={`/product/${id}`} className="block">
                {/* Giảm h-40 xuống h-32 để khung ảnh nhỏ lại, xích chữ lên trên */}
                <div className="w-full h-32 flex items-center justify-center mb-1">
                    <img
                        src={image}
                        alt={title}
                        className="max-h-full max-w-full object-contain cursor-pointer hover:opacity-90 transition"
                    />
                </div>
            </Link>

            <div className="flex flex-col flex-grow">
                {/* Giữ nguyên text-sm font-medium, giảm mb-2 xuống mb-1 để xích lại */}
                <h2 className="text-sm font-medium mb-1 line-clamp-2 h-10 leading-tight">
                    {title}
                </h2>

                {/* Giữ nguyên text-xs text-gray-500 mb-2 */}
                <div className="text-xs text-gray-500 mb-1 font-normal">
                    Quad HD+ (2K+)
                </div>

                {/* Giữ nguyên màu đỏ và font bold của bạn */}
                <div className="mb-1 leading-tight">
                    <div className="text-red-600 text-base font-bold">
                        {formatPrice(price)}₫
                    </div>
                    <div className="text-gray-400 line-through text-xs">
                        {formatPrice(originalprice)}₫
                    </div>
                </div>

                {/* Giữ nguyên text-orange-500 text-xs font-medium */}
                <div className="text-orange-500 text-xs font-medium mb-1">
                    Giảm giá {discount}.000₫
                </div>

                {/* Giữ nguyên text-xs text-gray-600 */}
                <div className="flex items-center text-xs text-gray-600 mb-2">
                    <span className="text-yellow-500">★</span>
                    <span className="ml-1">4.4 • Đã bán 14k</span>
                </div>

                {/* Đưa nút Mua Ngay lên ngang hàng với nhãn Bán chạy bên phải */}
                <div className="mt-auto flex items-center justify-between gap-1">
                    <span className="text-[10px] text-orange-600 bg-orange-100 px-2 py-1 rounded font-normal whitespace-nowrap">
                        Bán chạy
                    </span>

                    <button
                        onClick={handleBuyNow}
                        /* Giữ nguyên màu bg-red-500 và font chữ của bạn */
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