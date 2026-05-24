import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import axios from "axios";
import Home from "./Home";
import Footers from "./Footers";
import { useCart } from "../context/CartContext";
import Carousel from "./Carousel";
import CartItem from "./CartItem";
import { ChevronDown, ChevronUp, ThumbsUp } from 'lucide-react';

const SIDE_PREFIX = "side::";

const isSideBanner = (imageUrl = "") => imageUrl.startsWith(SIDE_PREFIX);
const toDisplayImageUrl = (imageUrl = "") => imageUrl.replace(SIDE_PREFIX, "");

const formatPrice = (price) => {
    const numPrice = Math.floor(parseFloat(price));
    return numPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const getImageSrc = (image) => {
    if (!image) return "";

    const normalize = (value) => {
        if (!value || typeof value !== "string") return "";
        const trimmed = value.trim();
        if (!trimmed) return "";
        if (/^(https?:\/\/|data:|blob:|\/)/i.test(trimmed)) {
            return trimmed;
        }
        const normalizedFileName = trimmed.split(/[/\\]/).pop();
        if (!normalizedFileName) return "";
        return `/assets/${normalizedFileName}`;
    };

    if (typeof image === "string") return normalize(image);
    if (typeof image === "object") return normalize(image.url || image.image_url || "");
    return "";
};
 

const isProductOutOfStock = (item) => {
    const qty = Number(item?.stock_quantity);
    const hasQty = Number.isFinite(qty);
    return Boolean(item?.is_out_of_stock) || (hasQty && qty <= 0);
};

const ProductDetail = () => {
    const { id } = useParams();
    const location = useLocation();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isFavorite, setIsFavorite] = useState(false);
    const { addToCart } = useCart();
    const [selectedImage, setSelectedImage] = useState("");
    const userSelectedImageRef = useRef(false);
    const revertTimerRef = useRef(null);

    const clearRevertTimer = () => {
        if (revertTimerRef.current) {
            clearTimeout(revertTimerRef.current);
            revertTimerRef.current = null;
        }
    };

    const scheduleRevertToDefault = (overrideProduct) => {
        // xóa timer cũ nếu có
        clearRevertTimer();

        // compute default image at the time of scheduling
        const p = overrideProduct || product;
        const routeImage = location && location.state && (location.state.image || location.state.img || location.state.thumbnail);
        const imgs = p && Array.isArray(p.images)
            ? p.images
            : p && typeof p.images === "string"
                ? p.images.split(",")
                : [];
        const defaultImg = routeImage ? getImageSrc(routeImage) : (imgs.length > 0 ? getImageSrc(imgs[0]) : getImageSrc(p?.image));

        // Đặt timer 60s (60000 ms)
        revertTimerRef.current = setTimeout(() => {
            userSelectedImageRef.current = false;
            if (defaultImg) setSelectedImage(defaultImg);
            revertTimerRef.current = null;
        }, 30000);
    };

    const [reviews, setReviews] = useState([]);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [canReview, setCanReview] = useState(false);
    const [accessoryProducts, setAccessoryProducts] = useState([]);
    const [openSpecGroups, setOpenSpecGroups] = useState({});
    const [sideBanner, setSideBanner] = useState(null);

    const toggleSpecGroup = (groupName) => {
        setOpenSpecGroups((prev) => ({
            ...prev,
            [groupName]: !prev[groupName]
        }));
    };

    const fetchReviews = useCallback(async (productId) => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`http://localhost:5000/api/reviews/${productId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            setReviews(res.data || []);
        } catch (err) {
            console.error("Lỗi lấy đánh giá:", err);
        }
    }, []);

    const checkCanReview = useCallback(async (productId) => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                setCanReview(false);
                return;
            }

            const res = await axios.get("http://localhost:5000/api/reviews/can-review", {
                params: { productId },
                headers: { Authorization: `Bearer ${token}` },
            });

            setCanReview(Boolean(res.data?.canReview));
        } catch (err) {
            setCanReview(false);
        }
    }, []);

    const handleSubmitReview = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                alert("Vui lòng đăng nhập để đánh giá");
                return;
            }

            if (!comment.trim()) {
                alert("Vui lòng nhập nội dung đánh giá");
                return;
            }

            await axios.post(
                "http://localhost:5000/api/reviews",
                {
                    productId: product.id,
                    rating,
                    comment: comment.trim(),
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            alert("Gửi đánh giá thành công");
            setComment("");
            setRating(5);
            setCanReview(false);
            await fetchReviews(product.id);
        } catch (err) {
            const message = err?.response?.data?.message || "Không thể gửi đánh giá";
            alert(message);
        }
    };

    const handleLikeReview = async (reviewId) => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                alert("Vui lòng đăng nhập để thực hiện thao tác này");
                return;
            }

            const res = await axios.post(
                `http://localhost:5000/api/reviews/${reviewId}/like`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const { liked, likes_count } = res.data;
            setReviews((prev) =>
                prev.map((review) =>
                    review.id === reviewId
                        ? { ...review, likes_count: likes_count, liked_by_user: liked }
                        : review
                )
            );
        } catch (err) {
            const message = err?.response?.data?.message;
            if (err?.response?.status === 401) alert("Vui lòng đăng nhập");
            else if (message) alert(message);
            else console.error("Không thể like đánh giá:", err);
        }
    };

    // Hàm lấy danh sách ảnh đã chuẩn hóa
    const getGalleryImages = useCallback(() => {
        if (!product) return [];
        const raw = Array.isArray(product.images)
            ? product.images
            : typeof product.images === "string"
                ? product.images.split(",")
                : [];
        return raw.map((img) => getImageSrc(img)).filter(Boolean);
    }, [product]);

    const galleryImages = getGalleryImages();

    useEffect(() => {
        // Khi vào trang mới (id thay đổi), reset flag user selection
        userSelectedImageRef.current = false;
        const fetchProduct = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/products/${id}`);
                setProduct(res.data);
                // Nếu điều hướng tới trang này có truyền `state.image`, ưu tiên dùng ảnh đó
                const routeImage = location && location.state && (location.state.image || location.state.img || location.state.thumbnail);
                const images = Array.isArray(res.data.images)
                    ? res.data.images
                    : typeof res.data.images === "string"
                        ? res.data.images.split(",")
                        : [];

                const defaultImg = routeImage ? getImageSrc(routeImage) : (images.length > 0 ? getImageSrc(images[0]) : getImageSrc(res.data.image));

                // Chỉ set ảnh mặc định nếu user chưa chọn thumbnail (để tránh tự động revert)
                if (!userSelectedImageRef.current) {
                    setSelectedImage(defaultImg);
                }

                const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
                setIsFavorite(favorites.some((item) => item.id === parseInt(id)));
            } catch (err) {
                setError("Không tìm thấy sản phẩm.");
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();

        const intervalId = setInterval(() => {
            fetchProduct();
        }, 1000);

        return () => {
            clearInterval(intervalId);
            clearRevertTimer();
        };
    }, [id]);
    useEffect(() => {
        if (!product) return;
        fetchReviews(product.id);
        checkCanReview(product.id);
    }, [product, fetchReviews, checkCanReview]);

    useEffect(() => {
        if (location.hash !== "#reviews") return;

        const timer = setTimeout(() => {
            const reviewSection = document.getElementById("product-reviews");
            if (reviewSection) {
                reviewSection.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [location.hash, product]);

    useEffect(() => {
        const fetchAccessoryProducts = async () => {
            try {
                const res = await axios.get("http://localhost:5000/api/products");
                const normalizedAccessoryProducts = (res.data || []).filter((item) => {
                    const category = String(item?.category || "").trim().toLowerCase();
                    return ["accessory", "phu kien", "phụ kiện"].includes(category);
                });

                setAccessoryProducts(
                    normalizedAccessoryProducts
                        .filter((item) => item.id !== Number(id))
                        .slice(0, 10)
                );
            } catch (err) {
                setAccessoryProducts([]);
            }
        };

        fetchAccessoryProducts();
    }, [id]);

    useEffect(() => {
        fetch("http://localhost:5000/api/banners")
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    const firstSideBanner = data.find((item) => isSideBanner(item.image_url));
                    setSideBanner(firstSideBanner || null);
                }
            })
            .catch(() => setSideBanner(null));
    }, []);

    // Xử lý phím mũi tên điều hướng ảnh
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (galleryImages.length <= 1) return;

            const currentIndex = galleryImages.indexOf(selectedImage);
            
            if (e.key === "ArrowRight") {
                const nextIndex = (currentIndex + 1) % galleryImages.length;
                const nextImg = galleryImages[nextIndex];
                setSelectedImage(nextImg);
                userSelectedImageRef.current = true;
                scheduleRevertToDefault();
            } else if (e.key === "ArrowLeft") {
                const prevIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
                const prevImg = galleryImages[prevIndex];
                setSelectedImage(prevImg);
                userSelectedImageRef.current = true;
                scheduleRevertToDefault();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedImage, galleryImages]);

    const handleAddToCart = () => {
        if (product) {
            if (isProductOutOfStock(product)) {
                alert("Sản phẩm hiện đang hết hàng");
                return;
            }
            addToCart(product);
            alert(" Đã thêm sản phẩm vào giỏ hàng!");
        }
    };

    const toggleFavorite = () => {
        if (!product) return;
        const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
        if (isFavorite) {
            const updated = favorites.filter((item) => item.id !== product.id);
            localStorage.setItem("favorites", JSON.stringify(updated));
            setIsFavorite(false);
            alert(`❌ Đã xóa "${product.title}" khỏi danh sách yêu thích.`);
        } else {
            favorites.push(product);
            localStorage.setItem("favorites", JSON.stringify(favorites));
            setIsFavorite(true);
            alert(`💛 Đã thêm "${product.title}" vào danh sách yêu thích.`);
        }
    };

    if (loading)
        return (
            <div className="min-h-screen bg-gray-50">
                <Home />
                <Carousel />
                <div className="p-6">Đang tải...</div>
                <Footers />
            </div>
        );

    if (error)
        return (
            <div className="min-h-screen bg-gray-50">
                <Home />
                <div className="p-6 text-red-500">{error}</div>
                <Footers />
            </div>
        );

    if (!product) return null;

    const mainImage = selectedImage || getImageSrc(product.image);
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
    const groupedSpecs = (Array.isArray(product.specs) ? product.specs : []).reduce((acc, spec) => {
        const key = spec?.group_name || "Thông tin chung";
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(spec);
        return acc;
    }, {});
    const hasSpecs = Object.keys(groupedSpecs).length > 0;
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
        ? reviews.reduce((sum, item) => sum + Number(item?.rating || 0), 0) / totalReviews
        : 0;
    const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => {
        const count = reviews.filter((item) => Number(item?.rating) === star).length;
        const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
        return { star, count, percent };
    });
    const formatPercent = (value) => {
        if (value <= 0) return '0%';
        if (value >= 100) return '100%';
        return `${value.toFixed(1)}%`;
    };

    return (
        <div className="min-h-screen bg-gray-50">
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

            <section className="py-8 bg-white">
                <div className="max-w-screen-xl px-4 mx-auto">
                    <div className="lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-14 items-start">
                        <div className="w-full mx-auto lg:mx-0">
                            {/* Ảnh lớn */}
                            <img
                                src={mainImage}
                                alt={product.title}
                                onError={(e) => {
                                    e.currentTarget.src = "/assets/banner.jpg";
                                }}
                                className="w-full h-auto rounded-lg shadow-md mb-4"
                            />

                            {/* Ảnh nhỏ */}
                            <div className="flex gap-2 justify-center lg:justify-start mt-2 flex-wrap">
                                {galleryImages.map((img, index) => (
                                    <img
                                        key={index}
                                        src={img}
                                        alt={`thumb-${index + 1}`}
                                        onClick={() => {
                                            setSelectedImage(img);
                                            userSelectedImageRef.current = true;
                                            scheduleRevertToDefault();
                                        }}
                                        onError={(e) => {
                                            e.currentTarget.style.display = "none";
                                        }}
                                        className={`w-16 h-16 object-cover rounded cursor-pointer border-2 transition ${
                                            selectedImage === img ? "border-red-500 scale-105" : "border-gray-200"
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="mt-6 sm:mt-8 lg:mt-0 lg:pl-8 xl:pl-10">
                            <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
                                {product.title}
                            </h1>

                            <div className="mt-4 sm:items-center sm:gap-4 sm:flex">
                                <p className="text-2xl font-extrabold text-red-600 sm:text-3xl">
                                    {formatPrice(product.price)}₫
                                </p>
                                <p className="text-gray-500 line-through mb-1">
                                    {formatPrice(product.originalprice)}₫
                                </p>
                            </div>

                            <div className="mt-6 sm:gap-4 sm:items-center sm:flex sm:mt-8">
                                <button
                                    onClick={toggleFavorite}
                                    className={`flex items-center justify-center py-2.5 px-5 text-sm font-medium rounded-lg border transition-all ${
                                        isFavorite
                                            ? "bg-red-100 border-red-500 text-red-600"
                                            : "bg-white border-gray-200 text-gray-900 hover:bg-gray-100"
                                    }`}
                                >
                                    <svg
                                        className="w-5 h-5 -ms-2 me-2"
                                        fill={isFavorite ? "red" : "none"}
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M12.01 6.001C6.5 1 1 8 5.782 13.001L12.011 20l6.23-7C23 8 17.5 1 12.01 6.002Z"
                                        />
                                    </svg>
                                    {isFavorite ? "Đã yêu thích" : "Yêu thích"}
                                </button>

                                <button
                                    onClick={handleAddToCart}
                                    disabled={isProductOutOfStock(product)}
                                    className={`mt-4 sm:mt-0 font-medium rounded-lg text-sm px-5 py-2.5 flex items-center justify-center ${
                                        isProductOutOfStock(product)
                                            ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                                            : "text-white bg-[#ffd400] hover:bg-yellow-500 focus:ring-4 focus:ring-yellow-300"
                                    }`}
                                >
                                    {isProductOutOfStock(product) ? "Hết hàng" : "Thêm vào giỏ"}
                                </button>
                            </div>

                            <hr className="my-6 md:my-8 border-gray-200" />
                            <p className="mb-6 text-gray-600">{product.tag}</p>
                            <p className="text-gray-700">
                                Hãy mua ngay chúng tôi luôn bán những sản phẩm tốt nhất trong
                                thị trường hiện nay.
                            </p>

                        </div>  
                              

                    </div>
                </div>
            </section>

            {/* ================= THÔNG SỐ KỸ THUẬT ================= */}
       
        <section className="max-w-screen-xl mx-auto px-4 mt-8 bg-white p-6 rounded shadow-sm">
    <h3 className="text-xl font-semibold mb-6">Thông số kỹ thuật</h3>

    {product.specs_image && (
                <div className="mb-6 flex justify-center lg:justify-start">
            <img
                src={getImageSrc(product.specs_image)}
                alt="Thông số kỹ thuật"
                onError={(e) => {
                    e.currentTarget.style.display = "none";
                }}
                        className="max-w-2xl w-full h-auto rounded border border-gray-200"
            />
        </div>
    )}

    {hasSpecs ? (
        Object.entries(groupedSpecs).map(([group, items]) => {
            const isOpen = Boolean(openSpecGroups[group]);

            return (
                <div key={group} className="mb-0 border-b border-gray-100 last:border-none">
                    {/* Nút bấm: Bỏ bg-gray-50, dùng text-gray-700 để chữ nhạt hơn */}
                    <button
                        type="button"
                        onClick={() => toggleSpecGroup(group)}
                        className="w-full flex justify-between items-center py-4 bg-white hover:text-yellow-600 transition-colors group"
                    >
                        <span className="text-[15px] font-medium text-gray-700 group-hover:text-yellow-600">
                            {group}
                        </span>
                        <div className="text-gray-400">
                            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                    </button>

                    {/* Nội dung bên trong */}
                    {isOpen && (
                        <div className="bg-white pb-4 animate-fadeIn">
                            {items.map((spec, idx) => (
                                <div key={idx}>
                                    <div className="grid grid-cols-[240px_minmax(0,1fr)] items-start gap-4 py-2 text-[14px] leading-6">
                                        <span className="text-gray-500">{spec.spec_key}</span>
                                        <span className="text-gray-800 text-left font-normal">
                                            {spec.spec_value}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        })
    ) : (
        <div className="text-sm text-gray-400 italic">
            Chưa có thông số kỹ thuật cho sản phẩm này.
        </div>
    )}
</section>

{/* ================= REVIEW ================= */}
<div id="product-reviews" className="max-w-screen-xl mx-auto px-4 mt-10 bg-white p-6 rounded">
    <h2 className="text-xl font-semibold mb-4">Đánh giá sản phẩm</h2>

    <div className="mb-6 max-w-2xl rounded-lg bg-white p-3 md:p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[130px_1fr] md:items-center">
            <div className="text-center md:text-left">
                <div className="flex items-end justify-center gap-2 md:justify-start">
                    <span className="text-yellow-500 text-lg">★</span>
                    <span className="text-4xl font-bold text-gray-900">
                        {averageRating.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </span>
                    <span className="pb-1 text-lg text-gray-400">/5</span>
                </div>
                <p className="mt-1 text-sm text-gray-700">
                    {totalReviews.toLocaleString('vi-VN')} đánh giá
                </p>
            </div>

            <div className="space-y-1.5 md:max-w-md">
                {ratingBreakdown.map((item) => (
                    <div key={item.star} className="grid grid-cols-[28px_1fr_44px] items-center gap-2 text-sm">
                        <span className="font-medium text-gray-900">
                            {item.star}<span className="text-yellow-500">★</span>
                        </span>
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                            <div
                                className="h-full rounded-full bg-blue-400"
                                style={{ width: `${Math.max(0, Math.min(100, item.percent))}%` }}
                            />
                        </div>
                        <span className="text-right font-medium text-gray-700">
                            {formatPercent(item.percent)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    </div>

    {/* FORM */}
    {canReview && (
        <div className="mb-6 border p-4 rounded">
            <h3 className="font-semibold mb-2">Viết đánh giá</h3>

            {/* sao */}
            <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                    <span
                        key={star}
                        onClick={() => setRating(star)}
                        className={`cursor-pointer text-2xl ${
                            star <= rating ? "text-yellow-400" : "text-gray-300"
                        }`}
                    >
                        ★
                    </span>
                ))}
            </div>

            {/* comment */}
            <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Nhập đánh giá của bạn..."
                className="w-full border p-2 rounded mb-2"
            />

            <button
                onClick={handleSubmitReview}
                className="px-4 py-1.5 bg-white text-red-700 border border-blue-300 rounded text-sm hover:bg-blue-50 shadow-sm"
            >
                Gửi đánh giá
            </button>
        </div>
    )}

 {/* LIST REVIEW */}
{reviews.length === 0 ? (
    <p className="text-gray-500 italic py-10 text-center">Chưa có đánh giá nào</p>
) : (
    reviews.map((r, index) => {
        const reviewDate = new Date(r.created_at);
        const formattedDate = reviewDate.toLocaleDateString('vi-VN');
        const fullName = [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || r.email;

        return (
            <div key={index} className="border-b border-gray-100 py-6 last:border-b-0">
                
                {/* 1. Hàng Tên + Tích xanh */}
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-[16px] text-gray-900">{fullName}</span>
                    <div className="flex items-center gap-1 text-[13px] text-green-600">
                        <div className="border border-green-600 rounded-full p-0.5">
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <span>Đã mua tại cửa hàng</span>
                    </div>
                </div>

                {/* 2. Hàng Sao + Trái tim giới thiệu */}
                <div className="flex items-center gap-3 mb-2 text-[14px]">
                    <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                            <span key={i} className={`text-[18px] ${i < r.rating ? "text-orange-500" : "text-gray-200"}`}>
                                ★
                            </span>
                        ))}
                    </div>
                    {r.rating >= 4 && (
                        <div className="flex items-center gap-1.5 text-gray-700 ml-2 border-l pl-3 border-gray-200">
                            <span className="text-red-500 text-[16px]">❤</span> 
                            <span>Sẽ giới thiệu cho bạn bè, người thân</span>
                        </div>
                    )}
                </div>

                {/* 3. Nội dung bình luận */}
                <p className="text-[15px] text-gray-800 leading-relaxed mb-3">
                    {r.comment}
                </p>

                {/* 5.*/}
                <div className="flex items-center gap-4 text-[13px] text-gray-400">
                    <button
                        type="button"
                        onClick={() => handleLikeReview(r.id)}
                        disabled={Boolean(r.liked_by_user)}
                        className={`flex items-center gap-1.5 transition-colors ${r.liked_by_user ? 'text-gray-400 cursor-default' : 'hover:text-blue-500'}`}
                    >
                        <ThumbsUp className="h-4 w-4" />
                        <span className="text-gray-500">{r.liked_by_user ? `Đã hữu ích (${Number(r.likes_count || 0)})` : `Hữu ích (${Number(r.likes_count || 0)})`}</span>
                    </button>
                    <span className="border-l pl-4 border-gray-200">Đăng ngày {formattedDate}</span>
                </div>
            </div>
        );
    })
)}
</div>
            <section className="max-w-screen-xl mx-auto px-4 mt-8 bg-white p-6 rounded">
    <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Phụ kiện liên quan</h2>
        <Link to="/?category=accessory" className="text-blue-600 hover:underline text-sm">
            Xem tất cả
        </Link>
    </div>

    {accessoryProducts.length === 0 ? (
        <p className="text-gray-500 italic">Chưa có sản phẩm phụ kiện phù hợp</p>
    ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {accessoryProducts.map((item) => (
                <CartItem
                    key={item.id}
                    id={item.id}
                    image={getImageSrc(item.image)}
                    title={item.title}
                    originalprice={item.originalprice || item.price}
                    price={item.price}
                    discount={item.discount || 0}
                    sold={item.sold || 0}
                    rating={item.average_rating ?? item.rating ?? 0}
                />
            ))}
        </div>
    )}
</section>
            <Footers />
        </div>
    );
};

export default ProductDetail;