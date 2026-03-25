import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import SupportManagement from '../components/SupportManagement';
import OrderManagement from '../components/OrderManagement';
import WalletManagement from '../components/WalletManagement';
import Footers from '../components/Footers';
import AdminUsers from '../components/AdminUsers';
import AdminBanner from '../pages/AdminBanner';

const SIDE_PREFIX = 'side::';

const AdminPage = () => {
    const [activeTab, setActiveTab] = useState('products');
    const [products, setProducts] = useState([]);
    const [banners, setBanners] = useState([]);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [editingProduct, setEditingProduct] = useState(null);
    const [preview, setPreview] = useState('');
    const navigate = useNavigate();

    // 
const [form, setForm] = useState({
    title: '',
    originalprice: '',
    price: '',
    discount: '',
    tag: '',
    image: '',
    images: [], 
    category: 'phone',
});
const [specs, setSpecs] = useState([
    { group_name: '', spec_key: '', spec_value: '' }
]);
    const [popup, setPopup] = useState({ show: false, message: '', type: 'success' });

    // ✅ Show popup
    const showPopup = (message, type = 'success') => {
        setPopup({ show: true, message, type });
    };

    const closePopup = () => setPopup({ ...popup, show: false });

    const updateSpecField = (index, field, value) => {
        setSpecs((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const categories = [
        { value: 'phone', label: ' Điện thoại' },
        { value: 'laptop', label: ' Laptop' },
        { value: 'accessory', label: ' Phụ kiện' },
        { value: 'smartwatch', label: ' Smartwatch' },
        { value: 'watch', label: ' Đồng hồ' },
        { value: 'tablet', label: ' Tablet' },
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

    const fetchBanners = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/banners');
            const filtered = (res.data || []).filter((banner) =>
                banner?.image_url && !String(banner.image_url).startsWith(SIDE_PREFIX)
            );
            setBanners(filtered.slice(0, 2));
        } catch (error) {
            console.error('Lỗi khi lấy banner:', error);
            setBanners([]);
        }
    };

    const getBannerSrc = (imageUrl = '') => {
        if (!imageUrl) return '';
        const cleanImageUrl = String(imageUrl).replace(SIDE_PREFIX, '');
        if (cleanImageUrl.startsWith('http://') || cleanImageUrl.startsWith('https://') || cleanImageUrl.startsWith('/')) {
            return cleanImageUrl;
        }
        return `/assets/${cleanImageUrl}`;
    };

    useEffect(() => {
        fetchProducts();
        fetchBanners();
    }, []);

    useEffect(() => {
        if (!banners.length) {
            setCurrentSlide(0);
            return;
        }

        setCurrentSlide((prev) => (prev >= banners.length ? 0 : prev));

        if (banners.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % banners.length);
        }, 3000);

        return () => clearInterval(timer);
    }, [banners.length]);

const handleSubmit = async (e) => {
    e.preventDefault();

    // ❌ chặn form rỗng
    if (!form.title || !form.originalprice || !form.price) {
        showPopup("Vui lòng nhập đầy đủ thông tin!", "error");
        return;
    }

    try {
        const formData = {
            ...form,
            originalprice: form.originalprice.replace(/\./g, ''),
            price: form.price.replace(/\./g, ''),
             specs: specs 
        };

        if (editingProduct) {
            const id = editingProduct.id || editingProduct._id;
            await axios.put(`http://localhost:5000/api/products/${id}`, formData);
            showPopup('Cập nhật thành công!', 'success');
        } else {
            await axios.post('http://localhost:5000/api/products', formData);
            showPopup('Thêm sản phẩm thành công!', 'success');
        }

        // reset form (QUAN TRỌNG: phải có images)
        setForm({
            title: '',
            originalprice: '',
            price: '',
            discount: '',
            tag: '',
            image: '',
            images: [],
            category: 'phone',
        });

        setPreview('');
        fetchProducts();
setSpecs([{ group_name: '', spec_key: '', spec_value: '' }]);
    } catch (error) {
        console.error(error);
        showPopup('Lỗi khi thêm/sửa!', 'error');
    }
};

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc muốn xoá sản phẩm này không?')) {
            try {
                await axios.delete(`http://localhost:5000/api/products/${id}`);
                fetchProducts();
                showPopup(' Đã xoá sản phẩm thành công!', 'success');
            } catch (error) {
                console.error('Lỗi khi xoá sản phẩm:', error);
                showPopup(' Lỗi khi xoá sản phẩm!', 'error');
            }
        }
    };

    const handleEdit = async (product) => {
        try {
            const id = product.id || product._id;
            const detailRes = await axios.get(`http://localhost:5000/api/products/${id}`);
            const detailProduct = detailRes.data || product;

            setEditingProduct(detailProduct);
            const cleanOriginal = Math.floor(parseFloat(detailProduct.originalprice || 0))
            .toString()
            .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            const cleanPrice = Math.floor(parseFloat(detailProduct.price || 0))
            .toString()
            .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

            setForm({
            title: detailProduct.title || '',
            originalprice: cleanOriginal,
            price: cleanPrice,
            discount: detailProduct.discount || '',
            tag: detailProduct.tag || '',
            image: detailProduct.image || '',
            images: detailProduct.images || [],
            category: detailProduct.category || 'phone',
        });
            setPreview(detailProduct.image || '');
            setSpecs(
                Array.isArray(detailProduct.specs) && detailProduct.specs.length > 0
                    ? detailProduct.specs
                    : [{ group_name: '', spec_key: '', spec_value: '' }]
            );
        } catch (error) {
            console.error('Lỗi khi lấy chi tiết sản phẩm để sửa:', error);
            showPopup('Không tải được thông số kỹ thuật để sửa!', 'error');
        }
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
                {banners.length > 0 ? (
                    <div className="relative w-full h-64 overflow-hidden rounded-lg border border-gray-300 bg-white">
                        <div
                            className="flex h-full transition-transform duration-700 ease-in-out"
                            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                        >
                            {banners.map((banner, index) => (
                                <img
                                    key={banner.id || index}
                                    src={getBannerSrc(banner.image_url)}
                                    className="w-full h-full object-cover flex-shrink-0"
                                    alt={`Slide ${index + 1}`}
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="relative w-full h-64 overflow-hidden rounded-lg bg-gray-200 flex items-center justify-center text-gray-600">
                        Chưa có banner từ API
                    </div>
                )}
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
                                        setPreview(URL.createObjectURL(file));
                                    }
                                }}
                                className="border border-gray-300 rounded px-4 py-2 w-full"
                            />
                            {/* Upload nhiều ảnh phụ */}
<div className="mt-2">
    <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;

            const imagePaths = files.map((file) => `/assets/${file.name}`);
            setForm({
                ...form,
                images: imagePaths
            });
        }}
        className="border border-gray-300 rounded px-4 py-2 w-full"
    />

    {/* preview ảnh phụ */}
    <div className="flex gap-2 mt-2 flex-wrap">
        {form.images.map((img, index) => (
            <img
                key={index}
                src={img}
                className="w-16 h-16 object-cover rounded border"
            />
        ))}
    </div>
