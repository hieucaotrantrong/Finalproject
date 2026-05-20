import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { FaHeart } from "react-icons/fa";

import { ChevronDownIcon, PhoneIcon, PlayCircleIcon } from '@heroicons/react/20/solid';
import Notifications from './Notifications';
import CartPage from './CartPage';

import {        
    FaUser,
    FaShoppingCart,
    FaMapMarkerAlt,
    FaSearch,
} from "react-icons/fa";

const DEFAULT_AVATAR = "/assets/avt22.jpg";
const API_BASE_URL = 'http://localhost:5000/api';
const TOP_PREFIX = 'top::';

const isTopBanner = (imageUrl = '') => String(imageUrl).startsWith(TOP_PREFIX);
const toDisplayImageUrl = (imageUrl = '') => String(imageUrl).replace(TOP_PREFIX, '');

const resolveBannerSrc = (imageUrl = '') => {
    const cleanImageUrl = toDisplayImageUrl(imageUrl);

    if (!cleanImageUrl) return '';

    if (
        cleanImageUrl.startsWith('http://') ||
        cleanImageUrl.startsWith('https://') ||
        cleanImageUrl.startsWith('/')
    ) {
        return cleanImageUrl;
    }

    return `/assets/${cleanImageUrl}`;
};

// Determine which avatar to display: allow external URLs only for social logins
const getDisplayAvatar = (user) => {
    if (!user) return DEFAULT_AVATAR;
    const avatar = user.avatar;
    if (!avatar) return DEFAULT_AVATAR;

    try {
        // data URL or local path always allowed
        if (avatar.startsWith('data:') || avatar.startsWith('/')) return avatar;

        const loc = window.location;
        const url = new URL(avatar, loc.origin);
        if (url.origin === loc.origin) return avatar;

        // allow external avatar if user.provider indicates social login
        if (user.provider) return avatar;

    } catch (e) {
        // fallback
    }
    return DEFAULT_AVATAR;
};

