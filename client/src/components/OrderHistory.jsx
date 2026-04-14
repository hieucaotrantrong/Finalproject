import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FaBox, FaTruck, FaCheckCircle, FaClock, FaTimesCircle, FaCalendarAlt, FaChevronRight } from 'react-icons/fa';
import Home from './Home';
import Footers from './Footers';
import Carousel from './Carousel';

const SIDE_PREFIX = "side::";
const isSideBanner = (imageUrl = "") => imageUrl.startsWith(SIDE_PREFIX);
const toDisplayImageUrl = (imageUrl = "") => imageUrl.replace(SIDE_PREFIX, "");

const formatVnd = (value) => {
    const num = Number(String(value ?? 0).replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(num)) return '0';
    return num.toLocaleString('vi-VN');
};

const getOrderQuantity = (order) => {
    const qty = Number(order?.quantity ?? 1);
    return Number.isFinite(qty) && qty > 0 ? qty : 1;
};

const getOrderShippingFee = (order) => {
    const fee = Number(order?.shipping_fee ?? order?.shippingFee ?? 0);
    return Number.isFinite(fee) && fee > 0 ? fee : 0;
};

const getOrderTotal = (order) => {
    const unitPrice = Number(order?.product_price ?? 0);
    const quantity = getOrderQuantity(order);
    const shippingFee = getOrderShippingFee(order);
    return (Number.isFinite(unitPrice) ? unitPrice : 0) * quantity + shippingFee;
};

const resolveOrderImage = (imageUrl = '') => {
    const raw = String(imageUrl || '').trim();
    if (!raw) return '';

    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) {
        return raw;
    }

    if (raw.startsWith('/assets/') || raw.startsWith('/uploads/')) {
        return raw;
    }

    if (raw.startsWith('/')) {
        return raw;
    }

    return `/assets/${raw}`;
};

