import React, { useEffect, useState } from "react";
import CartItem from "./CartItem";

export default function CategoryGrid() {

    const [products, setProducts] = useState([]);
    const [activeTab, setActiveTab] = useState('all');
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {

        fetch("http://localhost:5000/api/products")
            .then(res => res.json())
            .then(data => {

                const randomProducts = [...data].sort(() => Math.random() - 0.5);
                setProducts(randomProducts);

            })
            .catch(err => console.log(err));

    }, []);

    const tabs = [
        { name: 'Tất Cả', value: 'all' },
        { name: 'Điện thoại', value: 'phone' },
        { name: 'Laptop', value: 'laptop' },
        { name: 'Phụ Kiện', value: 'accessory' },
        { name: 'Đồng Hồ', value: 'watch' },
        { name: 'Smartwatch', value: 'smartwatch' },
    ];

    const filteredProducts = activeTab === 'all'
        ? products
        : products.filter((product) => product.category === activeTab);

    const firstProducts = filteredProducts.slice(0, 6);
    const moreProducts = filteredProducts.slice(6);

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
                                    onClick={() => {
                                        setActiveTab(tab.value)
                                        setShowAll(false)
                                    }}
                                    className={`px-4 py-2 text-sm font-medium ${
                                        activeTab === tab.value
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

              {/* 6 sản phẩm đầu - Thêm grid để cố định kích thước khi ít sản phẩm */}
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pb-2">
    {firstProducts.map((product) => (
        <CartItem
            key={product.id}
            id={product.id}
            image={product.image}
            title={product.title}
            originalprice={product.originalprice}
            price={product.price}
            discount={product.discount}
            sold={product.sold} // Đừng quên truyền sold nếu CartItem cần nhé
        />
    ))}
</div>

                {/* Sản phẩm mở rộng */}
                {showAll && (

                    <div className="grid grid-cols-6 gap-4 mt-4 transition-all duration-500">

                        {moreProducts.map((product) => (
                            <CartItem
                                key={product.id}
                                id={product.id}
                                image={product.image}
                                title={product.title}
                                originalprice={product.originalprice}
                                price={product.price}
                                discount={product.discount}
                            />
                        ))}

                    </div>

                )}

                {/* Button */}
                <div className="flex justify-center mt-4">

                    {filteredProducts.length > 6 && (

                        <button
                            onClick={() => setShowAll(!showAll)}
                            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-yellow-600 font-medium transition"
                        >
                            {showAll ? "Thu gọn sản phẩm <" : "Xem thêm sản phẩm >"}
                        </button>

                    )}

                </div>

            </div>

        </div>

    );

}