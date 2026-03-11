import React, { useEffect, useState } from "react";
import CartItem from "./CartItem"; 

export default function MallSection() {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        fetch("http://localhost:5000/api/products")
            .then(res => res.json())
            .then(data => {
               
                const shuffled = [...data].sort(() => 0.5 - Math.random());
                const randomProducts = shuffled.slice(0, 4);
                setProducts(randomProducts);
            })
            .catch(err => console.log(err));
    }, []);

    return (
    
        <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="bg-white p-4 shadow rounded-md border border-gray-200">
                
                <div className="flex justify-between items-center mb-4">
                    <div className="text-lg font-bold">
                        Sản Phẩm Đặc Quyền
                    </div>
                </div>

                <div className="flex gap-4">
                 
                    <div className="w-1/4">
                        <img
                            src="https://cdnv2.tgdd.vn/mwg-static/tgdd/Banner/e8/e1/e8e182cf81dff9d70fc9017070c848c5.png"
                            alt="banner"
                            className="w-full h-full object-cover rounded"
                        />
                    </div>

                    {/* Danh sách 4 CartItem bên phải chiếm 3/4 */}
                    <div className="w-3/4 grid grid-cols-4 gap-3">
                        {products.map((product) => (
                            <CartItem 
                                key={product.id} 
                                {...product} 
                            />
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}