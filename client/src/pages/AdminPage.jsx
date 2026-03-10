import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import SupportManagement from '../components/SupportManagement';
import OrderManagement from '../components/OrderManagement';
import WalletManagement from '../components/WalletManagement';
import Footers from '../components/Footers';
import AdminUsers from '../components/AdminUsers';
import { TECarousel, TECarouselItem } from 'tw-elements-react';
import AdminBanner from '../pages/AdminBanner';
const AdminPage = () => {
    const [activeTab, setActiveTab] = useState('products');
    const [products, setProducts] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null);
    const [preview, setPreview] = useState('');
    const navigate = useNavigate();

    // ✅ Form state
    const [form, setForm] = useState({
        title: '',
        originalprice: '',
        price: '',
        discount: '',
        tag: '',
        image: '',
        category: 'phone',
    });

    const [popup, setPopup] = useState({ show: false, message: '', type: 'success' });

    // ✅ Show popup
    const showPopup = (message, type = 'success') => {
        setPopup({ show: true, message, type });
    };

    const closePopup = () => setPopup({ ...popup, show: false });

    const categories = [
        { value: 'phone', label: '📱 Điện thoại' },
        { value: 'laptop', label: '💻 Laptop' },
        { value: 'accessory', label: '🎧 Phụ kiện' },
        { value: 'smartwatch', label: '⌚ Smartwatch' },
        { value: 'watch', label: '⏰ Đồng hồ' },
        { value: 'tablet', label: '📱 Tablet' },
    ];

    const handleLogout = () => {
        const confirmLogout = window.confirm('Bạn có chắc chắn muốn đăng xuất không?');
        if (confirmLogout) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/');
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/products');
            setProducts(res.data);
        } catch (error) {
            console.error('Lỗi khi lấy sản phẩm:', error);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const formData = {
                ...form,
                originalprice: form.originalprice.replace(/\./g, ''),
                price: form.price.replace(/\./g, ''),
            };

            if (editingProduct) {
                const id = editingProduct.id || editingProduct._id;
                await axios.put(`http://localhost:5000/api/products/${id}`, formData);
                showPopup('✅ Cập nhật sản phẩm thành công!', 'success');
                setEditingProduct(null);
            } else {
                await axios.post('http://localhost:5000/api/products', formData);
                showPopup('✅ Thêm sản phẩm thành công!', 'success');
            }

            setForm({
                title: '',
                originalprice: '',
                price: '',
                discount: '',
                tag: '',
                image: '',
                category: 'phone',
            });
            setPreview('');
            fetchProducts();
        } catch (error) {
            console.error('❌ Lỗi khi thêm/sửa sản phẩm:', error);
            showPopup('❌ Lỗi khi thêm/sửa sản phẩm!', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc muốn xoá sản phẩm này không?')) {
            try {
                await axios.delete(`http://localhost:5000/api/products/${id}`);
                fetchProducts();
                showPopup('🗑️ Đã xoá sản phẩm thành công!', 'success');
            } catch (error) {
                console.error('Lỗi khi xoá sản phẩm:', error);
                showPopup('❌ Lỗi khi xoá sản phẩm!', 'error');
            }
        }
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        const cleanOriginal = Math.floor(parseFloat(product.originalprice || 0))
            .toString()
            .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        const cleanPrice = Math.floor(parseFloat(product.price || 0))
            .toString()
            .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

        setForm({
            title: product.title || '',
            originalprice: cleanOriginal,
            price: cleanPrice,
            discount: product.discount || '',
            tag: product.tag || '',
            image: product.image || '',
            category: product.category || 'phone',
        });
        setPreview(product.image || '');
    };

    const formatPrice = (value) => {
        const numericValue = value.replace(/\D/g, '');
        return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    const handlePriceChange = (field, value) => {
        const formatted = formatPrice(value);
        setForm({ ...form, [field]: formatted });
    };

    const formatDisplayPrice = (price) => {
        const numPrice = Math.floor(parseFloat(price || 0));
        return numPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    return (
        <div className="w-full min-h-screen p-6 bg-gray-50">
            <header className="fixed top-0 left-0 w-full bg-yellow-400 shadow-lg py-5 px-16 flex items-center justify-between gap-4 z-50">
                <div className="flex items-center">
                    <img
                        src="/assets/logo.jpg"
                        alt="logo"
                        className="h-10 object-contain mr-3 cursor-pointer"
                        onClick={() => {
                            setActiveTab('products');
                            navigate('/admin');
                        }}
                    />
                </div>

                <nav className="flex-1 flex flex-wrap justify-center gap-4">
                    {[
                        { key: 'products', label: 'Quản lý sản phẩm' },
                        { key: 'orders', label: 'Quản lý đơn hàng' },
                        { key: 'wallet', label: 'Quản lý ví' },
                        { key: 'support', label: 'Quản lý hỗ trợ' },
                        { key: 'users', label: 'Quản lý người dùng' },
                         { key: 'banners', label: 'Quản lý banner' },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === tab.key
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white text-gray-800 hover:bg-blue-100 border border-gray-200'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <button
                    onClick={handleLogout}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded-full flex items-center gap-2 shadow-sm text-sm transition"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path
                            fillRule="evenodd"
                            d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                            clipRule="evenodd"
                        />
                    </svg>
                    Đăng xuất
                </button>
            </header>

            <div className="mt-28 w-full max-w-[1700px] mx-auto">
                <TECarousel ride="carousel" showIndicators showControls>
                    <div className="relative w-full h-64 overflow-hidden">
                        <TECarouselItem itemID={1} data-te-carousel-active>
                            <img
                                src="https://cdnv2.tgdd.vn/mwg-static/tgdd/Banner/23/05/23050828d3211ce7b91e92473a3690b3.jpg"
                                className="w-full h-full object-cover rounded-lg"
                                alt="Slide 1"
                            />
                        </TECarouselItem>
                        <TECarouselItem itemID={2}>
                            <img
                                src="https://cdnv2.tgdd.vn/mwg-static/tgdd/Banner/43/85/43854a7ba231f17252741049cc5a099a.png"
                                className="w-full h-full object-cover rounded-lg"
                                alt="Slide 2"
                            />
                        </TECarouselItem>
                    </div>
                </TECarousel>
            </div>

            {activeTab === 'products' ? (
                <>
                    <form
                        onSubmit={handleSubmit}
                        className="bg-white p-6 rounded-lg shadow grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
                    >
                        <input
                            type="text"
                            placeholder="Tên sản phẩm"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            className="border border-gray-300 rounded px-4 py-2"
                        />

                        <select
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                            className="border border-gray-300 rounded px-4 py-2"
                        >
                            {categories.map((cat) => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>

                        <input
                            type="text"
                            placeholder="Giá gốc"
                            value={form.originalprice}
                            onChange={(e) => handlePriceChange('originalprice', e.target.value)}
                            className="border border-gray-300 rounded px-4 py-2"
                        />

                        <input
                            type="text"
                            placeholder="Giá khuyến mãi"
                            value={form.price}
                            onChange={(e) => handlePriceChange('price', e.target.value)}
                            className="border border-gray-300 rounded px-4 py-2"
                        />

                        <input
                            type="text"
                            placeholder="Giảm giá (%)"
                            value={form.discount}
                            onChange={(e) => setForm({ ...form, discount: e.target.value })}
                            className="border border-gray-300 rounded px-4 py-2"
                        />

                        <input
                            type="text"
                            placeholder="Tag"
                            value={form.tag}
                            onChange={(e) => setForm({ ...form, tag: e.target.value })}
                            className="border border-gray-300 rounded px-4 py-2"
                        />

                        <div>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        const imagePath = `/assets/${file.name}`;
                                        setForm({ ...form, image: imagePath });
                                        const reader = new FileReader();
                                        reader.onloadend = () => setPreview(reader.result);
                                        reader.readAsDataURL(file);
                                    }
                                }}
                                className="border border-gray-300 rounded px-4 py-2 w-full"
                            />
                            {preview && (
                                <img src={preview} alt="Preview" className="w-24 h-24 object-cover mt-2 border rounded" />
                            )}
                        </div>

                        <button
                            type="submit"
                            className="col-span-1 md:col-span-2 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
                        >
                            {editingProduct ? 'Cập nhật sản phẩm' : '➕ Thêm sản phẩm'}
                        </button>
                    </form>

                    <h2 className="text-2xl font-semibold mb-4">Danh sách sản phẩm</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 items-stretch">
                        {products.map((item) => (
                            <div
                                key={item.id}
                                className="bg-white rounded-lg shadow p-4 flex flex-col justify-between text-center border hover:shadow-lg transition-all duration-200 h-full"
                            >
                                <div>
                                    <img
                                        src={item.image}
                                        alt={item.title}
                                        className="w-32 h-32 object-cover rounded mb-2 mx-auto"
                                    />
                                    <h3 className="text-lg font-semibold min-h-[48px]">{item.title}</h3>
                                    <p className="text-gray-600">
                                        Giá:{' '}
                                        <span className="text-green-600 font-bold">
                                            {formatDisplayPrice(item.price)}₫
                                        </span>
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Giá gốc: {formatDisplayPrice(item.originalprice)}₫
                                    </p>
                                    <p className="text-sm text-gray-500">Giảm: {item.discount}%</p>
                                    <p className="text-sm text-gray-500">
                                        Loại: {categories.find((c) => c.value === item.category)?.label || 'Không xác định'}
                                    </p>
                                </div>

                                <div className="mt-auto flex gap-2 justify-center pt-3">
                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded"
                                    >
                                        Sửa
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                                    >
                                        Xóa
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : activeTab === 'orders' ? (
                <OrderManagement />
            ) : activeTab === 'wallet' ? (
                <WalletManagement />
            ) : activeTab === 'users' ? (
                <AdminUsers />
            ) : activeTab === 'banners' ? (
                 <AdminBanner />
            ) : (
                <SupportManagement />
            )}

            <Footers />

            {/* ✅ Popup thông báo kiểu alert */}
            {popup.show && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[9999]">
                    <div
                        className={`rounded-xl shadow-lg p-6 w-[350px] text-center ${popup.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                            } text-white`}
                    >
                        <h2 className="text-lg font-semibold mb-3">
                            {popup.type === 'success' ? 'Thành công 🎉' : 'Thông báo ⚠️'}
                        </h2>
                        <p className="mb-5">{popup.message}</p>
                        <button
                            onClick={closePopup}
                            className="bg-white text-gray-800 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPage;
