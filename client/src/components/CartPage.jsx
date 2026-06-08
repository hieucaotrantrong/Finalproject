import React, { useState, useEffect } from "react";
import axios from "axios";
import CartItem from "./CartItem";
import Carousel from "./Carousel";
import FlashSale from "./FlashSale";

import { connectSocket, onProductEvent } from "../utils/socket";
import { toast } from 'react-toastify';
const productsMock = [];

const CartPage = ({ searchQuery = '', categoryFilter = '' }) => {

    const [products, setProducts] = useState([]);
    const [showAll, setShowAll] = useState(false);

    const fetchProducts = async () => {

        try {

            const response = await axios.get("http://localhost:5000/api/products");
            const combinedProducts = [...productsMock, ...response.data];
            setProducts(combinedProducts);

        } catch (error) {

            console.error("Lỗi khi lấy sản phẩm từ API:", error);
            setProducts(productsMock);

        }

    };

    useEffect(() => {
        fetchProducts();

        const intervalId = setInterval(() => {
            fetchProducts();
        }, 1000);

        return () => clearInterval(intervalId);
    }, []);

    // Initial fetch only
    useEffect(() => {
        fetchProducts();
    }, []);


    /*------------------------------------------
    Listen to real-time product updates from admin
    ---------------------------------------------*/
    useEffect(() => {
        connectSocket();

    /*------------------------------------------
    When admin adds product
    ---------------------------------------------*/
        // 
        onProductEvent('productAdded', (data) => {
            console.log(' Sản phẩm mới:', data);
            fetchProducts();
            if (data.message) toast.success(data.message);
        });
  /*------------------------------------------
     When admin updates product
    ---------------------------------------------*/
        //
        onProductEvent('productUpdated', (data) => {
            console.log(' Cập nhật sản phẩm:', data);
            fetchProducts();
            if (data.message) toast.info(data.message);
        });
 /*------------------------------------------
     When admin deletes product
    ---------------------------------------------*/
   
        onProductEvent('productDeleted', (data) => {
            console.log(' Xóa sản phẩm:', data);
            fetchProducts();
            if (data.message) toast.warning(data.message);
        });
/*------------------------------------------
  When stock status changes
---------------------------------------------*/

        onProductEvent('stockStatusChanged', (data) => {
            console.log(' Thay đổi tình trạng kho:', data);
            fetchProducts();
            if (data.message) toast.warning(data.message);
        });

    }, []);

    const filteredProducts = products.filter(product => {

        const matchesSearch = !searchQuery ||
            product.title.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory = !categoryFilter ||
            product.category === categoryFilter;

        return matchesSearch && matchesCategory;

    });
/*------------------------------------------
3 hàng đầu
---------------------------------------------*/

    const firstProducts = filteredProducts.slice(0, 12);
/*------------------------------------------
phần mở rộng
---------------------------------------------*/

    const moreProducts = filteredProducts.slice(12);

    return (

        <>
        <div className="w-full max-w-[1280px] mx-auto px-4 py-6 min-h-screen">

            <h1 className="text-xl font-bold mb-6">

                {searchQuery
                    ? `Kết quả tìm kiếm: "${searchQuery}"`
                    : categoryFilter
                        ? `Sản phẩm ${categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1)}`
                        : 'Sản phẩm'}

                <span className="text-gray-500 text-sm ml-2"></span>

            </h1>

            {/* 3 hàng đầu */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">

                {firstProducts.map((product) => (
                    <CartItem key={product.id} {...product} />
                ))}

            </div>

            {/* phần mở rộng */}
            {showAll && (

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">

                    {moreProducts.map((product) => (
                        <CartItem key={product.id} {...product} />
                    ))}

                </div>

            )}

            {/* button */}
            {filteredProducts.length > 10 && (

                <div className="flex justify-center mt-6">

                    <button
                        onClick={() => setShowAll(!showAll)}
                        className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-yellow-600 font-medium transition"
                    >
                        {showAll ? "Thu gọn sản phẩm <" : "Xem thêm sản phẩm >"}
                    </button>

                </div>

            )}

        </div>

        <Carousel />
        <FlashSale />
        </>

    );

};

export default CartPage;