const OrderHistory = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('pending');
    const [sideBanner, setSideBanner] = useState(null);

 
    const orderTabs = [
        { key: 'all', label: 'Tất cả' }, 
        { key: 'pending', label: 'Chờ xử lý' },
        { key: 'confirmed', label: 'Đã xác nhận' },
        { key: 'shipping', label: 'Đang giao hàng' },
        { key: 'cancelled', label: 'Đã hủy' },
        { key: 'completed', label: 'Thành công' }
    ];

    // Logic lọc đơn hàng
   
    const filteredOrders = activeTab === 'all'
        ? orders.filter(order => order.status === 'completed')
        : orders.filter(order => order.status === activeTab);

    useEffect(() => {
        fetchUserOrders();
        const handleStorageChange = (e) => {
            if (e.key === 'orderUpdate') {
                fetchUserOrders();
                localStorage.removeItem('orderUpdate');
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

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

    const fetchUserOrders = async () => {
        try {
            const token = localStorage.getItem('token');
            const userEmail = localStorage.getItem('userEmail') || JSON.parse(localStorage.getItem('user') || '{}')?.email;
            if (!token || !userEmail) {
                setError('Vui lòng đăng nhập để xem lịch sử đơn hàng');
                setLoading(false);
                return;
            }
            const response = await axios.get(`http://localhost:5000/api/orders/user/${userEmail}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setOrders(response.data);
            setLoading(false);
        } catch (error) {
            setError('Không thể tải lịch sử đơn hàng');
            setLoading(false);
        }
    };

    const handleCancelOrder = async (orderId) => {
        if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này không?')) return;
        try {
            await axios.put(`http://localhost:5000/api/orders/user/${orderId}/cancel`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            fetchUserOrders();
        } catch (err) {
            alert(err?.response?.data?.error || 'Không thể hủy đơn hàng');
        }
    };

    const handleDeleteOrder = async (orderId) => {
        if (!window.confirm('Bạn có chắc muốn xóa đơn hàng này khỏi lịch sử không?')) return;
        try {
            await axios.delete(`http://localhost:5000/api/orders/user/${orderId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            fetchUserOrders();
        } catch (err) {
            alert(err?.response?.data?.error || 'Không thể xóa đơn hàng');
        }
    };

    const getStatusStyle = (status) => {
        const styles = {
            pending: { text: 'Chờ xác nhận' },
            confirmed: { text: 'Đã xác nhận' },
            shipping: { text: 'Đang giao hàng'},
            completed: { text: 'Thành công'},
            cancelled: { text: 'Đã hủy' },
        };
        return styles[status] || styles.pending;
    };

    return (
        <div className="bg-[#f0f2f5] min-h-screen">
            <Home />

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

            <Carousel />

            <div className="max-w-6xl mx-auto px-4 py-6">
                
                {/* Header Section */}
                <div className="flex items-center gap-4 mb-6">
                    <h1 className="text-xl font-normal text-gray-800">Đơn hàng đã mua</h1>
                    
                </div>

                {/* Tab Buttons - Chia từng ô riêng biệt như ảnh bạn gửi */}
                <div className="flex flex-wrap gap-3 mb-8">
                    {orderTabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-6 py-2.5 rounded border transition-all text-[15px] ${
                                activeTab === tab.key 
                                ? 'bg-white border-blue-600 text-blue-600 shadow-sm' 
                                : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="bg-white rounded-sm shadow-sm min-h-[400px]">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        /* Giao diện khi không có đơn hàng */
                        <div className="py-20 text-center">
                          
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Rất tiếc, không tìm thấy đơn hàng nào phù hợp</h3>
                            <p className="text-gray-500 mb-6 font-light">Vẫn còn rất nhiều sản phẩm đang chờ bạn</p>
                            
                

                        </div>
                    ) : (
                        /* Danh sách đơn hàng */
                        <div className="divide-y divide-gray-100">
                            {filteredOrders.map((order) => {
                                const status = getStatusStyle(order.status);
                                const quantity = getOrderQuantity(order);
                                const shippingFee = getOrderShippingFee(order);
                                const totalAmount = getOrderTotal(order);
                                return (
                                    <div key={order.id} className="p-6 hover:bg-gray-50/50 transition">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex gap-4">
                                                {/* Hiển thị hình ảnh sản phẩm */}
                                                <div className="w-20 h-20 bg-gray-50 border rounded flex-shrink-0 overflow-hidden">
                                                    {resolveOrderImage(order.product_image) ? (
                                                        <img 
                                                            src={resolveOrderImage(order.product_image)}
                                                            alt={order.product_title}
                                                            className="w-full h-full object-contain"
                                                            onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/150?text=No+Image"; }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                            <FaBox size={24} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-gray-800 line-clamp-2 max-w-md">
                                                        {order.product_title}
                                                    </h4>
                                                    <p className="mt-1 text-sm text-gray-500">
                                                        {formatVnd(order.product_price)}₫ x {quantity}
                                                    </p>
                                                    
                                                    <div className="mt-2 text-xs text-gray-400 space-y-0.5">
                                                        <p>Người nhận: {order.full_name}</p>
                                                        <p>SĐT: {order.phone}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`inline-flex items-center justify-end gap-1.5 font-medium mb-1 px-2 py-1 rounded ${status.class}`}>
                                                    <span className="text-[13px] uppercase tracking-wide">{status.text}</span>
                                                </div>
                                                <p className="text-lg font-bold text-red-600">{formatVnd(totalAmount)}₫</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center mt-4">
                                            <span className="text-xs text-gray-400">
                                                Ngày đặt: {new Date(order.created_at).toLocaleString('vi-VN')}
                                            </span>
                                            <div className="flex gap-2">
                                                {order.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleCancelOrder(order.id)}
                                                        className="px-4 py-1.5 border border-red-500 text-black-500 rounded text-sm "
                                                    >
                                                        Hủy đơn
                                                    </button>
                                                )}
                                                {order.status === 'completed' && (
                                                    <Link
                                                        to={`/product/${order.product_id}#reviews`}
                                                        className="px-4 py-1.5 bg-white text-blue-700 border border-blue-300 rounded text-sm hover:bg-blue-50 shadow-sm"
                                                    >
                                                        Đánh giá sản phẩm
                                                    </Link>
                                                )}
                                                {activeTab === 'all' && ['completed', 'cancelled'].includes(order.status) && (
                                                    <button
                                                        onClick={() => handleDeleteOrder(order.id)}
                                                        className="px-4 py-1.5 border border-gray-500 text-gray-700 rounded text-sm hover:bg-gray-100"
                                                    >
                                                        Xóa đơn
                                                    </button>
                                                )}
                                                <Link
                                                    to={`/product/${order.product_id}`}
                                                    className="px-4 py-1.5 bg-white text-gray-800 border border-yellow-300 rounded text-sm hover:bg-gray-100 shadow-sm"
                                                >
                                                    Xem chi tiết
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            <Footers />
        </div>
    );
};

export default OrderHistory;