import React, { useEffect, useState } from "react";
import CartItem from "./CartItem";
import { FaChevronRight, FaChevronLeft } from "react-icons/fa";

export default function MallSection() {

    const [products, setProducts] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        fetch("http://localhost:5000/api/products")
            .then(res => res.json())
            .then(data => {

                const shuffled = [...data].sort(() => 0.5 - Math.random());
                setProducts(shuffled);

            })
            .catch(err => console.log(err));
    }, []);

    const visibleProducts = products.slice(currentIndex, currentIndex + 4);

    const nextSlide = () => {
        if (currentIndex + 4 < products.length) {
            setCurrentIndex(currentIndex + 4);
        }
    };

    const prevSlide = () => {
        if (currentIndex - 4 >= 0) {
            setCurrentIndex(currentIndex - 4);
        }
    };

    return (

        <div className="max-w-7xl mx-auto px-4 py-6">

            <div className="bg-white p-4 shadow rounded-md border border-gray-200">

                <div className="flex justify-between items-center mb-4">
                    <div className="text-lg font-bold">
                        Sản Phẩm Đặc Quyền
                    </div>
                </div>

                <div className="flex gap-4">

                    {/* Banner */}
                    <div className="w-1/4">
                        <img
                            src="https://cdnv2.tgdd.vn/mwg-static/tgdd/Banner/e8/e1/e8e182cf81dff9d70fc9017070c848c5.png"
                            alt="banner"
                            className="w-full h-full object-cover rounded"
                        />
                    </div>

                    {/* Slider sản phẩm */}
                    <div className="w-3/4 relative">

                        {/* Nút trái */}
                        {currentIndex > 0 && (
                            <button
                                onClick={prevSlide}
                                className="absolute -left-3 top-1/2 -translate-y-1/2 bg-white shadow rounded-full p-2 z-10 hover:bg-gray-100"
                            >
                                <FaChevronLeft />
                            </button>
                        )}

                        {/* Grid sản phẩm */}
                        <div className="grid grid-cols-4 gap-3">
                            {visibleProducts.map((product) => (
                                <CartItem
                                    key={product.id}
                                    {...product}
                                />
                            ))}
                        </div>

                        {/* Nút phải */}
                        {currentIndex + 4 < products.length && (
                            <button
                                onClick={nextSlide}
                                className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white shadow rounded-full p-2 z-10 hover:bg-gray-100"
                            >
                                <FaChevronRight />
                            </button>
                        )}

                    </div>

                </div>

            </div>

        </div>

    );

}