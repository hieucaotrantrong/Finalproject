import React, { useEffect, useState, useRef } from "react";
import Home from "./Home";
import Footers from "./Footers";
import Carousel from "./Carousel";
import { useCart } from "../context/CartContext";
import CartItem from "./CartItem";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/20/solid";

const SIDE_PREFIX = "side::";

const isSideBanner = (imageUrl = "") => imageUrl.startsWith(SIDE_PREFIX);
const toDisplayImageUrl = (imageUrl = "") => imageUrl.replace(SIDE_PREFIX, "");
const normalizeOutOfStock = (value) => value === true || value === 1 || value === "1" || value === "true";
const normalizeStockQuantity = (value) => {
    const qty = Number(value);
    return Number.isFinite(qty) ? qty : null;
};
const isProductOutOfStock = (product) => {
    const qty = normalizeStockQuantity(product?.stock_quantity);
    return normalizeOutOfStock(product?.is_out_of_stock) || (qty !== null && qty <= 0);
};

const FavoritePage = () => {
    const [favorites, setFavorites] = useState([]);
    const [sideBanner, setSideBanner] = useState(null);
    const { addToCart } = useCart();
    const carouselRef = useRef(null);

    const syncFavorites = async () => {
        const rawFavorites = JSON.parse(localStorage.getItem("favorites")) || [];
        const safeFavorites = Array.isArray(rawFavorites) ? rawFavorites : [];

        try {
            const response = await fetch("http://localhost:5000/api/products");
            const allProducts = await response.json();
            const productMap = new Map(
                (Array.isArray(allProducts) ? allProducts : []).map((product) => [product.id, product])
            );

            const mergedFavorites = safeFavorites.map((item) => {
                const latest = productMap.get(item.id);
                const merged = latest ? { ...item, ...latest } : { ...item };

                return {
                    ...merged,
                    is_out_of_stock: normalizeOutOfStock(merged.is_out_of_stock),
                    stock_quantity: normalizeStockQuantity(merged.stock_quantity)
                };
            });

            setFavorites(mergedFavorites);
            localStorage.setItem("favorites", JSON.stringify(mergedFavorites));
        } catch (error) {
            const normalizedFavorites = safeFavorites.map((item) => ({
                ...item,
                is_out_of_stock: normalizeOutOfStock(item.is_out_of_stock),
                stock_quantity: normalizeStockQuantity(item.stock_quantity)
            }));

            setFavorites(normalizedFavorites);
            localStorage.setItem("favorites", JSON.stringify(normalizedFavorites));
        }
    };

    useEffect(() => {
        syncFavorites();
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

    const handleRemove = (id) => {
        const updated = favorites.filter((item) => item.id !== id);
        setFavorites(updated);
        localStorage.setItem("favorites", JSON.stringify(updated));
    };

    const handleAddToCart = (product) => {
        const normalizedProduct = {
            ...product,
            is_out_of_stock: normalizeOutOfStock(product?.is_out_of_stock),
            stock_quantity: normalizeStockQuantity(product?.stock_quantity)
        };

        if (isProductOutOfStock(normalizedProduct)) {
            alert(`Sản phẩm "${product.title}" hiện đang hết hàng.`);
            return;
        }

        addToCart(normalizedProduct);
        alert(` Đã thêm "${product.title}" vào giỏ hàng!`);
    };

    const scroll = (direction) => {
        if (carouselRef.current) {
            const scrollAmount = 300;
            if (direction === "left") {
                carouselRef.current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
            } else {
                carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
            }
        }
    };

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

            <div className="bg-white mt-6 p-6 shadow-sm rounded-md w-full max-w-[1200px] mx-auto">
                <h2 className="text-lg font-bold mb-4">
                    Sản phẩm yêu thích{" "}
                   
                </h2>

                {favorites.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-lg">
                        <p className="text-gray-600 text-lg">
                            Bạn chưa có sản phẩm yêu thích nào.
                        </p>
                    </div>
                ) : (
                    <div className="relative">
                        {/* Left Arrow */}
                        <button
                            onClick={() => scroll("left")}
                            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-100 rounded-full p-2 shadow-md transition"
                        >
                            <ChevronLeftIcon className="w-5 h-5 text-gray-700" />
                        </button>

                        {/* Carousel */}
                        <div
                            ref={carouselRef}
                            className="overflow-x-auto scrollbar-hide"
                            style={{ scrollBehavior: "smooth" }}
                        >
                            <div className="flex gap-3 px-10">
                                {favorites.map((item) => (
                                    <div key={item.id} className="flex-shrink-0 w-48 relative group">
                                        <CartItem
                                            {...item}
                                            sold={item.sold}
                                            is_out_of_stock={normalizeOutOfStock(item.is_out_of_stock)}
                                            stock_quantity={normalizeStockQuantity(item.stock_quantity)}
                                        />
                                        
                                        {/* Remove button overlay */}
                                        <button
                                            onClick={() => handleRemove(item.id)}
                                            className="absolute top-2 right-2 z-20 bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            Xóa
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right Arrow */}
                        <button
                            onClick={() => scroll("right")}
                            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-100 rounded-full p-2 shadow-md transition"
                        >
                            <ChevronRightIcon className="w-5 h-5 text-gray-700" />
                        </button>
                    </div>
                )}
            </div>

            <Footers />
        </div>
    );
};

export default FavoritePage;
