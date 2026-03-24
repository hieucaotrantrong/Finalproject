import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import Home from "./Home";
import Footers from "./Footers";

const STORE_REGION = "central";

const REGION_LABELS = {
    north: "Miền Bắc",
    central: "Miền Trung",
    south: "Miền Nam"
};

const SHIPPING_FEE_BY_REGION = {
    north: 40000,
    central: 20000,
    south: 30000
};

const REGION_PROVINCE_CSV = {
    north: "Lào Cai,Yên Bái,Điện Biên,Hòa Bình,Lai Châu,Sơn La,Hà Giang,Cao Bằng,Bắc Kạn,Lạng Sơn,Tuyên Quang,Thái Nguyên,Phú Thọ,Bắc Giang,Quảng Ninh,Hà Nội,Vĩnh Phúc,Bắc Ninh,Hải Dương,Hải Phòng,Hưng Yên,Hà Nam,Nam Định,Thái Bình,Ninh Bình",
    central: "Thanh Hóa,Nghệ An,Hà Tĩnh,Quảng Bình,Quảng Trị,Thừa Thiên - Huế,Đà Nẵng,Quảng Nam,Quảng Ngãi,Bình Định,Phú Yên,Khánh Hòa,Ninh Thuận,Bình Thuận,Kon Tum,Gia Lai,Đắk Lắk,Đắk Nông,Lâm Đồng",
    south: "TP. Hồ Chí Minh,Đồng Nai,Bà Rịa - Vũng Tàu,Bình Dương,Bình Phước,Tây Ninh,Cần Thơ,Long An,Tiền Giang,Bến Tre,Vĩnh Long,Trà Vinh,Hậu Giang,Sóc Trăng,Đồng Tháp,An Giang,Kiên Giang,Bạc Liêu,Cà Mau"
};

const normalizeProvince = (value = "") => {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/tp\.?/g, "thanh pho")
    .replace(/thanh pho\s*ho\s*chi\s*minh/g, "ho chi minh")
    .replace(/thanh pho\s*ha\s*noi/g, "ha noi")
    .replace(/thanh pho/g, "")
        .replace(/tinh/g, "")
        .replace(/-/g, " ")
    .replace(/\./g, " ")
        .replace(/\s+/g, " ")
        .trim();
};

const REGION_BY_PROVINCE = Object.entries(REGION_PROVINCE_CSV).reduce((acc, [region, csv]) => {
    csv.split(",").forEach((name) => {
        acc[normalizeProvince(name)] = region;
    });
    return acc;
}, {});

const detectRegionFromAddress = (address = "", provinces = []) => {
    const normalizedAddress = normalizeProvince(address);
    if (!normalizedAddress) return null;

    const addressParts = normalizedAddress
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);

    const candidates = [
        normalizedAddress,
        ...addressParts,
        ...addressParts.slice(-2).map((part) => part)
    ];

    const matchedProvince = provinces.find((province) => {
        const provinceName = normalizeProvince(province.name || "");
        return candidates.some((candidate) =>
            candidate.includes(provinceName) || provinceName.includes(candidate)
        );
    });

    if (!matchedProvince?.name) return null;
    return REGION_BY_PROVINCE[normalizeProvince(matchedProvince.name)] || null;
};

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
    const [shippingFee, setShippingFee] = useState(0);
    const [customerRegion, setCustomerRegion] = useState(null);
    const [provinces, setProvinces] = useState([]);
    const lastSyncedAddressRef = useRef("");

    const syncAddressFromStorage = () => {
        const latest = localStorage.getItem('userAddress') || '';
        if (!latest || latest === lastSyncedAddressRef.current) {
            return;
        }

        lastSyncedAddressRef.current = latest;
        setAddress(latest);
    };

    // Load địa chỉ từ localStorage nếu không có trong state
    useEffect(() => {
        const savedAddress = localStorage.getItem('userAddress');
        if (savedAddress) {
            setAddress(savedAddress);
            lastSyncedAddressRef.current = savedAddress;
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

        axios.get('https://provinces.open-api.vn/api/p/')
            .then((response) => {
                setProvinces(response.data || []);
            })
            .catch(() => setProvinces([]));
    }, []);

    useEffect(() => {
        const interval = setInterval(syncAddressFromStorage, 600);

        const handleFocus = () => {
            syncAddressFromStorage();
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleFocus);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleFocus);
        };
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

    const getGrandTotal = () => {
        return getTotalAmount() + shippingFee;
    };

    useEffect(() => {
        const region = detectRegionFromAddress(address, provinces);
        setCustomerRegion(region);
        setShippingFee(region ? SHIPPING_FEE_BY_REGION[region] || 0 : 0);
    }, [address, provinces]);

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
            const totalAmount = getGrandTotal();
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
                        paymentMethod,
                        shippingFee,
                        shippingRegion: customerRegion,
                        storeRegion: STORE_REGION
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
                    paymentMethod,
                    shippingFee,
                    shippingRegion: customerRegion,
                    storeRegion: STORE_REGION
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
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-base text-gray-700">Tạm tính hàng:</span>
                                    <span className="font-semibold">{formatPrice(getTotalAmount())}₫</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-base text-gray-700">Phí vận chuyển:</span>
                                    <span className="font-semibold text-orange-600">{formatPrice(shippingFee)}₫</span>
                                </div>
                                <div className="text-sm text-gray-600 mb-3">
                                    Kho gửi: {REGION_LABELS[STORE_REGION]} | Khu vực nhận: {customerRegion ? REGION_LABELS[customerRegion] : "Chưa xác định tỉnh/thành"}
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-semibold">Tổng thanh toán:</span>
                                    <span className="text-2xl font-bold text-red-600">
                                        {formatPrice(getGrandTotal())}₫
                                    </span>
                                </div>
                                {paymentMethod === "wallet" && wallet && wallet.balance >= getGrandTotal() && (
                                    <div className="mt-2 text-sm text-gray-600">
                                        Số dư còn lại sau thanh toán: <span className="font-semibold text-green-600">
                                            {formatPrice(wallet.balance - getGrandTotal())}₫
                                        </span>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleOrder}
                                className={`w-full ${isLoading || (paymentMethod === "wallet" && wallet && wallet.balance < getGrandTotal())
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-red-500 hover:bg-red-600'
                                    } text-white py-3 rounded-md text-lg transition-colors`}
                                disabled={isLoading || (paymentMethod === "wallet" && wallet && wallet.balance < getGrandTotal())}
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



















