import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import Home from './Home';
import Footers from './Footers';
import Carousel from './Carousel';

const SIDE_PREFIX = "side::";

const isSideBanner = (imageUrl = "") => imageUrl.startsWith(SIDE_PREFIX);
const toDisplayImageUrl = (imageUrl = "") => imageUrl.replace(SIDE_PREFIX, "");

const CartPageView = () => {
    const [sideBanner, setSideBanner] = useState(null);
    const navigate = useNavigate();

    const {
        cartItems,
        updateQuantity,
        removeFromCart,
        getTotalPrice,
        clearCart
    } = useCart();

    useEffect(() => {
        fetch("http://localhost:5000/api/banners")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const firstSideBanner = data.find((item) => isSideBanner(item.image_url));
                    setSideBanner(firstSideBanner || null);
                }
            })
            .catch(err => console.log("Lỗi fetch banner:", err));
    }, []);

    const resolveBannerSrc = (banner) => {
        const cleanImageUrl = toDisplayImageUrl(banner?.image_url || "");

        if (!cleanImageUrl) {
            return "/assets/bannerngang.png";
        }

        if (
            cleanImageUrl.startsWith("http://") ||
            cleanImageUrl.startsWith("https://") ||
            cleanImageUrl.startsWith("/")
        ) {
            return cleanImageUrl;
        }

        return `/assets/${cleanImageUrl}`;
    };

    const sideBannerSrc = resolveBannerSrc(sideBanner);

    const formatPrice = (price) => {
        const numPrice = Math.floor(parseFloat(price));
        return numPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    // 🔐 kiểm tra login trước khi thanh toán
    const handleCheckout = () => {

        const token = localStorage.getItem("token");

        if (!token) {
            alert("Vui lòng đăng nhập để thanh toán");

            navigate("/login", {
                state: {
                    redirect: "/cartpay",
                    cartItems: cartItems,
                    totalPrice: getTotalPrice()
                }
            });

            return;
        }

        // nếu đã login
        navigate('/cartpay', {
            state: {
                cartItems: cartItems,
                totalPrice: getTotalPrice(),
                isMultipleItems: true
            }
        });
    };

    return (

        <div className="min-h-screen bg-gray-50">

            <Home />

            {/* Side Banners */}
            <div className="hidden xl:block fixed left-3 top-[190px] z-40">
                <img
                    src={sideBannerSrc}
                    alt="Left side banner"
                    className="w-[110px] h-[330px] rounded-lg object-cover"
                />
            </div>

            <div className="hidden xl:block fixed right-3 top-[190px] z-40">
                <img
                    src={sideBannerSrc}
                    alt="Right side banner"
                    className="w-[110px] h-[330px] rounded-lg object-cover"
                />
            </div>

            {/* Carousel Banner */}
            <Carousel />

            <div className="max-w-6xl mx-auto px-4 py-8">


                {cartItems.length === 0 ? (

                    <div className="text-center py-16">

                        <h2 className="text-2xl font-semibold text-gray-600 mb-4">
                            Giỏ hàng trống
                        </h2>

                        <button
                            onClick={() => navigate('/home')}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-medium"
                        >
                            Về trang chủ
                        </button>

                    </div>

                ) : (

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* danh sách sản phẩm */}

                        <div className="lg:col-span-2">

                            <div className="bg-white rounded-lg shadow-sm">

                                <div className="p-6 border-b flex justify-between">

                                    <h3 className="text-lg font-semibold">
                                        Sản phẩm ({cartItems.length})
                                    </h3>

                                    <button
                                        onClick={clearCart}
                                        className="text-red-500"
                                    >
                                        Xóa tất cả
                                    </button>

                                </div>

                                <div className="divide-y">

                                    {cartItems.map((item) => (

                                        <div key={item.id} className="p-6 flex gap-4">

                                            <img
                                                src={item.image}
                                                alt={item.title}
                                                className="w-20 h-20 object-contain border"
                                            />

                                            <div className="flex-1">

                                                <h4 className="font-medium mb-2">
                                                    {item.title}
                                                </h4>

                                                <p className="text-red-600 font-bold">
                                                    {formatPrice(item.price)}₫
                                                </p>

                                            </div>

                                            <div className="flex flex-col items-end gap-3">

                                                <button
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="text-gray-400 hover:text-red-500"
                                                >
                                                    ✕
                                                </button>

                                                <div className="flex border rounded">

                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                        className="w-8"
                                                    >
                                                        -
                                                    </button>

                                                    <span className="w-10 text-center">
                                                        {item.quantity}
                                                    </span>

                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                        className="w-8"
                                                    >
                                                        +
                                                    </button>

                                                </div>

                                            </div>

                                        </div>

                                    ))}

                                </div>

                            </div>

                        </div>

                        {/* tóm tắt đơn hàng */}

                        <div>

                            <div className="bg-white rounded-lg shadow-sm p-6">

                                <h3 className="text-lg font-semibold mb-4">
                                    Tóm tắt đơn hàng
                                </h3>

                                <div className="space-y-3 mb-4">

                                    <div className="flex justify-between">
                                        <span>Tạm tính</span>
                                        <span>{formatPrice(getTotalPrice())}₫</span>
                                    </div>

                                    <div className="flex justify-between">
                                        <span>Phí vận chuyển</span>
                                        <span className="text-green-600">
                                            Chưa bao gồm chi phí vận chuyển
                                        </span>
                                    </div>

                                    <hr />

                                    <div className="flex justify-between font-bold text-lg">
                                        <span>Tổng cộng</span>
                                        <span className="text-red-600">
                                            {formatPrice(getTotalPrice())}₫
                                        </span>
                                    </div>

                                </div>

                                {/* nút thanh toán */}

                                <button
                                    onClick={handleCheckout}
                                    className="w-full bg-[#ffd400] hover:bg-yellow-500 text-black font-medium py-3 rounded-lg mb-3"
                                >
                                    Thanh toán
                                </button>

                                <button
                                    onClick={() => navigate('/home')}
                                    className="w-full border border-gray-300 py-3 rounded-lg"
                                >
                                    Tiếp tục mua sắm
                                </button>

                            </div>

                        </div>

                    </div>

                )}

            </div>

            <Footers />

        </div>

    );

};

export default CartPageView;