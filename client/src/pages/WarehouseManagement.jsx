import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/inventory';

const formatNumber = (value) => {
    const num = Number(value || 0);
    return Number.isFinite(num) ? num.toLocaleString('vi-VN') : '0';
};

const toVietnameseChangeType = (type) => {
    switch (String(type || '').toLowerCase()) {
        case 'import':
            return 'Nhập kho';
        case 'export':
            return 'Xuất kho';
        case 'sale':
            return 'Bán hàng';
        case 'cancel_restore':
            return 'Hoàn kho do hủy đơn';
        case 'adjust':
            return 'Điều chỉnh kho';
        default:
            return type || '-';
    }
};

const toVietnameseCategory = (category) => {
    const normalized = String(category || '').toLowerCase().trim();
    switch (normalized) {
        case 'phone':
            return 'Điện thoại';
        case 'laptop':
            return 'Laptop';
        case 'accessory':
            return 'Phụ kiện';
        case 'watch':
            return 'Đồng hồ';
        case 'smartwatch':
            return 'Smartwatch';
        case 'tablet':
            return 'Tablet';
        default:
            return category || '-';
    }
};

const toOperatorLabel = (item) => {
    const type = String(item?.change_type || '').toLowerCase();
    if (type === 'sale') return 'Hệ thống / Đơn hàng';
    if (type === 'cancel_restore') return 'Hệ thống / Hủy đơn';
    return item?.created_by_email || 'Hệ thống';
};

