import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import Home from "./Home";
import Footers from "./Footers";

const CartPayPage = () => {
    const location = useLocation();
    const { cartItems, totalPrice, isMultipleItems, ...product } = location.state || {};

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState(product?.userAddress || "");
    const [isLoading, setIsLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("cod"); // "cod" hoặc "wallet"
    const [wallet, setWallet] = useState(null);

    // Load địa chỉ từ localStorage nếu không có trong state
    useEffect(() => {
        const savedAddress = localStorage.getItem('userAddress');
        if (savedAddress) {
            setAddress(savedAddress);
        }

        const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const savedEmail = localStorage.getItem('userEmail') || savedUser?.email || '';
        const savedName = [savedUser?.first_name, savedUser?.last_name].filter(Boolean).join(' ').trim();

        if (savedEmail) {
            setEmail(savedEmail);
            localStorage.setItem('userEmail', savedEmail);
        }

        if (savedName) {
            setFullName(savedName);
        }

        fetchWalletInfo();
    }, []);

    const fetchWalletInfo = async () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const response = await axios.get('http://localhost:5000/api/wallet', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setWallet(response.data.wallet);
            }
        } catch (error) {
            console.error('Lỗi lấy thông tin ví:', error);
        }
    };

    const formatPrice = (price) => {
        const numPrice = Math.floor(parseFloat(price));
        return numPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    const getTotalAmount = () => {
        return isMultipleItems ? totalPrice : product?.price;
    };

    const handleOrder = async () => {
        if (!fullName || !phone || !address || !email) {
            alert("Vui lòng điền đầy đủ thông tin.");
            return;
        }

        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phone)) {
            alert("Số điện thoại không hợp lệ.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert("Email không hợp lệ.");
            return;
        }

        // Kiểm tra số dư ví nếu chọn thanh toán bằng ví
        if (paymentMethod === "wallet") {
            const totalAmount = getTotalAmount();
            if (!wallet || wallet.balance < totalAmount) {
                alert("Số dư ví không đủ để thanh toán. Vui lòng nạp thêm tiền hoặc chọn thanh toán khi nhận hàng.");
                return;
            }
        }

        setIsLoading(true);

        try {
            const token = localStorage.getItem('token'); // Thêm dòng này

            if (isMultipleItems) {
                // Xử lý nhiều sản phẩm
                for (const item of cartItems) {
                    await axios.post("http://localhost:5000/api/orders", {
                        fullName,
                        email,
                        phone,
                        address,
                        productId: item.id,
                        productTitle: item.title,
                        productPrice: item.price,
                        quantity: item.quantity,
                        paymentMethod
                    }, {
                        headers: {
                            'Authorization': `Bearer ${token}` // Thêm header
                        }
                    });
                }
            } else {
                // Xử lý 1 sản phẩm
                await axios.post("http://localhost:5000/api/orders", {
                    fullName,
                    email,
                    phone,
                    address,
                    productId: product.id,
                    productTitle: product.title,
                    productPrice: product.price,
                    paymentMethod
                }, {
                    headers: {
                        'Authorization': `Bearer ${token}` // Thêm header
                    }
                });
            }

            alert(paymentMethod === "wallet"
                ? "Đặt hàng và thanh toán thành công! Số tiền đã được trừ từ ví."
                : "Đặt hàng thành công! Bạn sẽ thanh toán khi nhận hàng."
            );

            setFullName("");
            setEmail("");
            setPhone("");
            setAddress("");

            // Refresh wallet info nếu thanh toán bằng ví
            if (paymentMethod === "wallet") {
                fetchWalletInfo();
            }
        } catch (err) {
            console.error('Chi tiết lỗi:', err.response?.data); // Xem lỗi chi tiết
            alert("Đặt hàng thất bại. Vui lòng thử lại.");
        } finally {
            setIsLoading(false);
        }
    };

    const displayData = isMultipleItems ? {
        title: `Đơn hàng (${cartItems?.length} sản phẩm)`,
        price: totalPrice,
        image: cartItems?.[0]?.image
    } : product;

    return (
        <div className="min-h-screen bg-gray-50">
            <Home />

            <div className="p-4 max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-6 text-center">Thanh Toán Đơn Hàng</h1>

                <div className="flex gap-12">
                    {/* Hiển thị sản phẩm */}
                    <div className="w-1/2">
                        {isMultipleItems ? (
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <h3 className="text-xl font-semibold mb-4">Danh sách sản phẩm ({cartItems?.length})</h3>
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                    {cartItems?.map((item) => (
                                        <div key={item.id} className="flex gap-4 p-4 border rounded-lg">
                                            <img
                                                src={item.image}
                                                alt={item.title}
                                                className="w-20 h-20 object-contain rounded"
                                            />
                                            <div className="flex-1">
                                                <h4 className="font-medium text-sm">{item.title}</h4>
                                                <p className="text-red-600 font-bold">{formatPrice(item.price)}₫</p>
                                                <p className="text-gray-600 text-sm">Số lượng: {item.quantity}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 pt-4 border-t">
                                    <div className="flex justify-between text-xl font-bold">
                                        <span>Tổng cộng:</span>
                                        <span className="text-red-600">
                                            {formatPrice(totalPrice)}₫
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <img
                                src={product?.image}
                                alt={product?.title}
                                className="w-full rounded-lg shadow-lg"
                            />
                        )}
                    </div>

                    {/* Form thông tin */}
                    <div className="w-1/2 bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold mb-4">
                            {isMultipleItems ? `Đơn hàng (${cartItems?.length} sản phẩm)` : product?.title}
                        </h2>

                        {!isMultipleItems && (
                            <div className="flex items-center gap-4 mb-4">
                                <span className="text-red-500 text-2xl font-bold">{formatPrice(product?.price)}₫</span>
                            </div>
                        )}

                        {/* Form nhập thông tin */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-lg font-medium mb-2">Họ và tên</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border rounded-md shadow-sm"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-lg font-medium mb-2">Email</label>
                                <input
                                    type="email"
                                    className="w-full p-3 border rounded-md shadow-sm"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-lg font-medium mb-2">Số điện thoại</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border rounded-md shadow-sm"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-lg font-medium mb-2">Địa chỉ nhận hàng</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border rounded-md shadow-sm"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                />
                            </div>

                            {/* Phương thức thanh toán */}
                            <div>
                                <label className="block text-lg font-medium mb-4">Phương thức thanh toán</label>
                                <div className="space-y-3">
                                    {/* Thanh toán khi nhận hàng */}
                                    <div
                                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${paymentMethod === "cod"
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:border-gray-300"
                                            }`}
                                        onClick={() => setPaymentMethod("cod")}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value="cod"
                                                checked={paymentMethod === "cod"}
                                                onChange={() => setPaymentMethod("cod")}
                                                className="w-4 h-4 text-blue-600"
                                            />
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                                    <span className="text-green-600 text-lg">💵</span>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-800">Thanh toán khi nhận hàng</p>
                                                    <p className="text-sm text-gray-600">Thanh toán bằng tiền mặt khi nhận được sản phẩm</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Thanh toán bằng ví */}
                                    <div
                                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${paymentMethod === "wallet"
                                            ? "border-purple-500 bg-purple-50"
                                            : "border-gray-200 hover:border-gray-300"
                                            }`}
                                        onClick={() => setPaymentMethod("wallet")}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value="wallet"
                                                checked={paymentMethod === "wallet"}
                                                onChange={() => setPaymentMethod("wallet")}
                                                className="w-4 h-4 text-purple-600"
                                            />
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                                    <span className="text-purple-600 text-lg">💳</span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-800">Thanh toán bằng ví điện tử</p>
                                                    <p className="text-sm text-gray-600">
                                                        Số dư hiện tại: <span className="font-semibold text-purple-600">
                                                            {formatPrice(wallet?.balance || 0)}₫
                                                        </span>
                                                    </p>
                                                </div>
                                                {wallet && wallet.balance < getTotalAmount() && (
                                                    <div className="text-red-500 text-sm font-medium">
                                                        Không đủ số dư
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tổng thanh toán */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-semibold">Tổng thanh toán:</span>
                                    <span className="text-2xl font-bold text-red-600">
                                        {formatPrice(getTotalAmount())}₫
                                    </span>
                                </div>
                                {paymentMethod === "wallet" && wallet && wallet.balance >= getTotalAmount() && (
                                    <div className="mt-2 text-sm text-gray-600">
                                        Số dư còn lại sau thanh toán: <span className="font-semibold text-green-600">
                                            {formatPrice(wallet.balance - getTotalAmount())}₫
                                        </span>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleOrder}
                                className={`w-full ${isLoading || (paymentMethod === "wallet" && wallet && wallet.balance < getTotalAmount())
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-red-500 hover:bg-red-600'
                                    } text-white py-3 rounded-md text-lg transition-colors`}
                                disabled={isLoading || (paymentMethod === "wallet" && wallet && wallet.balance < getTotalAmount())}
                            >
                                {isLoading ? 'Đang xử lý...' : 'Xác Nhận Đặt Hàng'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <Footers />
        </div>
    );
};

export default CartPayPage;



















