import React, { useEffect, useState } from "react";
import CartItem from "./CartItem";

export default function FlashSale() {

    const [products, setProducts] = useState([]);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        fetch("http://localhost:5000/api/products")
            .then(res => res.json())
            .then(data => {

                const shuffled = [...data].sort(() => 0.5 - Math.random());
                setProducts(shuffled);

            })
            .catch(err => console.log("Lỗi fetch sản phẩm:", err));

    }, []);

    // 2 hàng đầu (12 sản phẩm)
    const firstProducts = products.slice(0, 12);

    // phần mở rộng
    const moreProducts = products.slice(12);

    return (

        <div className="bg-white mt-6 p-6 shadow-sm rounded-md w-full max-w-[1200px] mx-auto">
            
            <h2 className="text-lg font-bold mb-4">
                Gợi ý cho bạn
            </h2>

            {/* 2 hàng đầu */}
            <div className="grid grid-cols-6 gap-3">

                {firstProducts.map((product) => (
                    <CartItem
                        key={product.id}
                        {...product}
                    />
                ))}

            </div>

            {/* Sản phẩm mở rộng */}
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

            {/* Nút xem thêm */}
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

    );

}