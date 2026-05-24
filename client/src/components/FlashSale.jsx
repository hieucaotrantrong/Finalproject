import React, { useEffect, useState } from "react";
import CartItem from "./CartItem";

const VIEW_STORAGE_KEY = "productViews";
const CATEGORY_STORAGE_KEY = "categoryViews";

const normalizeCategory = (value = "") => {
    return String(value)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
};

const CATEGORY_GROUPS = {
    "dien-thoai": ["phone", "dien-thoai", "dien thoai", "điện thoại"],
    laptop: ["laptop"],
    "phu-kien": ["accessory", "phu-kien", "phu kien", "phụ kiện"],
    "dong-ho": ["watch", "dong-ho", "dong ho", "đồng hồ"],
    "dong-ho-thong-minh": ["smartwatch", "dong-ho-thong-minh", "dong ho thong minh"],
};

const getCategoryGroup = (value = "") => {
    const normalized = normalizeCategory(value);
    for (const [group, aliases] of Object.entries(CATEGORY_GROUPS)) {
        if (aliases.map(normalizeCategory).includes(normalized)) {
            return group;
        }
    }
    return normalized;
};

const getViewCountsFromStorage = () => {
    try {
        return JSON.parse(localStorage.getItem(VIEW_STORAGE_KEY)) || {};
    } catch (e) {
        return {};
    }
};

const getCategoryCountsFromStorage = () => {
    try {
        return JSON.parse(localStorage.getItem(CATEGORY_STORAGE_KEY)) || {};
    } catch (e) {
        return {};
    }
};

export default function FlashSale() {

    const [products, setProducts] = useState([]);
    const [showAll, setShowAll] = useState(false);

    const fetchProducts = () => {
        fetch("http://localhost:5000/api/products")
            .then(res => res.json())
            .then(data => {
                const list = Array.isArray(data) ? data : [];

                try {
                    const counts = getViewCountsFromStorage();
                    const categoryCounts = getCategoryCountsFromStorage();
                    const activeCategory = getCategoryGroup(localStorage.getItem("activeRecommendationCategory") || "");

                    const sorted = [...list].sort((a, b) => {
                        const av = Number(counts[String(a.id)] || 0);
                        const bv = Number(counts[String(b.id)] || 0);
                        const aCategory = getCategoryGroup(a.category || "");
                        const bCategory = getCategoryGroup(b.category || "");
                        const aCategoryScore = Number(categoryCounts[String(aCategory)] || 0);
                        const bCategoryScore = Number(categoryCounts[String(bCategory)] || 0);

                        if (activeCategory) {
                            const aActive = aCategory === activeCategory ? 1 : 0;
                            const bActive = bCategory === activeCategory ? 1 : 0;
                            if (bActive !== aActive) return bActive - aActive;
                        }

                        if (bCategoryScore !== aCategoryScore) return bCategoryScore - aCategoryScore;
                        if (bv !== av) return bv - av;

                        const ar = Number(a.average_rating || a.rating || 0);
                        const br = Number(b.average_rating || b.rating || 0);
                        if (br !== ar) return br - ar;

                        return a.id - b.id;
                    });

                    setProducts(sorted);
                } catch (e) {
                    setProducts(list);
                }
            })
            .catch(err => console.log("Lỗi fetch sản phẩm:", err));
    };

    useEffect(() => {
        fetchProducts();

        const handleRecommendationUpdate = () => {
            fetchProducts();
        };

        window.addEventListener("recommendationViewsUpdated", handleRecommendationUpdate);
        window.addEventListener("storage", handleRecommendationUpdate);

        return () => {
            window.removeEventListener("recommendationViewsUpdated", handleRecommendationUpdate);
            window.removeEventListener("storage", handleRecommendationUpdate);
        };
    }, []);

    const firstProducts = products.slice(0, 12);
    const moreProducts = products.slice(12);

    return (
        <>
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