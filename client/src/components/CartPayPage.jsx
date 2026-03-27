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
        .replace(/thanh pho|tp\.?/g, "")
        .replace(/quan|huyen|thi xa|thi tran|phuong|xa|tinh/g, "")
        .replace(/-/g, " ")
        .replace(/\./g, " ")
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
    const [paymentMethod, setPaymentMethod] = useState("cod"); // "cod" hoặc "momo"
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

        // Chỉ chặn khi giỏ thật sự có nhiều hơn 1 sản phẩm
        if (paymentMethod === "momo" && hasMoreThanOneCartItem) {
            alert("Hiện MoMo chỉ hỗ trợ thanh toán 1 sản phẩm mỗi lần. Vui lòng thanh toán từng sản phẩm.");
            return;
        }

        setIsLoading(true);

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
                        shippingFee,
                        shippingRegion: selectedProvince?.ProvinceName || null,
                        shippingDistrict: selectedDistrict?.DistrictName || null,
                        shippingWard: selectedWard?.WardName || null
                    }, {
                        headers: {
                            'Authorization': `Bearer ${token}` // Thêm header
                        }
                    });

                    if (paymentMethod === "momo") {
                        const payUrl = response?.data?.payUrl;
                        if (!payUrl) {
                            const momoError = response?.data?.momoMessage || "Không nhận được link thanh toán MoMo từ server.";
                            alert(`Không thể chuyển sang MoMo: ${momoError}`);
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
                    shippingFee,
                    shippingRegion: selectedProvince?.ProvinceName || null,
                    shippingDistrict: selectedDistrict?.DistrictName || null,
                    shippingWard: selectedWard?.WardName || null
                }, {
                    headers: {
                        'Authorization': `Bearer ${token}` // Thêm header
                    }
                });

                if (paymentMethod === "momo") {
                    const payUrl = response?.data?.payUrl;
                    if (!payUrl) {
                        const momoError = response?.data?.momoMessage || "Không nhận được link thanh toán MoMo từ server.";
                        alert(`Không thể chuyển sang MoMo: ${momoError}`);
                        return;
                    }

                    window.location.href = payUrl;
                    return;
                }
            }

            alert(paymentMethod === "momo"
                ? "Đơn hàng đã tạo. Đang chuyển sang cổng thanh toán MoMo..."
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
            }
            
            alert(errorMessage);
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

                          

                            {metaError && (
                                <div className="text-sm text-red-600">{metaError}</div>
                            )}

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

                                    {/* Thanh toán bằng MoMo */}
                                    <div
                                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${paymentMethod === "momo"
                                            ? "border-pink-500 bg-pink-50"
                                            : "border-gray-200 hover:border-gray-300"
                                            }`}
                                        onClick={() => setPaymentMethod("momo")}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value="momo"
                                                checked={paymentMethod === "momo"}
                                                onChange={() => setPaymentMethod("momo")}
                                                className="w-4 h-4 text-pink-600"
                                            />
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                                                    <span className="text-pink-600 text-lg">📱</span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-800">Thanh toán qua MoMo</p>
                                                    <p className="text-sm text-gray-600">
                                                        Bạn sẽ được chuyển đến cổng MoMo để hoàn tất thanh toán.
                                                    </p>
                                                </div>
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
                                <div className="flex justify-between items-center mb-1 text-sm text-gray-600">
                                    <span>Phí vận chuyển cơ bản:</span>
                                    <span>{formatPrice(shippingServiceFee)}₫</span>
                                </div>
                                <div className="flex justify-between items-center mb-2 text-sm text-gray-600">
                                    <span>Phí bảo hiểm hàng hóa:</span>
                                    <span>{formatPrice(shippingInsuranceFee)}₫</span>
                                </div>
                                <div className="text-sm text-gray-600 mb-3">
                                    Địa chỉ nhận hàng : {selectedProvince?.ProvinceName || "Chưa chọn tỉnh/thành"}
                                    {selectedDistrict?.DistrictName ? `, ${selectedDistrict.DistrictName}` : ""}
                                    {selectedWard?.WardName ? `, ${selectedWard.WardName}` : ""}
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-semibold">Tổng thanh toán:</span>
                                    <span className="text-2xl font-bold text-red-600">
                                        {formatPrice(getGrandTotal())}₫
                                    </span>
                                </div>
                                {paymentMethod === "momo" && (
                                    <div className="mt-2 text-sm text-gray-600">
                                        Sau khi xác nhận đơn, hệ thống sẽ chuyển bạn đến MoMo.
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleOrder}
                                className={`w-full ${isLoading
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-red-500 hover:bg-red-600'
                                    } text-white py-3 rounded-md text-lg transition-colors`}
                                disabled={isLoading}
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



