const WarehouseManagement = () => {
    const [inventory, setInventory] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        productId: '',
        quantity: '',
        reason: ''
    });
    const [mode, setMode] = useState('import');
    const [selectedProductFilter, setSelectedProductFilter] = useState('');

    const token = localStorage.getItem('token');

    const headers = useMemo(() => ({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
    }), [token]);

    const fetchInventory = async ({ silent = false } = {}) => {
        if (!silent) {
            setLoading(true);
            setError('');
        }

        try {
            const response = await axios.get(API_BASE, { headers });
            const nextInventory = Array.isArray(response.data) ? response.data : [];
            setInventory((prev) => {
                const prevSerialized = JSON.stringify(prev);
                const nextSerialized = JSON.stringify(nextInventory);
                return prevSerialized === nextSerialized ? prev : nextInventory;
            });
        } catch (err) {
            console.error('Lỗi lấy tồn kho:', err);
            if (!silent) {
                setError('Không thể tải dữ liệu tồn kho');
            }
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    };

    const fetchTransactions = async (productId = '', { silent = false } = {}) => {
        try {
            const response = await axios.get(`${API_BASE}/transactions`, {
                headers,
                params: productId ? { productId } : undefined
            });

            const nextTransactions = Array.isArray(response.data) ? response.data : [];
            setTransactions((prev) => {
                const prevSerialized = JSON.stringify(prev);
                const nextSerialized = JSON.stringify(nextTransactions);
                return prevSerialized === nextSerialized ? prev : nextTransactions;
            });
        } catch (err) {
            console.error('Lỗi lấy lịch sử kho:', err);
            if (!silent) {
                setError('Không thể tải lịch sử kho');
            }
        }
    };

    useEffect(() => {
        if (!token) {
            setError('Bạn cần đăng nhập admin để quản lý kho');
            return;
        }

        fetchInventory();
        fetchTransactions(selectedProductFilter);

        const intervalId = setInterval(() => {
            if (document.hidden) {
                return;
            }

            fetchInventory({ silent: true });
            fetchTransactions(selectedProductFilter, { silent: true });
        }, 1000);

        return () => clearInterval(intervalId);
    }, [token, selectedProductFilter]);

    const submitInventoryAction = async () => {
        const productId = Number(form.productId);
        const quantity = Number(form.quantity);

        if (!Number.isFinite(productId) || productId <= 0) {
            setError('Vui lòng chọn sản phẩm hợp lệ');
            return;
        }

        if (!Number.isFinite(quantity) || quantity <= 0) {
            setError('Số lượng phải lớn hơn 0');
            return;
        }

        setError('');
        setMessage('');

        try {
            const endpoint = mode === 'import' ? 'import' : 'export';
            await axios.post(
                `${API_BASE}/${endpoint}`,
                {
                    productId,
                    quantity,
                    reason: form.reason?.trim() || null
                },
                { headers }
            );

            setMessage(mode === 'import' ? 'Nhập kho thành công' : 'Xuất kho thành công');
            setForm((prev) => ({ ...prev, quantity: '', reason: '' }));
            await fetchInventory();
            await fetchTransactions(selectedProductFilter || '');
        } catch (err) {
            console.error('Lỗi thao tác kho:', err);
            setError(err?.response?.data?.error || 'Không thể cập nhật kho');
        }
    };

    const handleRunAction = () => {
        submitInventoryAction();
    };

    const actionLabel = mode === 'import' ? 'Nhập kho' : 'Xuất kho';

    return (
        <div className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-800">Quản lý kho</h2>
               

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5">
                    <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value)}
                        className="rounded border border-slate-300 px-3 py-2 text-sm"
                    >
                        <option value="import">Nhập kho</option>
                        <option value="export">Xuất kho</option>
                    </select>

                    <select
                        value={form.productId}
                        onChange={(e) => setForm({ ...form, productId: e.target.value })}
                        className="rounded border border-slate-300 px-3 py-2 text-sm md:col-span-2"
                    >
                        <option value="">Chọn sản phẩm</option>
                        {inventory.map((item) => (
                            <option key={item.product_id} value={item.product_id}>
                                {item.title}
                            </option>
                        ))}
                    </select>

                    <input
                        type="number"
                        value={form.quantity}
                        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                        placeholder="Số lượng"
                        className="rounded border border-slate-300 px-3 py-2 text-sm"
                    />

                    <button
                        type="button"
                        onClick={handleRunAction}
                        className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                        {actionLabel}
                    </button>
                </div>

                <input
                    type="text"
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    placeholder="Lý do (không bắt buộc)"
                    className="mt-3 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />

                {message && <p className="mt-3 text-sm font-medium text-green-600">{message}</p>}
                {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-800">Tồn kho hiện tại</h3>
                    <button
                        type="button"
                        onClick={fetchInventory}
                        className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                        Làm mới
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full border border-slate-200 text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-600">
                            <tr>
                                <th className="px-3 py-2">Sản phẩm</th>
                                <th className="px-3 py-2">Danh mục</th>
                                <th className="px-3 py-2">Tồn hiện tại</th>
                                <th className="px-3 py-2">Đã bán</th>
                                <th className="px-3 py-2">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                                        Đang tải dữ liệu kho...
                                    </td>
                                </tr>
                            ) : inventory.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                                        Chưa có dữ liệu kho
                                    </td>
                                </tr>
                            ) : (
                                inventory.map((item) => (
                                    <tr key={item.product_id} className="border-t border-slate-200">
                                        <td className="px-3 py-2">{item.title}</td>
                                        <td className="px-3 py-2">{toVietnameseCategory(item.category)}</td>
                                        <td className="px-3 py-2 font-semibold">{formatNumber(item.stock_quantity)}</td>
                                        <td className="px-3 py-2">{formatNumber(item.sold)}</td>
                                        <td className="px-3 py-2">
                                            <span className={item.is_out_of_stock ? 'text-red-600' : 'text-green-600'}>
                                                {item.is_out_of_stock ? 'Hết hàng' : 'Còn hàng'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-800">Lịch sử nhập xuất kho</h3>
                    <div className="flex items-center gap-2">
                        <select
                            value={selectedProductFilter}
                            onChange={async (e) => {
                                const next = e.target.value;
                                setSelectedProductFilter(next);
                                await fetchTransactions(next);
                            }}
                            className="rounded border border-slate-300 px-3 py-1.5 text-sm"
                        >
                            <option value="">Tất cả sản phẩm</option>
                            {inventory.map((item) => (
                                <option key={item.product_id} value={item.product_id}>
                                    {item.title}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => fetchTransactions(selectedProductFilter)}
                            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                        >
                            Làm mới
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full border border-slate-200 text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-600">
                            <tr>
                                <th className="px-3 py-2">Thời gian</th>
                                <th className="px-3 py-2">Sản phẩm</th>
                                <th className="px-3 py-2">Loại</th>
                                <th className="px-3 py-2">Biến động</th>
                                <th className="px-3 py-2">Tồn sau</th>
                                <th className="px-3 py-2">Lý do</th>
                                <th className="px-3 py-2">Người thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                                        Chưa có giao dịch kho
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((item) => (
                                    <tr key={item.id} className="border-t border-slate-200">
                                        <td className="px-3 py-2">{new Date(item.created_at).toLocaleString('vi-VN')}</td>
                                        <td className="px-3 py-2">{item.product_title}</td>
                                        <td className="px-3 py-2">{toVietnameseChangeType(item.change_type)}</td>
                                        <td className={`px-3 py-2 font-semibold ${Number(item.quantity_change) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {Number(item.quantity_change) > 0 ? '+' : ''}{formatNumber(item.quantity_change)}
                                        </td>
                                        <td className="px-3 py-2">{formatNumber(item.quantity_after)}</td>
                                        <td className="px-3 py-2">{item.reason || '-'}</td>
                                        <td className="px-3 py-2">{toOperatorLabel(item)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default WarehouseManagement;
