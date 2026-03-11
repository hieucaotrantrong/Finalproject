import React, { useEffect, useState } from "react";
import CartItem from "./CartItem";

export default function FlashSale() {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        fetch("http://localhost:5000/api/products")
            .then(res => res.json())
            .then(data => {
                // Shuffle danh sách sản phẩm để tạo sự mới mẻ
                const shuffled = [...data].sort(() => 0.5 - Math.random());

                // Lấy đúng 12 sản phẩm để chia đều 2 hàng (mỗi hàng 6 cái)
                const randomProducts = shuffled.slice(0, 12);

                setProducts(randomProducts);
            })
            .catch(err => console.log("Lỗi fetch sản phẩm:", err));
    }, []);

    return (
        /* Giữ nguyên khung max-w-[1200px] để các card nhỏ gọn, xích lại gần nhau */
        <div className="bg-white mt-6 p-6 shadow-sm rounded-md w-full max-w-[1200px] mx-auto">
            
            <h2 className="text-lg font-bold mb-4">
                Gợi ý cho bạn
            </h2>

            {/* Grid 6 cột: Sử dụng {...product} để CartItem nhận đủ logic mua hàng */}
            <div className="grid grid-cols-6 gap-3">
                {products.map((product) => (
                    <CartItem 
                        key={product.id} 
                        {...product} 
                    />
                ))}
            </div>

        </div>
    );
}