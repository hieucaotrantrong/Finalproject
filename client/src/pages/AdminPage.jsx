import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';
import SupportManagement from './SupportManagement';
import OrderManagement from './OrderManagement';
import RevenueManagement from './RevenueManagement';
import Footers from '../components/Footers';
import AdminUsers from './AdminUsers';
import AdminBanner from './AdminBanner';
import Notifications from '../components/Notifications';
import InventoryManagement from './InventoryManagement';

const SIDE_PREFIX = 'side::';
const TOP_PREFIX = 'top::';

const AdminPage = () => {
    const [activeTab, setActiveTab] = useState('products');
    const [adminSearch, setAdminSearch] = useState('');
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
    const parsePriceToNumber = (value) => {
        const raw = String(value || '').replace(/\./g, '').replace(/\D/g, '');
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const calculateDiscount = (originalValue, priceValue) => {
        const original = parsePriceToNumber(originalValue);
        const price = parsePriceToNumber(priceValue);

        if (original <= 0 || price <= 0 || price >= original) {
            return '0';
        }

        const percent = Math.round(((original - price) / original) * 100);
        return String(Math.max(0, Math.min(100, percent)));
    };

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

    const adminTabs = [
        { key: 'products', label: 'Quản lý sản phẩm' },
        { key: 'inventory', label: 'Quản lý kho' },
        { key: 'orders', label: 'Quản lý đơn hàng' },
        { key: 'revenue', label: 'Quản lý doanh thu'},
        { key: 'support', label: 'Quản lý hỗ trợ',  },
        { key: 'users', label: 'Quản lý người dùng',  },
        { key: 'banners', label: 'Quản lý banner',  },
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
                banner?.image_url &&
                !String(banner.image_url).startsWith(SIDE_PREFIX) &&
                !String(banner.image_url).startsWith(TOP_PREFIX)
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
        const autoDiscount = calculateDiscount(form.originalprice, form.price);
        const formData = {
            ...form,
            originalprice: form.originalprice.replace(/\./g, ''),
            price: form.price.replace(/\./g, ''),
            discount: autoDiscount,
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

    const handleToggleOutOfStock = async (product) => {
        try {
            const id = product.id || product._id;
            const nextStatus = !Boolean(product.is_out_of_stock);
            await axios.patch(`http://localhost:5000/api/products/${id}/stock-status`, {
                is_out_of_stock: nextStatus
            });
            fetchProducts();
            showPopup(nextStatus ? 'Đã chuyển sản phẩm sang Hết hàng' : 'Đã mở bán lại sản phẩm', 'success');
        } catch (error) {
            console.error('Lỗi khi cập nhật trạng thái hết hàng:', error);
            showPopup('Không thể cập nhật trạng thái hết hàng', 'error');
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
            discount: calculateDiscount(cleanOriginal, cleanPrice),
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
        const nextForm = { ...form, [field]: formatted };
        nextForm.discount = calculateDiscount(nextForm.originalprice, nextForm.price);
        setForm(nextForm);
    };

    const formatDisplayPrice = (price) => {
        const numPrice = Math.floor(parseFloat(price || 0));
        return numPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    const normalizedSearch = adminSearch.trim().toLowerCase();
    const filteredProducts = !normalizedSearch
        ? products
        : products.filter((item) => {
            const title = String(item?.title || '').toLowerCase();
            const tag = String(item?.tag || '').toLowerCase();
            const category = String(item?.category || '').toLowerCase();
            return (
                title.includes(normalizedSearch) ||
                tag.includes(normalizedSearch) ||
                category.includes(normalizedSearch)
            );
        });

    return (
        <div className="min-h-screen bg-white">
            <div className="mx-auto flex w-full max-w-[1800px] gap-6 p-4 md:p-6">
                <aside className="hidden w-[280px] shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm lg:block">
                    <div className="border-b border-slate-200 px-5 py-6">
                        <button
                            type="button"
                            className="w-full rounded-xl bg-white px-3 py-3 shadow-sm ring-1 ring-black/5"
                            onClick={() => {
                                setActiveTab('products');
                                navigate('/admin');
                            }}
                        >
                            <img
                                src="/assets/logoadmin.png"
                                alt="logo"
                                className="mx-auto h-16 w-auto object-contain"
                            />
                        </button>
                        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Bảng điều khiển</p>
                    </div>

                    <nav className="space-y-2 px-4 py-5">
                        {adminTabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`group flex w-full items-center rounded-xl border px-3 py-3 text-left text-sm font-semibold transition-all ${
                                    activeTab === tab.key
                                        ? 'bg-slate-50 border-slate-800 text-slate-900 shadow-sm'
                                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                                }`}
                            >
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>

                    <div className="px-4 pb-6 pt-2">
                        <button
                            onClick={handleLogout}
                            className="w-full rounded-xl border border-red-500 bg-white px-4 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-50"
                        >
                            Đăng xuất
                        </button>
                    </div>
                </aside>

                <main className="min-w-0 flex-1">
                    <header className="mb-5 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200 md:px-6">
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1">
                                <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Tìm sản phẩm, danh mục, tag..."
                                    value={adminSearch}
                                    onChange={(e) => setAdminSearch(e.target.value)}
                                    className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                                />
                            </div>
                            <div className="rounded-full border border-slate-200 bg-white px-1">
                                <Notifications />
                            </div>
                        </div>

                        <div className="mt-4 lg:hidden">
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                                Chuyển khu vực quản trị
                            </label>
                            <select
                                value={activeTab}
                                onChange={(e) => setActiveTab(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                            >
                                {adminTabs.map((tab) => (
                                    <option key={tab.key} value={tab.key}>
                                        {tab.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </header>

                    <div className="mb-6 w-full">
                        {banners.length > 0 ? (
                            <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:h-64">
                                <div
                                    className="flex h-full transition-transform duration-700 ease-in-out"
                                    style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                                >
                                    {banners.map((banner, index) => (
                                        <img
                                            key={banner.id || index}
                                            src={getBannerSrc(banner.image_url)}
                                            className="h-full w-full flex-shrink-0 object-cover"
                                            alt={`Slide ${index + 1}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="relative flex h-56 w-full items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-slate-600 md:h-64">
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
                            readOnly
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
                    <tr key={index} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-4 py-2">
                            <input
                                type="text"
                                placeholder="Cấu hình..."
                                value={spec.group_name}
                                onChange={(e) => updateSpecField(index, 'group_name', e.target.value)}
                                className="w-full bg-transparent focus:bg-white border-transparent focus:border-slate-400 px-2 py-1.5 rounded text-sm outline-none transition"
                            />
                        </td>
                        <td className="px-4 py-2">
                            <input
                                type="text"
                                placeholder="RAM, CPU..."
                                value={spec.spec_key}
                                onChange={(e) => updateSpecField(index, 'spec_key', e.target.value)}
                                className="w-full bg-transparent focus:bg-white border-transparent focus:border-slate-400 px-2 py-1.5 rounded text-sm outline-none transition font-medium text-gray-700"
                            />
                        </td>
                        <td className="px-4 py-2">
                            <input
                                type="text"
                                placeholder="8GB, Apple M1..."
                                value={spec.spec_value}
                                onChange={(e) => updateSpecField(index, 'spec_value', e.target.value)}
                                className="w-full bg-transparent focus:bg-white border-transparent focus:border-slate-400 px-2 py-1.5 rounded text-sm outline-none transition"
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
            className="flex-1 flex justify-center items-center gap-2 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:border-gray-400"
        >
            <span>+ Thêm dòng (Cùng nhóm)</span>
        </button>

        <button
            type="button"
            onClick={() => setSpecs([...specs, { group_name: '', spec_key: '', spec_value: '' }])}
            className="flex-1 flex justify-center items-center gap-2 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:border-gray-400"
        >
            <span>+ Thêm nhóm mới</span>
        </button>
    </div>
</div>
                        <button
                            type="submit"
                            className="w-full rounded border border-gray-600 bg-white py-2 font-semibold text-gray-700 transition hover:bg-gray-100"
                        >
                            {editingProduct ? 'Cập nhật sản phẩm' : ' Thêm sản phẩm'}
                        </button>
                    </form>

                    <h2 className="text-2xl font-semibold mb-4">Danh sách sản phẩm</h2>
                    {normalizedSearch && (
                        <p className="mb-3 text-sm text-slate-500">
                            Kết quả tìm kiếm: {filteredProducts.length} sản phẩm
                        </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 items-stretch">
                        {filteredProducts.map((item) => (
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
                                    <p className={`text-sm font-medium ${item.is_out_of_stock ? 'text-red-600' : 'text-green-600'}`}>
                                        {item.is_out_of_stock ? 'Trạng thái: Hết hàng' : 'Trạng thái: Còn hàng'}
                                    </p>
                                </div>

                                <div className="mt-auto flex gap-2 justify-center pt-3 flex-wrap">
                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="rounded border border-gray-500 px-4 py-1.5 text-sm text-gray-700 transition hover:bg-gray-100"
                                    >
                                        Sửa
                                    </button>
                                    <button
                                        onClick={() => handleToggleOutOfStock(item)}
                                        className={`rounded border px-4 py-1.5 text-sm transition ${item.is_out_of_stock
                                            ? 'border-green-500 text-green-600 hover:bg-green-50'
                                            : 'border-amber-500 text-amber-600 hover:bg-amber-50'
                                            }`}
                                    >
                                        {item.is_out_of_stock ? 'Mở bán' : 'Hết hàng'}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="rounded border border-red-500 px-4 py-1.5 text-sm text-red-500 transition hover:bg-red-50"
                                    >
                                        Xóa
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {normalizedSearch && filteredProducts.length === 0 && (
                        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            Không tìm thấy sản phẩm phù hợp.
                        </div>
                    )}
                </>
            ) : activeTab === 'orders' ? (
                <OrderManagement />
            ) : activeTab === 'inventory' ? (
                <InventoryManagement />
            ) : activeTab === 'revenue' ? (
                <RevenueManagement />
            ) : activeTab === 'users' ? (
                <AdminUsers />
            ) : activeTab === 'banners' ? (
                 <AdminBanner />
            ) : (
                <SupportManagement />
            )}

                    <Footers />
                </main>
            </div>

            {/* ✅ Popup thông báo kiểu alert */}
          {popup.show && (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[9999]">
    <div
      className={`rounded-xl shadow-lg p-6 w-[350px] text-center 
      bg-white text-black`}
    >
      <h2 className="text-lg font-semibold mb-3">
        {popup.type === 'success' ? 'Thành công' : 'Thông báo'}
      </h2>

      <p className="mb-5">{popup.message}</p>

      <button
        onClick={closePopup}
        className="w-full rounded border border-gray-600 bg-white py-2 font-semibold text-gray-700 transition hover:bg-gray-100"
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
