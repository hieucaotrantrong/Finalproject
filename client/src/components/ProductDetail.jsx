import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Home from "./Home";
import Footers from "./Footers";
import { useCart } from "../context/CartContext";
import Carousel from "./Carousel";

const formatPrice = (price) => {
    const numPrice = Math.floor(parseFloat(price));
    return numPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const ProductDetail = () => {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isFavorite, setIsFavorite] = useState(false);
    const { addToCart } = useCart();

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/products/${id}`);
                setProduct(res.data);

                // kiểm tra sản phẩm này đã yêu thích chưa
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

    const handleAddToCart = () => {
        if (product) {
            addToCart(product);
            alert("✅ Đã thêm sản phẩm vào giỏ hàng!");
        }
    };

    // ❤️ Toggle yêu thích
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

    return (
        <div className="min-h-screen bg-gray-50">
            <Home />

            <section className="py-8 bg-white">
                <div className="max-w-screen-xl px-4 mx-auto">
                    <div className="lg:grid lg:grid-cols-2 lg:gap-8 xl:gap-16">
                        <div className="shrink-0 max-w-md lg:max-w-lg mx-auto">
                            <img
                                src={product.image}
                                alt={product.title}
                                className="w-full max-w-md rounded-lg shadow-md mb-4"
                            />
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
                                {/* ❤️ Nút yêu thích */}
                                <button
                                    onClick={toggleFavorite}
                                    className={`flex items-center justify-center py-2.5 px-5 text-sm font-medium rounded-lg border transition-all ${isFavorite
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

                                {/* 🛒 Thêm vào giỏ */}
                                <button
                                    onClick={handleAddToCart}
                                    className="text-white mt-4 sm:mt-0 bg-[#ffd400] hover:bg-yellow-500 focus:ring-4 focus:ring-yellow-300 font-medium rounded-lg text-sm px-5 py-2.5 flex items-center justify-center"
                                >
                                    🛒 Thêm vào giỏ
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

            <Footers />
        </div>
    );
};

export default ProductDetail;
