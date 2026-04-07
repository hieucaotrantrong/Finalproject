import React, { useEffect, useState } from "react";
import CartItem from "./CartItem";

const SIDE_PREFIX = "side::";

const isSideBanner = (imageUrl = "") => imageUrl.startsWith(SIDE_PREFIX);
const toDisplayImageUrl = (imageUrl = "") => imageUrl.replace(SIDE_PREFIX, "");

export default function FlashSale() {

    const [products, setProducts] = useState([]);
    const [showAll, setShowAll] = useState(false);
    const [sideBanner, setSideBanner] = useState(null);

    const fetchProducts = () => {
        fetch("http://localhost:5000/api/products")
            .then(res => res.json())
            .then(data => {
                setProducts(Array.isArray(data) ? data : []);
            })
            .catch(err => console.log("Lỗi fetch sản phẩm:", err));
    };

    useEffect(() => {
        fetchProducts();

        const intervalId = setInterval(() => {
            fetchProducts();
        }, 1000);

        return () => clearInterval(intervalId);
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

    const firstProducts = products.slice(0, 12);
    const moreProducts = products.slice(12);

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

    return (
        <>
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

            <div className="bg-white mt-6 p-6 shadow-sm rounded-md w-full max-w-[1200px] mx-auto">
                <h2 className="text-lg font-bold mb-4">
                    Gợi ý cho bạn
                </h2>

                <div className="grid grid-cols-6 gap-3">
                    {firstProducts.map((product) => (
                        <CartItem
                            key={product.id}
                            {...product}
                        />
                    ))}
                </div>

                {showAll && (
                    <div className="grid grid-cols-6 gap-3 mt-3 transition-all duration-500">
                        {moreProducts.map((product) => (
                            <CartItem
                                key={product.id}
                                {...product}
                            />
                        ))}
                    </div>
                )}

                {products.length > 12 && (
                    <div className="flex justify-center mt-4">
                        <button
                            onClick={() => setShowAll(!showAll)}
                            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-yellow-600 font-medium transition"
                        >
                            {showAll ? "Thu gọn sản phẩm <" : "Xem thêm sản phẩm >"}
                        </button>
                    </div>
                )}

            </div>
            
        </>

    );

}