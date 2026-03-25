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

    // Danh sách các tab chia thành từng ô riêng biệt như ảnh
    const orderTabs = [
        { key: 'all', label: 'Tất cả' }, // Thêm option tất cả nếu bạn muốn
        { key: 'pending', label: 'Chờ xử lý' },
        { key: 'confirmed', label: 'Đã xác nhận' },
        { key: 'shipping', label: 'Đang giao hàng' },
        { key: 'cancelled', label: 'Đã hủy' },
        { key: 'completed', label: 'Thành công' }
    ];

    // Logic lọc đơn hàng
    const filteredOrders = activeTab === 'all' 
        ? orders 
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
            pending: { text: 'Chờ xác nhận', color: 'text-yellow-600', icon: <FaClock /> },
            confirmed: { text: 'Đã xác nhận', color: 'text-blue-600', icon: <FaBox /> },
            shipping: { text: 'Đang giao hàng', color: 'text-indigo-600', icon: <FaTruck /> },
            completed: { text: 'Thành công', color: 'text-green-600' },
            cancelled: { text: 'Đã hủy', color: 'text-red-600', icon: <FaTimesCircle /> },
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
                                                    <p className="text-sm text-gray-500 mt-1">Mã đơn: #{order.id}</p>
                                                    <div className="mt-2 text-xs text-gray-400 space-y-0.5">
                                                        <p>Người nhận: {order.full_name}</p>
                                                        <p>SĐT: {order.phone}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`flex items-center justify-end gap-1.5 font-medium mb-1 ${status.color}`}>
                                                    {status.icon}
                                                    <span className="text-[13px] uppercase tracking-wide">{status.text}</span>
                                                </div>
                                                <p className="text-lg font-bold text-red-600">{formatVnd(order.product_price)}₫</p>
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
                                                        className="px-4 py-1.5 border border-red-500 text-red-500 rounded text-sm hover:bg-red-50"
                                                    >
                                                        Hủy đơn
                                                    </button>
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
                                                    className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 shadow-sm"
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