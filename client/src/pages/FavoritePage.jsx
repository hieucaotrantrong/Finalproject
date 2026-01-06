import React, { useEffect, useState } from "react";
import Home from "../components/Home";
import Footers from "../components/Footers";
import { useCart } from "../context/CartContext";

const formatPrice = (price) => {
    return Math.floor(parseFloat(price || 0))
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const FavoritePage = () => {
    const [favorites, setFavorites] = useState([]);
    const { addToCart } = useCart();

    useEffect(() => {
        const fav = JSON.parse(localStorage.getItem("favorites")) || [];
        setFavorites(fav);
    }, []);

    const handleRemove = (id) => {
        const updated = favorites.filter((item) => item.id !== id);
        setFavorites(updated);
        localStorage.setItem("favorites", JSON.stringify(updated));
    };

    const handleAddToCart = (product) => {
        addToCart(product);
        alert(`✅ Đã thêm "${product.title}" vào giỏ hàng!`);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Home />

            <div className="max-w-[1440px] mx-auto px-6 py-10">
                <h1 className="text-2xl font-bold mb-6 text-gray-800">
                    Sản phẩm yêu thích{" "}
                    <span className="text-gray-500 text-base">
                        ({favorites.length} sản phẩm)
                    </span>
                </h1>

                {favorites.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl shadow">
                        <p className="text-gray-600 text-lg">
                            Bạn chưa có sản phẩm yêu thích nào.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                        {favorites.map((item) => (
                            <div
                                key={item.id}
                                className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 p-3 flex flex-col"
                            >
                                {/* Hình ảnh sản phẩm */}
                                <div className="relative w-full h-[200px] flex justify-center items-center">
                                    <img
                                        src={item.image}
                                        alt={item.title}
                                        className="h-full object-contain rounded-t-lg"
                                    />
                                </div>

                                {/* Nội dung */}
                                <div className="mt-3 flex flex-col flex-1">
                                    <h2 className="font-semibold text-gray-800 text-sm line-clamp-2 min-h-[40px]">
                                        {item.title}
                                    </h2>
                                    <p className="text-gray-500 text-xs mt-1">Quad HD+ (2K+)</p>

                                    {/* Giá */}
                                    <div className="mt-1">
                                        <p className="text-red-600 font-bold text-lg">
                                            {formatPrice(item.price)}₫
                                        </p>
                                        {item.originalprice && (
                                            <p className="text-gray-400 line-through text-sm">
                                                {formatPrice(item.originalprice)}₫
                                            </p>
                                        )}
                                    </div>

                                    {/* Quà + đánh giá */}
                                    <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                                        <p>🎁 Quà {Math.floor(Math.random() * 20) + 5}.000₫</p>
                                        <p>⭐ 4.4 • Đã bán {Math.floor(Math.random() * 15) + 1}k</p>
                                    </div>

                                    {/* Trạng thái */}
                                    <div className="mt-2">
                                        <span className="bg-orange-100 text-orange-600 text-xs font-medium px-3 py-1 rounded-full">
                                            Đang bán chạy
                                        </span>
                                    </div>

                                    {/* Nút hành động */}
                                    <div className="mt-3 flex justify-between gap-2">
                                        <button
                                            onClick={() => handleAddToCart(item)}
                                            className="flex-1 bg-[#ffd400] hover:bg-yellow-500 text-black font-medium py-2 rounded-lg text-sm transition-all"
                                        >
                                            Thêm vào giỏ hàng
                                        </button>
                                        <button
                                            onClick={() => handleRemove(item.id)}
                                            className="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-2 rounded-lg text-sm transition-all"
                                        >
                                            Xóa
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Footers />
        </div>
    );
};

export default FavoritePage;
