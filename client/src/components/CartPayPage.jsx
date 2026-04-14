import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Home from "./Home";
import Footers from "./Footers";
import Carousel from "./Carousel";
import { useCart } from "../context/CartContext";

const API_BASE_URL = "http://localhost:5000/api";

const SIDE_PREFIX = "side::";

const isSideBanner = (imageUrl = "") => imageUrl.startsWith(SIDE_PREFIX);
const toDisplayImageUrl = (imageUrl = "") => imageUrl.replace(SIDE_PREFIX, "");

const normalizeLocationText = (value = "") => {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/-/g, " ")
        .replace(/\./g, " ")
        .replace(/^\s*(thanh pho|tp|quan|q|huyen|h|thi xa|tx|thi tran|tt|phuong|p|xa|x|tinh)\s+/g, "")
        .replace(/\s+/g, " ")
        .trim();
};

const findBestLocationMatch = (items = [], getName, target = "") => {
    const normalizedTarget = normalizeLocationText(target);
    if (!normalizedTarget) return null;

    return items.find((item) => {
        const normalizedName = normalizeLocationText(getName(item));
        return (
            normalizedName === normalizedTarget ||
            normalizedName.includes(normalizedTarget) ||
            normalizedTarget.includes(normalizedName)
        );
    }) || null;
};

const parseAddressParts = (address = "") => {
    const parts = address
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);

    if (parts.length < 3) {
        return null;
    }

    return {
        ward: parts[parts.length - 3],
        district: parts[parts.length - 2],
        province: parts[parts.length - 1]
    };
};

const CartPayPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { clearCart } = useCart();
    const { cartItems, totalPrice, isMultipleItems, ...product } = location.state || {};

    const [sideBanner, setSideBanner] = useState(null);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState(product?.userAddress || "");
    const [isLoading, setIsLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("cod"); // "cod" hoặc "momo" hoặc "vnpay"
    const [shippingFee, setShippingFee] = useState(0);
    const [shippingServiceFee, setShippingServiceFee] = useState(0);
    const [shippingInsuranceFee, setShippingInsuranceFee] = useState(0);
    const [shippingFeeStatus, setShippingFeeStatus] = useState("idle");
    const [shippingFeeMessage, setShippingFeeMessage] = useState("");
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);
    const [selectedProvinceId, setSelectedProvinceId] = useState("");
    const [selectedDistrictId, setSelectedDistrictId] = useState("");
    const [selectedWardCode, setSelectedWardCode] = useState("");
    const [isMetaLoading, setIsMetaLoading] = useState(false);
    const [metaError, setMetaError] = useState("");

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

        loadGhnProvinces();
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

    const loadGhnProvinces = async () => {
        try {
            setIsMetaLoading(true);
            setMetaError("");
            const response = await axios.get(`${API_BASE_URL}/shipping/provinces`);
            setProvinces(response.data?.data || []);
        } catch (error) {
            console.error('Lỗi lấy tỉnh/thành GHN:', error);
            setMetaError("Không tải được danh sách tỉnh/thành để tính phí ship.");
            setProvinces([]);
        } finally {
            setIsMetaLoading(false);
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

    const selectedProvince = provinces.find((item) => String(item.ProvinceID) === String(selectedProvinceId));
    const selectedDistrict = districts.find((item) => String(item.DistrictID) === String(selectedDistrictId));
    const selectedWard = wards.find((item) => String(item.WardCode) === String(selectedWardCode));

    const getEstimatedWeight = () => {
        if (isMultipleItems) {
            const totalQuantity = (cartItems || []).reduce((sum, item) => sum + Number(item.quantity || 1), 0);
            return Math.max(totalQuantity, 1) * 500;
        }

        return 500;
    };

    const cartItemCount = Array.isArray(cartItems) ? cartItems.length : 0;
    const hasMoreThanOneCartItem = Boolean(isMultipleItems) && cartItemCount > 1;

    useEffect(() => {
        if (!address?.trim()) {
            setShippingFee(0);
            setShippingServiceFee(0);
            setShippingInsuranceFee(0);
            setShippingFeeStatus("idle");
            setShippingFeeMessage("Vui lòng nhập địa chỉ nhận hàng để tính phí vận chuyển.");
         
            setMetaError("");
            return;
        }

        if (!provinces.length) {
            setShippingFeeStatus("loading");
            setShippingFeeMessage("Đang tải dữ liệu GHN...");
       
            return;
        }

        const timer = setTimeout(async () => {
            try {
                setIsMetaLoading(true);
                setMetaError("");
                setShippingFeeStatus("loading");
                setShippingFeeMessage("Đang nhận diện địa chỉ và tính phí vận chuyển theo GHN...");
             
                const parsed = parseAddressParts(address);
                if (!parsed) {
                    throw new Error("Địa chỉ cần có dạng: Phường/Xã, Quận/Huyện, Tỉnh/Thành.");
                }

                const province = findBestLocationMatch(provinces, (item) => item.ProvinceName, parsed.province);
                if (!province) {
                    throw new Error("Không nhận diện được tỉnh/thành từ địa chỉ.");
                }

                const districtsResponse = await axios.post(`${API_BASE_URL}/shipping/districts`, {
                    provinceId: Number(province.ProvinceID)
                });

                const districtList = districtsResponse.data?.data || [];
                setDistricts(districtList);

                const district = findBestLocationMatch(districtList, (item) => item.DistrictName, parsed.district);
                if (!district) {
                    throw new Error("Không nhận diện được quận/huyện từ địa chỉ.");
                }

                const wardsResponse = await axios.post(`${API_BASE_URL}/shipping/wards`, {
                    districtId: Number(district.DistrictID)
                });

                const wardList = wardsResponse.data?.data || [];
                setWards(wardList);

                const ward = findBestLocationMatch(wardList, (item) => item.WardName, parsed.ward);
                if (!ward) {
                    throw new Error("Không nhận diện được phường/xã từ địa chỉ.");
                }

                setSelectedProvinceId(String(province.ProvinceID));
                setSelectedDistrictId(String(district.DistrictID));
                setSelectedWardCode(String(ward.WardCode));

                const response = await axios.post(`${API_BASE_URL}/shipping/fee`, {
                    toDistrictId: Number(district.DistrictID),
                    toWardCode: String(ward.WardCode),
                    insuranceValue: Number(getTotalAmount() || 0),
                    weight: getEstimatedWeight(),
                    length: 20,
                    width: 15,
                    height: 10
                });

                const feeBreakdown = response.data?.breakdown || {};
                setShippingFee(Number(response.data?.shippingFee || 0));
                setShippingServiceFee(Number(feeBreakdown.service_fee || 0));
                setShippingInsuranceFee(Number(feeBreakdown.insurance_fee || 0));
                setShippingFeeStatus("success");
           

            } catch (error) {
                console.error('Lỗi tính phí ship GHN:', error);
                setShippingFee(0);
                setShippingServiceFee(0);
                setShippingInsuranceFee(0);
                setShippingFeeStatus("error");
                const errorMessage = error?.response?.data?.message || error?.message || "Không tính được phí GHN.";
                setMetaError(errorMessage);
                setShippingFeeMessage("Không tính được phí GHN. Vui lòng kiểm tra định dạng địa chỉ nhận hàng.");
            } finally {
                setIsMetaLoading(false);
            }
        }, 350);

        return () => clearTimeout(timer);
    }, [address, provinces, totalPrice, product?.price, isMultipleItems]);

    const handleOrder = async () => {
        if (!fullName || !phone || !address || !email) {
            alert("Vui lòng điền đầy đủ thông tin.");
            return;
        }

        if (isMultipleItems) {
            const outOfStockItems = (cartItems || []).filter((item) => Boolean(item.is_out_of_stock));
            if (outOfStockItems.length > 0) {
                alert("Trong giỏ có sản phẩm đã hết hàng. Vui lòng xóa sản phẩm hết hàng trước khi đặt mua.");
                return;
            }
        } else if (Boolean(product?.is_out_of_stock)) {
            alert("Sản phẩm đã hết hàng, không thể đặt mua.");
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

        if (shippingFeeStatus !== "success") {
            alert("Chưa tính được phí vận chuyển GHN từ địa chỉ nhận hàng. Vui lòng kiểm tra lại địa chỉ.");
            return;
        }

        const isGatewayPayment = paymentMethod === "momo" || paymentMethod === "vnpay";

        // Chỉ chặn khi giỏ thật sự có nhiều hơn 1 sản phẩm
        if (isGatewayPayment && hasMoreThanOneCartItem) {
            alert("Hiện thanh toán online chỉ hỗ trợ 1 sản phẩm mỗi lần. Vui lòng thanh toán từng sản phẩm.");
            return;
        }

        setIsLoading(true);
        const paymentReturnUrl = `${window.location.origin}/orders`;

        try {
            const token = localStorage.getItem('token'); // Thêm dòng này

            if (isMultipleItems) {
                // Xử lý đơn từ giỏ hàng
                for (const item of cartItems) {
                    const response = await axios.post(`${API_BASE_URL}/orders`, {
                        fullName,
                        email,
                        phone,
                        address,
                        productId: item.id,
                        productTitle: item.title,
                        productPrice: item.price,
                        quantity: item.quantity,
                        paymentMethod,
                        returnUrl: paymentReturnUrl,
                        shippingFee,
                        shippingRegion: selectedProvince?.ProvinceName || null,
                        shippingDistrict: selectedDistrict?.DistrictName || null,
                        shippingWard: selectedWard?.WardName || null
                    }, {
                        headers: {
                            'Authorization': `Bearer ${token}` // Thêm header
                        }
                    });

                    if (isGatewayPayment) {
                        const payUrl = response?.data?.payUrl;
                        if (!payUrl) {
                            const gatewayName = paymentMethod === "vnpay" ? "VNPay" : "MoMo";
                            const gatewayError = response?.data?.momoMessage || response?.data?.error || `Không nhận được link thanh toán ${gatewayName} từ server.`;
                            alert(`Không thể chuyển sang ${gatewayName}: ${gatewayError}`);
                            return;
                        }

                        window.location.href = payUrl;
                        return;
                    }
                }
            } else {
                // Xử lý 1 sản phẩm
                const response = await axios.post(`${API_BASE_URL}/orders`, {
                    fullName,
                    email,
                    phone,
                    address,
                    productId: product.id,
                    productTitle: product.title,
                    productPrice: product.price,
                    paymentMethod,
                    returnUrl: paymentReturnUrl,
                    shippingFee,
                    shippingRegion: selectedProvince?.ProvinceName || null,
                    shippingDistrict: selectedDistrict?.DistrictName || null,
                    shippingWard: selectedWard?.WardName || null
                }, {
                    headers: {
                        'Authorization': `Bearer ${token}` // Thêm header
                    }
                });

                if (isGatewayPayment) {
                    const payUrl = response?.data?.payUrl;
                    if (!payUrl) {
                        const gatewayName = paymentMethod === "vnpay" ? "VNPay" : "MoMo";
                        const gatewayError = response?.data?.momoMessage || response?.data?.error || `Không nhận được link thanh toán ${gatewayName} từ server.`;
                        alert(`Không thể chuyển sang ${gatewayName}: ${gatewayError}`);
                        return;
                    }

                    window.location.href = payUrl;
                    return;
                }
            }

            alert(isGatewayPayment
                ? `Đơn hàng đã tạo. Đang chuyển sang cổng thanh toán ${paymentMethod === 'vnpay' ? 'VNPay' : 'MoMo'}...`
                : "Đặt hàng thành công! Bạn sẽ thanh toán khi nhận hàng."
            );

            setFullName("");
            setEmail("");
            setPhone("");
            setAddress("");

            // Đặt thành công từ giỏ hàng thì xóa giỏ để tránh hiển thị lại đơn cũ
            if (isMultipleItems) {
                clearCart();
            }

            navigate('/orders');
        } catch (err) {
            console.error('Chi tiết lỗi:', err?.response?.data || err); // Xem lỗi chi tiết
            const backendError = err?.response?.data;
            let errorMessage = "Đặt hàng thất bại. Vui lòng thử lại.";
            
            if (backendError?.error) {
                errorMessage = backendError.error;
                
                // Nếu có lỗi MoMo, thêm chi tiết subErrors
                if (backendError.subErrors && Array.isArray(backendError.subErrors) && backendError.subErrors.length > 0) {
                    const subErrorDetails = backendError.subErrors
                        .map(e => `${e.errorCode}: ${e.errorDescription}`)
                        .join("\n");
                    errorMessage += `\n\nChi tiết lỗi:\n${subErrorDetails}`;
                }
            } else if (backendError?.momoMessage) {
                errorMessage = `Lỗi MoMo: ${backendError.momoMessage}`;
                if (backendError.subErrors && Array.isArray(backendError.subErrors) && backendError.subErrors.length > 0) {
                    const subErrorDetails = backendError.subErrors
                        .map(e => `${e.errorCode}: ${e.errorDescription}`)
                        .join("\n");
                    errorMessage += `\n\nChi tiết:\n${subErrorDetails}`;
                }
            } else if (paymentMethod === "vnpay") {
                errorMessage = backendError?.error || "Lỗi VNPay: Không thể tạo giao dịch.";
            }
            
            alert(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const checkoutItems = isMultipleItems
        ? (cartItems || [])
        : (product?.id ? [{ ...product, quantity: 1 }] : []);

    return (
        <div className="min-h-screen bg-[#f1f2f4]">
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

            <div className="px-4 py-6">
                <div className="mx-auto w-full max-w-[760px]">
                    <div className="space-y-4">
                        <div className="bg-[#f6f7f8] rounded-xl border border-[#e3e5e8] p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[20px] font-medium text-gray-900">Thông tin đơn hàng</h3>
                                <span className="text-[14px] text-gray-500">{checkoutItems.length} sản phẩm</span>
                            </div>

                            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                                {checkoutItems.map((item) => {
                                    const quantity = Number(item.quantity || 1);
                                    const lineTotal = Number(item.price || 0) * quantity;
                                    const displayAmount = checkoutItems.length === 1
                                        ? lineTotal + (shippingFeeStatus === "success" ? Number(shippingFee || 0) : 0)
                                        : lineTotal;

                                    return (
                                        <div key={item.id} className="flex gap-3 p-3 border border-[#e3e5e8] rounded-lg bg-white/70">
                                            <img
                                                src={item.image}
                                                alt={item.title}
                                                className="w-14 h-14 object-contain rounded"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-[15px] font-medium text-gray-800 truncate">{item.title}</h4>
                                                <div className="mt-1 text-[13px] text-gray-500 space-y-0.5">
                                                    <p>Số lượng: {quantity}</p>
                                                    <p>Đơn giá: {formatPrice(item.price)}₫</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[12px] text-gray-500">Thành tiền</p>
                                                <p className="text-[18px] leading-none font-medium text-red-600 mt-1">{formatPrice(displayAmount)}₫</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                        </div>

                        <div className="bg-[#f6f7f8] rounded-xl border border-[#e3e5e8] p-4 shadow-sm">
                            <h2 className="text-[20px] font-medium text-gray-900 mb-3">Thông tin nhận hàng</h2>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[15px] font-medium text-gray-800 mb-1.5">Họ và tên</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 text-[15px] border border-gray-300 rounded-md"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[15px] font-medium text-gray-800 mb-1.5">Email</label>
                                    <input
                                        type="email"
                                        className="w-full p-2.5 text-[15px] border border-gray-300 rounded-md"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[15px] font-medium text-gray-800 mb-1.5">Số điện thoại</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 text-[15px] border border-gray-300 rounded-md"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[15px] font-medium text-gray-800 mb-1.5">Địa chỉ nhận hàng</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 text-[15px] border border-gray-300 rounded-md"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                    />
                                </div>

                                {metaError && (
                                    <div className="text-[13px] text-red-600">{metaError}</div>
                                )}

                                {shippingFeeStatus !== "success" && (
                                    <div className="rounded-md border border-[#e3e5e8] bg-white/80 p-3 space-y-1">
                                        {shippingFeeStatus === "loading" && (
                                            <p className="text-[12px] text-blue-600">{shippingFeeMessage || "Đang tính phí vận chuyển..."}</p>
                                        )}
                                        {shippingFeeStatus === "error" && (
                                            <p className="text-[12px] text-red-600">{shippingFeeMessage || "Không tính được phí vận chuyển."}</p>
                                        )}
                                    </div>
                                )}

                                <div className="pt-1">
                                    <label className="block text-[15px] font-medium text-gray-800 mb-2.5">Phương thức thanh toán</label>
                                    <div className="space-y-2.5">
                                        <div
                                            className={`border rounded-lg p-3 cursor-pointer transition-all ${paymentMethod === "cod"
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-gray-200 hover:border-gray-300"
                                                }`}
                                            onClick={() => setPaymentMethod("cod")}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value="cod"
                                                    checked={paymentMethod === "cod"}
                                                    onChange={() => setPaymentMethod("cod")}
                                                    className="w-4 h-4 text-blue-600"
                                                />
                                                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-base">💵</div>
                                                <div>
                                                    <p className="text-[15px] font-medium text-gray-800">Thanh toán khi nhận hàng</p>
                                                    <p className="text-[13px] text-gray-600">Trả tiền mặt khi nhận sản phẩm</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div
                                            className={`border rounded-lg p-3 cursor-pointer transition-all ${paymentMethod === "momo"
                                                ? "border-pink-500 bg-pink-50"
                                                : "border-gray-200 hover:border-gray-300"
                                                }`}
                                            onClick={() => setPaymentMethod("momo")}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value="momo"
                                                    checked={paymentMethod === "momo"}
                                                    onChange={() => setPaymentMethod("momo")}
                                                    className="w-4 h-4 text-pink-600"
                                                />
                                                <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center text-base">📱</div>
                                                <div>
                                                    <p className="text-[15px] font-medium text-gray-800">Thanh toán qua MoMo</p>
                                                    <p className="text-[13px] text-gray-600">Chuyển sang cổng MoMo để hoàn tất</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div
                                            className={`border rounded-lg p-3 cursor-pointer transition-all ${paymentMethod === "vnpay"
                                                ? "border-blue-600 bg-blue-50"
                                                : "border-gray-200 hover:border-gray-300"
                                                }`}
                                            onClick={() => setPaymentMethod("vnpay")}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value="vnpay"
                                                    checked={paymentMethod === "vnpay"}
                                                    onChange={() => setPaymentMethod("vnpay")}
                                                    className="w-4 h-4 text-blue-600"
                                                />
                                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-base">🏦</div>
                                                <div>
                                                    <p className="text-[15px] font-medium text-gray-800">Thanh toán qua VNPay</p>
                                                    <p className="text-[13px] text-gray-600">Chuyển sang cổng VNPay để hoàn tất</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-md border border-[#e3e5e8] bg-white/80 p-3 space-y-1.5">
                                    <div className="flex justify-between text-[13px] text-gray-700">
                                        <span>Phí vận chuyển</span>
                                        <span className="font-medium text-orange-600">{formatPrice(shippingFee)}₫</span>
                                    </div>
                                    <div className="flex justify-between text-[12px] text-gray-500">
                                        <span>Phí cơ bản</span>
                                        <span>{formatPrice(shippingServiceFee)}₫</span>
                                    </div>
                                    <div className="flex justify-between text-[12px] text-gray-500">
                                        <span>Phí bảo hiểm</span>
                                        <span>{formatPrice(shippingInsuranceFee)}₫</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleOrder}
                                    className={`w-full mt-2 ${isLoading
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-[#ff7a00] hover:bg-[#e56f00]'
                                        } text-white py-2.5 rounded-lg text-[16px] font-medium transition-colors`}
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Đang xử lý...' : 'Xác Nhận Đặt Hàng'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Footers />
        </div>
    );
};

export default CartPayPage;



















