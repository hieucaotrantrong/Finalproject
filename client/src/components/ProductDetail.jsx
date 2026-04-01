import React, { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import Home from "./Home";
import Footers from "./Footers";
import { useCart } from "../context/CartContext";
import Carousel from "./Carousel";
import CartItem from "./CartItem";
import { ChevronDown, ChevronUp } from 'lucide-react';

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

const ProductDetail = () => {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isFavorite, setIsFavorite] = useState(false);
    const { addToCart } = useCart();
    const [selectedImage, setSelectedImage] = useState("");

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
            const res = await axios.get(`http://localhost:5000/api/reviews/${productId}`);
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
        const fetchProduct = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/products/${id}`);
                setProduct(res.data);

                const images = Array.isArray(res.data.images)
                    ? res.data.images
                    : typeof res.data.images === "string"
                        ? res.data.images.split(",")
                        : [];

                if (images.length > 0) {
                    setSelectedImage(getImageSrc(images[0]));
                } else {
                    setSelectedImage(getImageSrc(res.data.image));
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
    }, [id]);
    useEffect(() => {
        if (!product) return;
        fetchReviews(product.id);
        checkCanReview(product.id);
    }, [product, fetchReviews, checkCanReview]);

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
                setSelectedImage(galleryImages[nextIndex]);
            } else if (e.key === "ArrowLeft") {
                const prevIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
                setSelectedImage(galleryImages[prevIndex]);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedImage, galleryImages]);

    const handleAddToCart = () => {
        if (product) {
            if (Boolean(product.is_out_of_stock)) {
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
                    <div className="lg:grid lg:grid-cols-2 lg:gap-8 xl:gap-16">
                        <div className="shrink-0 max-w-md lg:max-w-lg mx-auto">
                            {/* Ảnh lớn */}
                            <img
                                src={mainImage}
                                alt={product.title}
                                onError={(e) => {
                                    e.currentTarget.src = "/assets/banner.jpg";
                                }}
                                className="w-full max-w-md rounded-lg shadow-md mb-4"
                            />

                            {/* Ảnh nhỏ */}
                            <div className="flex gap-2 justify-center mt-2 flex-wrap">
                                {galleryImages.map((img, index) => (
                                    <img
                                        key={index}
                                        src={img}
                                        alt={`thumb-${index + 1}`}
                                        onClick={() => setSelectedImage(img)}
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

                        <div className="mt-6 sm:mt-8 lg:mt-0">
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
                                    disabled={Boolean(product.is_out_of_stock)}
                                    className={`mt-4 sm:mt-0 font-medium rounded-lg text-sm px-5 py-2.5 flex items-center justify-center ${
                                        Boolean(product.is_out_of_stock)
                                            ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                                            : "text-white bg-[#ffd400] hover:bg-yellow-500 focus:ring-4 focus:ring-yellow-300"
                                    }`}
                                >
                                    {Boolean(product.is_out_of_stock) ? "Hết hàng" : "Thêm vào giỏ"}
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
            {/* ================= THÔNG SỐ KỸ THUẬT ================= */}
<section className="max-w-screen-xl mx-auto px-4 mt-8 bg-white p-6 rounded shadow-sm">
    <h3 className="text-xl font-semibold mb-6">Thông số kỹ thuật</h3>

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
                                <div
                                    key={idx}
                                    className="flex justify-between py-2 text-[14px] leading-6"
                                >
                                    {/* Chữ bên trái nhạt, bên phải đậm vừa phải */}
                                    <span className="text-gray-500 w-1/2">{spec.spec_key}</span>
                                    <span className="text-gray-800 w-1/2 text-left pl-4 font-normal">
                                        {spec.spec_value}
                                    </span>
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
<div className="max-w-screen-xl mx-auto px-4 mt-10 bg-white p-6 rounded">
    <h2 className="text-xl font-semibold mb-4">Đánh giá sản phẩm</h2>

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
                className="bg-red-500 text-white px-4 py-2 rounded"
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
                    <button className="flex items-center gap-1.5 hover:text-blue-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M14 10h4.708a2 2 0 011.965 2.344l-1.464 7.32A2 2 0 0117.244 22H7.51a2 2 0 01-1.939-1.483L3.5 10.5h2M14 10V4a2 2 0 00-2-2h-3a2 2 0 00-2 2v6m7 10V10"></path>
                        </svg>
                        <span className="text-gray-500">Hữu ích (0)</span>
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