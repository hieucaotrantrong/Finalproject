import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import Home from './Home';
import Footers from './Footers';

const CartPageView = () => {
    const navigate = useNavigate();

    const {
        cartItems,
        updateQuantity,
        removeFromCart,
        getTotalPrice,
        clearCart
    } = useCart();

    const formatPrice = (price) => {
        const numPrice = Math.floor(parseFloat(price));
        return numPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };
/*------------------------------------------
check login before payment
---------------------------------------------*/
   
    const handleCheckout = () => {

        const token = sessionStorage.getItem("token");

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
/*------------------------------------------
if logged in, proceed to payment
---------------------------------------------*/
   
        navigate('/cartpay', {
            state: {
                cartItems: cartItems,
                totalPrice: getTotalPrice(),
                isMultipleItems: true
            }
        });
    };

    return (

        <div className="min-h-screen bg-[#f1f2f4]">

            <Home />

            <div className="px-4 py-6">
                <div className="mx-auto w-full max-w-[760px]">


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

                    <div className="space-y-4">

                        {/* danh sách sản phẩm */}

                        <div>

                            <div className="bg-[#f6f7f8] rounded-xl border border-[#e3e5e8] p-4 shadow-sm">

                                <div className="pb-3 border-b border-[#e3e5e8] flex items-center justify-between">

                                    <h3 className="text-[15px] font-medium text-gray-900">
                                        Sản phẩm ({cartItems.length})
                                    </h3>

                                    <button
                                        onClick={clearCart}
                                        className="text-[14px] font-medium text-[#ff7a00] hover:text-[#e56f00]"
                                    >
                                        Xóa tất cả
                                    </button>

                                </div>

                                <div className="divide-y divide-[#e3e5e8]">

                                    {cartItems.map((item) => (

                                        <div key={item.id} className="py-3 flex gap-3">

                                            <img
                                                src={item.image}
                                                alt={item.title}
                                                className="w-16 h-16 object-contain border border-[#e3e5e8] rounded"
                                            />

                                            <div className="flex-1">

                                                <h4 className="text-[15px] font-medium text-gray-800 mb-1">
                                                    {item.title}
                                                </h4>

                                                <p className="text-yellow-500 font-medium text-[16px]">
                                                    {formatPrice(item.price)}₫
                                                </p>

                                            </div>

                                            <div className="flex flex-col items-end gap-2">

                                                <button
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="text-gray-400 hover:text-[#ff7a00]"
                                                >
                                                    ✕
                                                </button>

                                                <div className="flex border border-[#d9dce1] rounded-md bg-white">

                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                        className="w-8 text-gray-700 hover:text-[#ff7a00]"
                                                    >
                                                        -
                                                    </button>

                                                    <span className="w-10 text-center text-[14px] text-gray-700">
                                                        {item.quantity}
                                                    </span>

                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                        className="w-8 text-gray-700 hover:text-[#ff7a00]"
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

                        <div className="bg-[#f6f7f8] rounded-xl border border-[#e3e5e8] p-4 shadow-sm">

                                <h3 className="text-[15px] font-medium text-black mb-3">
                                    Tóm tắt đơn hàng
                                </h3>

                                <div className="space-y-3 mb-4">

                                    <div className="flex justify-between text-[14px] text-gray-700">
                                        <span>Tạm tính</span>
                                        <span className="font-medium">{formatPrice(getTotalPrice())}₫</span>
                                    </div>

                                    <div className="flex justify-between text-[14px] text-gray-700">
                                        <span>Phí vận chuyển</span>
                                        <span className="font-medium text-gray-500">
                                            Chưa bao gồm chi phí vận chuyển
                                        </span>
                                    </div>

                                    <hr className="border-[#e3e5e8]" />

                                    <div className="flex justify-between text-[18px] font-medium">
                                        <span>Tổng cộng</span>
                                        <span className="text-black">
                                            {formatPrice(getTotalPrice())}₫
                                        </span>
                                    </div>

                                </div>

                                {/* nút thanh toán */}

                                <button
                                    onClick={handleCheckout}
                                    className="w-full bg-[#ff7a00] hover:bg-[#e56f00] text-white font-medium py-2.5 rounded-lg mb-3 transition-colors"
                                >
                                    Thanh toán
                                </button>

                                <button
                                    onClick={() => navigate('/home')}
                                    className="w-full border border-[#d9dce1] bg-white py-2.5 rounded-lg text-gray-700 hover:border-[#ff7a00] hover:text-[#ff7a00] transition-colors"
                                >
                                    Tiếp tục mua sắm
                                </button>

                            </div>

                    </div>

                )}

                </div>
            </div>

            <Footers />

        </div>

    );

};

export default CartPageView;