</div>
                            {preview && (
                                <img src={preview} alt="Preview" className="w-24 h-24 object-cover mt-2 border rounded" />
                            )}
                        </div>
                        <div className="col-span-1 md:col-span-2 mt-6 border rounded-xl bg-white shadow-sm overflow-hidden">
    {/* Header */}
    <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
        <h3 className="font-bold text-gray-700">Thông số kỹ thuật</h3>
        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
            {specs.length} mục
        </span>
    </div>

    <div className="p-0">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-gray-50/50 text-gray-400 text-[11px] uppercase tracking-wider">
                    <th className="px-6 py-3 font-medium border-b w-1/3">Nhóm danh mục</th>
                    <th className="px-6 py-3 font-medium border-b w-1/3">Tên thông số</th>
                    <th className="px-6 py-3 font-medium border-b w-1/3">Giá trị chi tiết</th>
                    <th className="px-4 py-3 border-b w-10"></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {specs.map((spec, index) => (
                    <tr key={index} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-4 py-2">
                            <input
                                type="text"
                                placeholder="Cấu hình..."
                                value={spec.group_name}
                                onChange={(e) => updateSpecField(index, 'group_name', e.target.value)}
                                className="w-full bg-transparent focus:bg-white border-transparent focus:border-blue-300 px-2 py-1.5 rounded text-sm outline-none transition"
                            />
                        </td>
                        <td className="px-4 py-2">
                            <input
                                type="text"
                                placeholder="RAM, CPU..."
                                value={spec.spec_key}
                                onChange={(e) => updateSpecField(index, 'spec_key', e.target.value)}
                                className="w-full bg-transparent focus:bg-white border-transparent focus:border-blue-300 px-2 py-1.5 rounded text-sm outline-none transition font-medium text-gray-700"
                            />
                        </td>
                        <td className="px-4 py-2">
                            <input
                                type="text"
                                placeholder="8GB, Apple M1..."
                                value={spec.spec_value}
                                onChange={(e) => updateSpecField(index, 'spec_value', e.target.value)}
                                className="w-full bg-transparent focus:bg-white border-transparent focus:border-blue-300 px-2 py-1.5 rounded text-sm outline-none transition"
                            />
                        </td>
                        <td className="px-4 py-2 text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    const newSpecs = [...specs];
                                    newSpecs.splice(index, 1);
                                    setSpecs(newSpecs);
                                }}
                                disabled={specs.length <= 1}
                                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                title="Xóa dòng này"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" size="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d=" orbit-close 19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>

    {/* Footer Actions */}
    <div className="p-4 bg-gray-50 border-t flex gap-3">
        <button
            type="button"
            onClick={() => {
                const lastSpec = specs[specs.length - 1];
                setSpecs([...specs, { group_name: lastSpec?.group_name || '', spec_key: '', spec_value: '' }]);
            }}
            className="flex-1 flex justify-center items-center gap-2 bg-white border border-gray-300 hover:border-green-500 hover:text-green-600 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
        >
            <span>+ Thêm dòng (Cùng nhóm)</span>
        </button>

        <button
            type="button"
            onClick={() => setSpecs([...specs, { group_name: '', spec_key: '', spec_value: '' }])}
            className="flex-1 flex justify-center items-center gap-2 bg-white border border-gray-300 hover:border-indigo-500 hover:text-indigo-600 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
        >
            <span>+ Thêm nhóm mới</span>
        </button>
    </div>
</div>
                        <button
                            type="submit"
                            className="col-span-1 md:col-span-2 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
                        >
                            {editingProduct ? 'Cập nhật sản phẩm' : ' Thêm sản phẩm'}
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
                                    <p className="text-sm text-gray-500">Giảm: {Number(item.discount)}%</p>
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
