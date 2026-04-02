import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
    FaUser,
    FaShoppingCart,
    FaSearch,
} from "react-icons/fa";

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

const SIDE_PREFIX = "side::";
const TOP_PREFIX = "top::";

const isSideBanner = (imageUrl = "") => imageUrl.startsWith(SIDE_PREFIX);
const isTopBanner = (imageUrl = "") => imageUrl.startsWith(TOP_PREFIX);
const toDisplayImageUrl = (imageUrl = "") => imageUrl.replace(SIDE_PREFIX, "").replace(TOP_PREFIX, "");

export default function Header({ initialSearchQuery = '', onSearchSubmit, onCategorySelect, onSearchClear }) {

    const navigate = useNavigate();
    const searchRef = useRef(null);

    const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
    const [suggestions, setSuggestions] = useState([]);
    const [searchHistory, setSearchHistory] = useState([]);
    const [showSuggest, setShowSuggest] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [debounceTimer, setDebounceTimer] = useState(null);
    const [topBannerUrl, setTopBannerUrl] = useState("");

    useEffect(() => {
        const history = JSON.parse(localStorage.getItem("searchHistory")) || [];
        setSearchHistory(history);
    }, []);

    useEffect(() => {
        setSearchQuery(initialSearchQuery);
    }, [initialSearchQuery]);

    useEffect(() => {
        fetch("http://localhost:5000/api/banners")
            .then((res) => res.json())
            .then((data) => {
                if (!Array.isArray(data) || data.length === 0) {
                    setTopBannerUrl("");
                    return;
                }

                const preferredBanner = data.find((item) => isTopBanner(item.image_url));

                if (!preferredBanner) {
                    setTopBannerUrl("");
                    return;
                }

                const cleanImageUrl = toDisplayImageUrl(preferredBanner?.image_url || "");

                if (!cleanImageUrl) {
                    setTopBannerUrl("");
                    return;
                }

                if (
                    cleanImageUrl.startsWith("http://") ||
                    cleanImageUrl.startsWith("https://") ||
                    cleanImageUrl.startsWith("/")
                ) {
                    setTopBannerUrl(cleanImageUrl);
                    return;
                }

                setTopBannerUrl(`/assets/${cleanImageUrl}`);
            })
            .catch(() => setTopBannerUrl(""));
    }, []);

    // Click outside close dropdown
    useEffect(() => {

        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSuggest(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };

    }, []);

    const handleSearch = (e) => {

        const value = e.target.value;
        setSearchQuery(value);
        setActiveIndex(-1);

        if (!value.trim()) {
            setShowSuggest(false);
            onSearchClear?.();
        }

        if (debounceTimer) clearTimeout(debounceTimer);

        const timer = setTimeout(async () => {

            if (value.length === 0) {
                setShowSuggest(false);
                return;
            }

            try {

                const res = await fetch("http://localhost:5000/api/products");
                const data = await res.json();

                const filtered = data.filter(p =>
                    p.title.toLowerCase().includes(value.toLowerCase())
                );

                setSuggestions(filtered.slice(0,5));
                setShowSuggest(true);

            } catch(err) {
                console.log(err);
            }

        },300);

        setDebounceTimer(timer);
    };

    const handleEnterSearch = (e) => {

        if (e.key === "Escape") {
            setShowSuggest(false);
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex(prev =>
                prev < suggestions.length + searchHistory.length - 1 ? prev + 1 : prev
            );
            return;
        }

        if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
            return;
        }

        if (e.key === "Enter") {

            if (activeIndex >= 0) {

                const allItems = [
                    ...suggestions.map(i => ({ type:"product", data:i })),
                    ...searchHistory.map(i => ({ type:"history", data:i }))
                ];

                const selected = allItems[activeIndex];

                setShowSuggest(false);

                if (selected.type === "product") {
                    navigate(`/product/${selected.data.id}`);
                } else {
                    onSearchSubmit?.(selected.data);
                }

                return;
            }

            const trimmedQuery = searchQuery.trim();

            if (!trimmedQuery) {
                onSearchClear?.();
                setShowSuggest(false);
                return;
            }

            const history = JSON.parse(localStorage.getItem("searchHistory")) || [];

            const newHistory = [trimmedQuery, ...history.filter(h => h !== trimmedQuery)].slice(0,5);

            localStorage.setItem("searchHistory", JSON.stringify(newHistory));
            setSearchHistory(newHistory);

            setShowSuggest(false);

            onSearchSubmit?.(trimmedQuery);
        }
    };

    const handleCategoryClick = (label) => {

        const categoryMap = {
            'Điện thoại': 'phone',
            'Laptop': 'laptop',
            'Phụ kiện': 'accessory',
            'Smartwatch': 'smartwatch',
            'Đồng Hồ': 'watch',
            'Tablet': 'tablet'
        };

        const category = categoryMap[label];

        if (category) {
            setSearchQuery('');
            setShowSuggest(false);
            onCategorySelect?.(category);
        }
    };

    return (
        <div className="w-full">

            {topBannerUrl && (
                <div className="w-full bg-[#fbc219] border-b border-[#f2b700]">
                    <div className="w-full max-w-[1280px] mx-auto px-4 py-0">
                        <img
                            src={topBannerUrl}
                            alt="Top header banner"
                            className="block w-full h-[40px] md:h-[42px] object-cover object-center"
                        />
                    </div>
                </div>
            )}

            <header className="w-full bg-[#ffd400]">

                <div className="w-full max-w-[1280px] mx-auto flex items-center px-4 py-2">

                <div className="flex items-center w-[600px]">

                    <img
                        src="./assets/logo.jpg"
                        alt="Logo"
                        className="h-10 object-contain cursor-pointer"
                        onClick={() => navigate('/')}
                    />

                    <div ref={searchRef} className="relative ml-2 flex-1">

                        <div className="flex items-center bg-white rounded-full px-3 py-1">

                            <FaSearch className="text-gray-500 text-sm" />

                            <input
                                type="text"
                                placeholder="Bạn tìm gì..."
                                value={searchQuery}
                                onChange={handleSearch}
                                onKeyDown={handleEnterSearch}
                                className="w-full px-2 py-1 text-sm outline-none bg-transparent"
                            />

                        </div>

                        {showSuggest && (
                        <div className="absolute top-10 left-0 w-full bg-white shadow-lg rounded-md z-50">

                            {suggestions.map((item, index) => (
                                <div
                                    key={item.id}
                                    onClick={() => {
                                        setShowSuggest(false);
                                        navigate(`/product/${item.id}`);
                                    }}
                                    className={`px-3 py-2 cursor-pointer text-sm ${
                                        activeIndex === index
                                            ? "bg-gray-200"
                                            : "hover:bg-gray-100"
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

                                {searchHistory.map((item,index) => (
                                    <div
                                        key={index}
                                        onClick={() => {
                                            setSearchQuery(item);
                                            setShowSuggest(false);
                                            onSearchSubmit?.(item);
                                        }}
                                        className={`px-3 py-2 cursor-pointer text-sm ${
                                            activeIndex === suggestions.length + index
                                                ? "bg-gray-200"
                                                : "hover:bg-gray-100"
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

                <div className="flex items-center gap-14 ml-8">

                    <Link to="/login" className="flex items-center gap-1 text-sm font-normal hover:underline">
                        <FaUser />
                        Đăng nhập
                    </Link>

                    <Link to="/signup" className="text-sm font-normal hover:underline">
                        Đăng ký
                    </Link>

                    <Link
                        to="/login?redirect=/cart"
                        className="flex items-center gap-1 hover:underline cursor-pointer text-sm"
                    >
                        <FaShoppingCart />
                        Giỏ hàng
                    </Link>

                </div>

            </div>

                <div className="w-full max-w-[1280px] mx-auto flex flex-wrap gap-7 px-4 py-3 text-sm font-normal">

                {menuItems.map((item, index) => (
                    <div
                        key={index}
                        onClick={() => handleCategoryClick(item.label)}
                        className="flex items-center gap-1 cursor-pointer hover:underline"
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </div>
                ))}

                </div>

            </header>

        </div>
    );
}