export default function Home({ onFilterChange }) {
    const [user, setUser] = useState(null);
    const [favorites, setFavorites] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [searchHistory, setSearchHistory] = useState([]);
    const [showSuggest, setShowSuggest] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [debounceTimer, setDebounceTimer] = useState(null);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);
    const [selectedProvince, setSelectedProvince] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedWard, setSelectedWard] = useState('');
    const [currentAddress, setCurrentAddress] = useState('');
    const [activeTab, setActiveTab] = useState('province');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [topBannerUrl, setTopBannerUrl] = useState('');
    const navigate = useNavigate();
    const searchRef = useRef(null);
    const { cartItems, getTotalItems, getTotalPrice, updateQuantity, removeFromCart, isCartOpen, setIsCartOpen } = useCart();

    const getLocationName = (item) => item?.ProvinceName || item?.DistrictName || item?.WardName || item?.name || '';
    const getLocationId = (item, type) => {
        if (!item) return '';
        if (type === 'province') return String(item.ProvinceID || item.code || '');
        if (type === 'district') return String(item.DistrictID || item.code || '');
        return String(item.WardCode || item.code || '');
    };

    const formatPrice = (price) => {
        const numPrice = Math.floor(parseFloat(price.toString().replace(/\./g, '')));
        return numPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    useEffect(() => {
        if (onFilterChange) {
            onFilterChange(!!(searchQuery || selectedCategory));
        }
    }, [searchQuery, selectedCategory, onFilterChange]);

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }

        // Load địa chỉ đã lưu từ localStorage
        const savedAddress = localStorage.getItem('userAddress');
        if (savedAddress) {
            const displayAddress = savedAddress.length > 25 ? savedAddress.substring(0, 25) + '...' : savedAddress;
            setCurrentAddress(displayAddress);
        } else {
            setCurrentAddress('Địa chỉ của bạn');
        }
        const favs = JSON.parse(localStorage.getItem('favorites')) || [];
        setFavorites(favs);
        const history = JSON.parse(localStorage.getItem('searchHistory')) || [];
        setSearchHistory(history);
        // Load provinces on component mount
        fetchProvinces();
    }, []);

    useEffect(() => {
        fetch('http://localhost:5000/api/banners')
            .then((res) => res.json())
            .then((data) => {
                const topBanner = (Array.isArray(data) ? data : []).find((banner) => isTopBanner(banner?.image_url));

                if (!topBanner) {
                    setTopBannerUrl('');
                    return;
                }

                setTopBannerUrl(resolveBannerSrc(topBanner.image_url));
            })
            .catch(() => setTopBannerUrl(''));
    }, []);

    useEffect(() => {
        return () => {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
        };
    }, [debounceTimer]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSuggest(false);
                setActiveIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const fetchProvinces = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/shipping/provinces`);
            const data = await response.json();
            setProvinces(data?.data || []);
        } catch (error) {
            console.error('Error fetching provinces:', error);
        }
    };

    const fetchDistricts = async (provinceCode) => {
        try {
            const response = await fetch(`${API_BASE_URL}/shipping/districts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ provinceId: Number(provinceCode) })
            });
            const data = await response.json();
            setDistricts(data?.data || []);
            setWards([]);
        } catch (error) {
            console.error('Error fetching districts:', error);
        }
    };

    const fetchWards = async (districtCode) => {
        try {
            const response = await fetch(`${API_BASE_URL}/shipping/wards`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ districtId: Number(districtCode) })
            });
            const data = await response.json();
            setWards(data?.data || []);
        } catch (error) {
            console.error('Error fetching wards:', error);
        }
    };

    const handleProvinceChange = (e) => {
        const provinceCode = e.target.value;
        setSelectedProvince(provinceCode);
        setSelectedDistrict('');
        setSelectedWard('');
        if (provinceCode) {
            fetchDistricts(provinceCode);
        } else {
            setDistricts([]);
            setWards([]);
        }
    };

    const handleDistrictChange = (e) => {
        const districtCode = e.target.value;
        setSelectedDistrict(districtCode);
        setSelectedWard('');
        if (districtCode) {
            fetchWards(districtCode);
        } else {
            setWards([]);
        }
    };

    const handleWardChange = (e) => {
        setSelectedWard(e.target.value);
    };

    const handleSaveAddress = () => {
        if (selectedProvince && selectedDistrict && selectedWard) {
            const province = provinces.find((p) => getLocationId(p, 'province') === String(selectedProvince));
            const district = districts.find((d) => getLocationId(d, 'district') === String(selectedDistrict));
            const ward = wards.find((w) => getLocationId(w, 'ward') === String(selectedWard));

            const newAddress = `${getLocationName(ward)}, ${getLocationName(district)}, ${getLocationName(province)}`;
            const fullAddress = newAddress;
            const displayAddress = newAddress.length > 25 ? newAddress.substring(0, 25) + '...' : newAddress;

            setCurrentAddress(displayAddress);

            localStorage.setItem('userAddress', fullAddress);

            setShowLocationModal(false);
        }
    };

    const handleLogout = () => {
        const confirmLogout = window.confirm('Bạn có chắc chắn muốn đăng xuất không?');
        if (confirmLogout) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/');
        }
    };
    const menuItems = [
        { icon: <img src="https://cdn.tgdd.vn/content/phonne-24x24.png" className="w-5 h-5" />, label: "Điện thoại" },
        { icon: <img src="https://cdn.tgdd.vn/content/laptop-24x24.png" className="w-5 h-5" />, label: "Laptop" },
        { icon: <img src="https://cdn.tgdd.vn/content/phu-kien-24x24.png" className="w-5 h-5" />, label: "Phụ kiện" },
        { icon: <img src="https://cdn.tgdd.vn/content/smartwatch-24x24.png" className="w-5 h-5" />, label: "Smartwatch" },
        { icon: <img src="https://cdn.tgdd.vn/content/watch-24x24.png" className="w-5 h-5" />, label: "Đồng Hồ" },
        { icon: <img src="https://cdn.tgdd.vn/content/tablet-24x24.png" className="w-5 h-5" />, label: "Tablet" },
        { icon: <img src="https://cdn.tgdd.vn/content/may-cu-24x24.png" className="w-5 h-5" />, label: "Mua máy thu cũ" },
        { icon: <img src="https://cdn.tgdd.vn/content/PC-24x24.png" className="w-5 h-5" />, label: "Màn hình, Máy in" },
        { icon: <img src="https://cdn.tgdd.vn/content/sim-24x24.png" className="w-5 h-5" />, label: "Sim, Thẻ cào" },
        { icon: <img src="https://cdn.tgdd.vn/content/tien-ich-24x24.png" className="w-5 h-5" />, label: "Dịch vụ tiện ích" },
    ];

    const handleSelectProvince = (province) => {
        const provinceId = getLocationId(province, 'province');
        setSelectedProvince(provinceId);
        setSelectedDistrict('');
        setSelectedWard('');
        fetchDistricts(provinceId);
        setActiveTab('district');
        setSearchTerm('');
    };

    const handleSelectDistrict = (district) => {
        const districtId = getLocationId(district, 'district');
        setSelectedDistrict(districtId);
        setSelectedWard('');
        fetchWards(districtId);
        setActiveTab('ward');
        setSearchTerm('');
    };

    const handleSelectWard = (ward) => {
        setSelectedWard(getLocationId(ward, 'ward'));
        const province = provinces.find((p) => getLocationId(p, 'province') === String(selectedProvince));
        const district = districts.find((d) => getLocationId(d, 'district') === String(selectedDistrict));

        const newAddress = `${getLocationName(ward)}, ${getLocationName(district)}, ${getLocationName(province)}`;
        setCurrentAddress(newAddress.length > 25 ? newAddress.substring(0, 25) + '...' : newAddress);


        localStorage.setItem('userAddress', newAddress);

        setShowLocationModal(false);
        setActiveTab('province');
        setSearchTerm('');
    };

    const getFilteredItems = () => {
        let items = [];
        if (activeTab === 'province') items = provinces;
        else if (activeTab === 'district') items = districts;
        else if (activeTab === 'ward') items = wards;

        if (searchTerm) {
            return items.filter(item => {
                const name = getLocationName(item).toLowerCase();
                const search = searchTerm.toLowerCase();

                /*----------------------------------------  
                ------------------------------------------*/
                const words = name.split(' ');
                return words.some(word => word.startsWith(search)) ||
                    name.includes(search);
            });
        }
        return items;
    };

    const getCurrentAddress = () => {
        if (selectedWard && selectedDistrict && selectedProvince) {
            const province = provinces.find((p) => getLocationId(p, 'province') === String(selectedProvince));
            const district = districts.find((d) => getLocationId(d, 'district') === String(selectedDistrict));
            return `${getLocationName(district)}, ${getLocationName(province)}`;
        }
        if (selectedDistrict && selectedProvince) {
            const province = provinces.find((p) => getLocationId(p, 'province') === String(selectedProvince));
            return getLocationName(province);
        }
        return '';
    };

    const handleCategoryClick = (categoryLabel) => {
        // Map từ label hiển thị sang category value
        const categoryMap = {
            'Điện thoại': 'phone',
            'Laptop': 'laptop',
            'Phụ kiện': 'accessory',
            'Smartwatch': 'smartwatch',
            'Đồng Hồ': 'watch',
            'Tablet': 'tablet'
        };

        const categoryValue = categoryMap[categoryLabel];
        if (categoryValue) {
            setShowSuggest(false);
            setActiveIndex(-1);
            if (!user) {
                navigate(`/?category=${categoryValue}`);
                return;
            }

            setSelectedCategory(categoryValue);
            setSearchQuery('');
        }
    };

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        setActiveIndex(-1);

        if (!value.trim()) {
            setSuggestions([]);
            setShowSuggest(false);
            setSelectedCategory('');
        }

        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }

        const timer = setTimeout(async () => {
            if (!value.trim()) {
                setSuggestions([]);
                setShowSuggest(false);
                return;
            }

            try {
                const res = await fetch('http://localhost:5000/api/products');
                const data = await res.json();

                const filtered = data.filter(product =>
                    product.title.toLowerCase().includes(value.toLowerCase())
                );

                setSuggestions(filtered.slice(0, 5));
                setShowSuggest(true);
            } catch (error) {
                console.error('Error fetching search suggestions:', error);
            }
        }, 300);

        setDebounceTimer(timer);
    };

    const runSearch = (query) => {
        const trimmedQuery = query.trim();

        if (!trimmedQuery) {
            setShowSuggest(false);
            setActiveIndex(-1);
            setSelectedCategory('');
            if (!user) {
                navigate('/');
            }
            return;
        }

        const history = JSON.parse(localStorage.getItem('searchHistory')) || [];
        const newHistory = [trimmedQuery, ...history.filter(item => item !== trimmedQuery)].slice(0, 5);

        localStorage.setItem('searchHistory', JSON.stringify(newHistory));
        setSearchHistory(newHistory);
        setSearchQuery(trimmedQuery);
        setSelectedCategory('');
        setShowSuggest(false);
        setActiveIndex(-1);

        if (!user) {
            navigate(`/?search=${encodeURIComponent(trimmedQuery)}`);
        }
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Escape') {
            setShowSuggest(false);
            setActiveIndex(-1);
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev =>
                prev < suggestions.length + searchHistory.length - 1 ? prev + 1 : prev
            );
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
            return;
        }

        if (e.key !== 'Enter') {
            return;
        }

        if (activeIndex >= 0) {
            const allItems = [
                ...suggestions.map(item => ({ type: 'product', data: item })),
                ...searchHistory.map(item => ({ type: 'history', data: item }))
            ];

            const selected = allItems[activeIndex];
            setShowSuggest(false);
            setActiveIndex(-1);

            if (!selected) {
                return;
            }

            if (selected.type === 'product') {
                navigate(`/product/${selected.data.id}`);
                return;
            }

            runSearch(selected.data);
            return;
        }

        runSearch(searchQuery);
    };

    return (
        <div>

            {topBannerUrl && (
                <div className="w-full bg-[#fbc219] border-b border-[#f2b700]">
                    <div className="w-full max-w-[1280px] mx-auto px-4 py-0">
                        <img
                            src={topBannerUrl}
                            alt="Top banner"
                            className="block w-full h-[40px] md:h-[42px] object-cover object-center"
                        />
                    </div>
                </div>
            )}

            <header className="w-full bg-[#ffd400]">
                <div className="w-full max-w-[1280px] mx-auto flex items-center justify-between px-4 py-2">

                    <div className="flex items-center flex-1 max-w-[600px]">
                        <img
                            src="/assets/logo.jpg"
                            alt="Logo"
                            className="h-8 object-contain cursor-pointer mr-4"
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedCategory('');
                                navigate(user ? '/home' : '/');
                            }}
                        />
                        <div ref={searchRef} className="relative flex-1">
                            <div className="flex items-center bg-white rounded-full px-4 py-2">
                                <FaSearch className="text-gray-500 text-sm mr-3" />
                                <input
                                    type="text"
                                    placeholder="Bạn tìm gì..."
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    onKeyDown={handleSearchKeyDown}
                                    className="w-full px-2 py-1 text-sm outline-none bg-transparent"
                                />
                            </div>

                            {showSuggest && (
                                <div className="absolute top-12 left-0 w-full bg-white shadow-lg rounded-md z-50">
                                    {suggestions.map((item, index) => (
                                        <div
                                            key={item.id}
                                            onClick={() => {
                                                setShowSuggest(false);
                                                setActiveIndex(-1);
                                                navigate(`/product/${item.id}`);
                                            }}
                                            className={`px-3 py-2 cursor-pointer text-sm ${
                                                activeIndex === index ? 'bg-gray-200' : 'hover:bg-gray-100'
                                            }`}
                                        >
                                            {item.title}
                                        </div>
                                    ))}

                                    {searchHistory.length > 0 && (
                                        <>
                                            <div className="px-3 py-2 text-xs text-gray-400">
                                                Tìm kiếm gần đây
                                            </div>

                                            {searchHistory.map((item, index) => (
                                                <div
                                                    key={index}
                                                    onClick={() => runSearch(item)}
                                                    className={`px-3 py-2 cursor-pointer text-sm ${
                                                        activeIndex === suggestions.length + index ? 'bg-gray-200' : 'hover:bg-gray-100'
                                                    }`}
                                                >
                                                    {item}
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Account + Cart + Location */}
                    <div className="flex items-center gap-6 ml-6">
                        {user ? (
                            <>
                                <Notifications />

                                <div
                                    className="flex items-center gap-1 text-sm hover:underline cursor-pointer"
                                    onClick={() => navigate('/orders')}
                                >

                                    <span>Đơn hàng</span>
                                </div>
                                <div
                                    className="flex items-center gap-1 text-sm cursor-pointer hover:underline"
                                    onClick={() => navigate('/favorites')}
                                >
                                    <FaHeart
                                        className={`transition-all ${favorites.length > 0 ? 'text-red-600 scale-110' : 'text-gray-700 hover:text-red-500'}`}
                                    />
                                    <span>({favorites.length})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <img
                                        src={getDisplayAvatar(user)}
                                        alt="avatar"
                                        className="w-8 h-8 rounded-full cursor-pointer hover:ring-2 hover:ring-blue-300"
                                        onClick={() => navigate('/profile')}
                                        title="Xem profile"
                                    />
                                    <span className="text-sm cursor-pointer max-w-[100px] truncate" onClick={() => navigate('/profile')}>
                                        {user.first_name}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="flex items-center gap-1 text-sm hover:underline">
                                    <FaUser />
                                    <span>Đăng nhập</span>
                                </Link>
                                <Link to="/signup" className="text-sm hover:underline">
                                    Đăng ký
                                </Link>
                            </>
                        )}
                        <div
                            className="flex items-center gap-1 text-sm hover:underline cursor-pointer"
                            onClick={() => navigate('/cart')}
                        >
                            <FaShoppingCart />
                            <span>Giỏ ({getTotalItems()})</span>
                        </div>
                        {user && (
                            <Link to="/support" className="text-sm font-semibold text-gray-900">
                                Hỗ trợ
                            </Link>
                        )}
                        {user && (
                            <button
                                onClick={handleLogout}
                                className="text-sm hover:underline"
                            >
                                Thoát
                            </button>
                        )}
                        <div
                            className="flex items-center gap-1 bg-yellow-300 px-3 py-2 rounded-full cursor-pointer text-sm hover:bg-yellow-400 transition-colors"
                            onClick={() => setShowLocationModal(true)}
                        >
                            <FaMapMarkerAlt />
                            <span className="truncate max-w-[150px]">{currentAddress}</span>
                        </div>
                    </div>
                </div>

                {/* Bottom Menu - Giảm padding */}
                <div className="w-full max-w-[1280px] mx-auto px-4 py-2 text-sm font-normal"> {/* Giảm py từ 3 xuống 2 */}
                    <div className="flex justify-between items-center">
                        {menuItems.map((item, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-1 cursor-pointer hover:underline"
                                onClick={() => handleCategoryClick(item.label)}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </header>

            {/* Location Modal */}
            {showLocationModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg w-[600px] max-w-[90vw] max-h-[80vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b">
                            <h3 className="text-xl font-bold">Chọn địa chỉ nhận hàng</h3>
                            <button
                                onClick={() => setShowLocationModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        {/* Current Address */}
                        <div className="px-6 py-3 bg-gray-50 border-b">
                            <p className="text-sm text-gray-600">Địa chỉ đang chọn:</p>
                            <p className="font-medium">{getCurrentAddress()}</p>
                        </div>

                        {/* Search Box */}
                        <div className="p-6 border-b">
                            <div className="relative">
                                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm nhanh tỉnh thành, quận huyện, phường xã"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b">
                            <button
                                onClick={() => setActiveTab('province')}
                                className={`flex-1 py-3 px-4 text-center font-medium ${activeTab === 'province'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-600 hover:text-gray-800'
                                    }`}
                            >
                                Tỉnh/TP
                            </button>
                            <button
                                onClick={() => setActiveTab('district')}
                                disabled={!selectedProvince}
                                className={`flex-1 py-3 px-4 text-center font-medium ${activeTab === 'district' && selectedProvince
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-400'
                                    }`}
                            >
                                Quận/Huyện
                            </button>
                            <button
                                onClick={() => setActiveTab('ward')}
                                disabled={!selectedDistrict}
                                className={`flex-1 py-3 px-4 text-center font-medium ${activeTab === 'ward' && selectedDistrict
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-400'
                                    }`}
                            >
                                Phường/Xã
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-2 gap-2">
                                {getFilteredItems().map((item) => (
                                    <button
                                        key={getLocationId(item, activeTab)}
                                        onClick={() => {
                                            if (activeTab === 'province') handleSelectProvince(item);
                                            else if (activeTab === 'district') handleSelectDistrict(item);
                                            else if (activeTab === 'ward') handleSelectWard(item);
                                        }}
                                        className="text-left p-3 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        {getLocationName(item)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t">
                            <button
                                onClick={() => {
                                    setActiveTab('province');
                                    setSearchTerm('');
                                    setSelectedProvince('');
                                    setSelectedDistrict('');
                                    setSelectedWard('');
                                }}
                                className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
                            >

                            </button>
                        </div>
                    </
                    div>
                </div>
            )}

            {/* Hiển thị kết quả lọc */}
            {user && (searchQuery || selectedCategory) ? (
                <div className="w-full max-w-[1280px] mx-auto px-4 py-6">
                    <CartPage
                        searchQuery={searchQuery}
                        categoryFilter={selectedCategory}
                    />
                </div>
            ) : (
                // Chỉ hiển thị các component khác khi KHÔNG có filter
                <>
                    {/* Các banner và component khác chỉ hiển thị khi không filter */}
                </>
            )}

            {/* Cart Modal */}
            {isCartOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg w-[800px] max-w-[90vw] max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h3 className="text-xl font-bold">Giỏ hàng của bạn</h3>
                            <button
                                onClick={() => setIsCartOpen(false)}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {cartItems.length === 0 ? (
                                <p className="text-center text-gray-500">Giỏ hàng trống</p>
                            ) : (
                                <div className="space-y-4">
                                    {cartItems.map((item) => (
                                        <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                                            <img src={item.image} alt={item.title} className="w-16 h-16 object-contain" />
                                            <div className="flex-1">
                                                <h4 className="font-medium">{item.title}</h4>
                                                <p className="text-red-600 font-bold">{formatPrice(item.price)}₫</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="w-8 h-8 flex items-center justify-center border rounded"
                                                >
                                                    -
                                                </button>
                                                <span className="w-8 text-center">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="w-8 h-8 flex items-center justify-center border rounded"
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                Xóa
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {cartItems.length > 0 && (
                            <div className="p-6 border-t">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-lg font-bold">Tổng cộng:</span>
                                    <span className="text-xl font-bold text-red-600">
                                        {formatPrice(getTotalPrice())}₫
                                    </span>
                                </div>
                                <button className="w-full bg-[#ffd400] hover:bg-yellow-500 text-black font-medium py-3 rounded-lg">
                                    Thanh toán
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            )}



        </div>
    );
}




















































