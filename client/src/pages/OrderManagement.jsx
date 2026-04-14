import React, { useState, useEffect } from 'react';
import axios from 'axios';

const formatVnd = (value) => {
    const num = Number(String(value ?? 0).replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(num)) return '0';
    return num.toLocaleString('vi-VN');
};

const getOrderQuantity = (order) => {
    const qty = Number(order?.quantity ?? 1);
    return Number.isFinite(qty) && qty > 0 ? qty : 1;
};

const getOrderLineTotal = (order) => {
    const unitPrice = Number(order?.product_price ?? 0);
    const quantity = getOrderQuantity(order);
    return unitPrice * quantity;
};

const OrderManagement = () => {
    const [orders, setOrders] = useState([]);
    const [error, setError] = useState(null);
    /*----------------------------------
    -----------------------------------*/
    useEffect(() => {
        fetchOrders();
    }, []);
    /*----------------------------------
    Get all product
    -----------------------------------*/
    const fetchOrders = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/orders', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setOrders(response.data);
            setError(null);
        } catch (error) {
            console.error('Lỗi khi lấy danh sách đơn hàng:', error);
            setError('Không thể tải danh sách đơn hàng');
        }
    };
    /*----------------------------------
    Update status product
    -----------------------------------*/
    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.put(
                `http://localhost:5000/api/orders/${orderId}`,
                { status: newStatus },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.success) {
                setOrders(orders.map(order =>
                    order.id === orderId
                        ? { ...order, status: newStatus }
                        : order
                ));
            } else {
                throw new Error(response.data.error || 'Cập nhật thất bại');
            }
        } catch (error) {
            console.error('Error updating status:', error.response?.data || error);
            alert(error.response?.data?.error || 'Không thể cập nhật trạng thái đơn hàng');
        }
    };

    const statusStyle = (status) => {
        switch (status) {
            case 'pending':
                return 'bg-slate-100 text-slate-700';
            case 'confirmed':
                return 'bg-slate-200 text-slate-800';
            case 'shipping':
                return 'bg-slate-300 text-slate-900';
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (error) {
        return <div className="p-6 text-red-600 text-center">{error}</div>;
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-10"></h1>

            <div className="overflow-x-auto shadow rounded-lg">
                <table className="min-w-full text-sm text-gray-800 bg-white border border-gray-200">
                    <thead className="bg-gray-100 text-xs uppercase font-semibold text-gray-600">
                        <tr>
                            <th className="px-4 py-3 text-left">ID</th>
                            <th className="px-4 py-3 text-left">Khách hàng</th>
                            <th className="px-4 py-3 text-left">Email</th>
                            <th className="px-4 py-3 text-left">Sản phẩm</th>
                            <th className="px-4 py-3 text-left">Giá</th>
                            <th className="px-4 py-3 text-left">Số lượng</th>
                            <th className="px-4 py-3 text-left">Liên hệ</th>
                            <th className="px-4 py-3 text-left">Địa chỉ</th>
                            <th className="px-4 py-3 text-left">Ngày đặt</th>
                            <th className="px-4 py-3 text-left">Trạng thái</th>
                            <th className="px-4 py-3 text-left">Cập nhật</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order) => (
                            <tr key={order.id} className="border-t hover:bg-gray-50 transition duration-150">
                                <td className="px-4 py-3">{order.id}</td>
                                <td className="px-4 py-3 font-medium">{order.full_name}</td>
                                <td className="px-4 py-3">{order.email}</td>
                                <td className="px-4 py-3">{order.product_title}</td>
                                <td className="px-4 py-3 text-green-600 font-semibold">{formatVnd(getOrderLineTotal(order))}đ</td>
                                <td className="px-4 py-3 font-semibold">{getOrderQuantity(order)}</td>
                                <td className="px-4 py-3">{order.phone}</td>
                                <td className="px-4 py-3">{order.address}</td>
                                <td className="px-4 py-3">{new Date(order.created_at).toLocaleDateString('vi-VN')}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusStyle(order.status)}`}>
                                        {order.status || 'pending'}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <select
                                        className="border rounded px-2 py-1 bg-white text-sm"
                                        value={order.status || 'pending'}
                                        onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                                    >
                                        <option value="pending">Chờ xác nhận</option>
                                        <option value="confirmed">Đã xác nhận</option>
                                        <option value="shipping">Đang giao hàng</option>
                                        <option value="completed">Hoàn thành</option>
                                        <option value="cancelled">Đã hủy</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default OrderManagement;
