import React, { useEffect, useState } from "react";
import CartItem from "./CartItem";

export default function CategoryGrid() {

    const [products, setProducts] = useState([]);

    useEffect(() => {

        fetch("http://localhost:5000/api/products")
            .then(res => res.json())
            .then(data => {

                const randomProducts = [...data]
                    .sort(() => Math.random() - 0.5)
                    .slice(0, 6);

                setProducts(randomProducts);

            })
            .catch(err => console.log(err));

    }, []);

    const tabs = [
        { name: 'Tất Cả', active: true },
        { name: 'Apple', active: false },
        { name: 'Laptop', active: false },
        { name: 'Phụ Kiện', active: false },
        { name: 'Đồng Hồ', active: false },
        { name: 'PC, Máy In', active: false },
    ];

    return (

        <div className="w-full bg-white mt-4">

            <div className="max-w-7xl mx-auto px-4 py-3">

                {/* Title */}
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-bold text-black-800">
                        Khuyến mãi Online
                    </h2>
                </div>

                {/* Flash Sale + Tabs */}
                <div className="mb-4">

                    <div className="flex items-center">

                        <div className="flex items-center gap-3 mr-8">

                            <img
                                src="https://cdnv2.tgdd.vn/mwg-static/common/Campaign/10/0d/100d3018ffd23afe20324b164d0412cc.png"
                                className="h-12 object-contain"
                            />

                            <img
                                src="https://cdnv2.tgdd.vn/mwg-static/common/Campaign/d4/17/d4177404ab82e04867a0fd79bb903450.png"
                                className="h-12 object-contain"
                            />

                        </div>

                        <div className="flex gap-x-20">

                            {tabs.map((tab, index) => (

                                <button
                                    key={index}
                                    className={`px-4 py-2 text-sm font-medium ${
                                        tab.active
                                            ? 'text-blue-600 border-b-2 border-blue-600'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {tab.name}
                                </button>

                            ))}

                        </div>

                    </div>

                </div>

                {/* Banner */}
                <div className="max-w-7xl mx-auto px-2 py-2 mb-4">

                    <div className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-pink-200 rounded-md p-3 flex items-center">

                        <img
                            src="https://cdnv2.tgdd.vn/mwg-static/common/Campaign/c8/b7/c8b756baf5f990d065abf3acd1de19f6.png"
                            className="h-8 object-contain"
                        />

                    </div>

                </div>

                {/* Product Slider */}

                <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide">

                  {products.map((product) => (
    <CartItem
        key={product.id}
        id={product.id}
        image={product.image}
        title={product. title    }
        originalprice={product.originalprice}
        price={product.price}
        discount={product.discount}
    />
))}

                </div>

            </div>

        </div>

    );
    
}