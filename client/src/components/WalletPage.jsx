import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Home from './Home';
import { FaWallet, FaCreditCard, FaHistory } from 'react-icons/fa';
import Footers from './Footers';

const WalletPage = () => {
    const [wallet, setWallet] = useState(null);
    const [showDepositForm, setShowDepositForm] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [transferInfo, setTransferInfo] = useState(null);
    const [depositHistory, setDepositHistory] = useState([]);
    const [showPopup, setShowPopup] = useState(false); // ✅ popup trung tâm

    const suggestedAmounts = [
        { label: '100K', value: 100000 },
        { label: '200K', value: 200000 },
        { label: '500K', value: 500000 },
        { label: '1M', value: 1000000 },
        { label: '2M', value: 2000000 },
        { label: '5M', value: 5000000 },
    ];

    const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price);

    const selectAmount = (amount) => {
        setDepositAmount(amount.toString());
    };

    // ✅ chỉnh lại để bật popup thay vì alert
    const handleDeposit = async () => {
        if (!depositAmount || depositAmount <= 0) {
            alert('⚠️ Vui lòng nhập số tiền hợp lệ');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                'http://localhost:5000/api/wallet/deposit',
                { amount: parseInt(depositAmount) },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setTransferInfo(response.data);
            setShowPopup(true); // ✅ bật popup trung tâm
        } catch (error) {
            console.error('Lỗi nạp tiền:', error);
            alert('❌ Có lỗi xảy ra khi tạo yêu cầu nạp tiền');
        }
    };

    const fetchWalletInfo = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/wallet', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setWallet(response.data.wallet);
            setDepositHistory(response.data.depositHistory || []);
        } catch (error) {
            console.error('Lỗi lấy thông tin ví:', error);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'approved': return 'Đã duyệt';
            case 'pending': return 'Chờ duyệt';
            case 'rejected': return 'Từ chối';
            default: return 'Không xác định';
        }
    };

    useEffect(() => {
        fetchWalletInfo();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-b from-yellow-50 via-white to-blue-50">
            <Home />

            <div className="max-w-7xl mx-auto p-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="flex items-center justify-center gap-4 mb-6">
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Balance Card */}
                        <div className="relative bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-white rounded-3xl shadow-2xl overflow-hidden">
                            <div className="p-8 relative">
                                <p className="text-yellow-100 text-sm font-medium">Số dư khả dụng</p>
                                <h2 className="text-4xl font-bold mt-2">{formatPrice(wallet?.balance || 0)}</h2>
                                <p className="text-yellow-100 text-lg">VNĐ</p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    setShowDepositForm(true);
                                    setShowHistory(false);
                                }}
                                className={`w-full py-4 px-6 rounded-2xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 ${showDepositForm
                                    ? 'bg-yellow-500 text-white shadow-yellow-200'
                                    : 'bg-white hover:bg-yellow-50 text-yellow-600 border-2 border-yellow-300 hover:border-yellow-400'
                                    }`}
                            >
                                💰 Nạp tiền vào ví
                            </button>

                            <button
                                onClick={() => {
                                    setShowHistory(true);
                                    setShowDepositForm(false);
                                }}
                                className={`w-full py-4 px-6 rounded-2xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 ${showHistory
                                    ? 'bg-blue-500 text-white shadow-blue-200'
                                    : 'bg-white hover:bg-blue-50 text-blue-600 border-2 border-blue-300 hover:border-blue-400'
                                    }`}
                            >
                                <FaHistory className="inline mr-2" /> Lịch sử giao dịch
                            </button>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-2">
                        {/* Form nạp tiền */}
                        {showDepositForm && (
                            <div className="bg-white rounded-3xl shadow-xl border border-yellow-200 overflow-hidden">
                                <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-8 text-white">
                                    <h3 className="text-2xl font-bold">Nạp tiền vào ví</h3>
                                    <p className="text-yellow-100">Nhập số tiền cần nạp để nhận thông tin chuyển khoản</p>
                                </div>

                                <div className="p-8">
                                    {/* Nhập số tiền */}
                                    <div className="mb-8">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Số tiền muốn nạp
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="Nhập số tiền..."
                                            value={depositAmount}
                                            onChange={(e) => setDepositAmount(e.target.value)}
                                            className="w-full p-6 text-xl font-bold border-2 border-yellow-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
                                        />
                                    </div>

                                    {/* Quick select */}
                                    <div className="grid grid-cols-3 gap-4 mb-8">
                                        {suggestedAmounts.map((amount, i) => (
                                            <button
                                                key={i}
                                                onClick={() => selectAmount(amount.value)}
                                                className={`p-4 rounded-xl text-sm font-semibold transition-all duration-200 ${depositAmount == amount.value
                                                    ? 'bg-yellow-500 text-white shadow-lg transform scale-105'
                                                    : 'bg-gray-50 hover:bg-yellow-50 text-gray-700 border border-yellow-200'
                                                    }`}
                                            >
                                                {amount.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Nút xác nhận */}
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setShowDepositForm(false)}
                                            className="flex-1 py-4 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all"
                                        >
                                            Hủy bỏ
                                        </button>
                                        <button
                                            onClick={handleDeposit}
                                            className="flex-1 py-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-semibold transition-all shadow-lg"
                                        >
                                            Xác nhận nạp tiền
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Lịch sử giao dịch */}
                        {showHistory && (
                            <div className="bg-white rounded-3xl shadow-xl border border-blue-200 overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-8 text-white">
                                    <h3 className="text-2xl font-bold">Lịch sử giao dịch</h3>
                                </div>

                                <div className="p-8">
                                    {depositHistory.length === 0 ? (
                                        <div className="text-center text-gray-500">
                                            Chưa có giao dịch nạp tiền nào.
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {depositHistory.map((t, i) => (
                                                <div key={i} className="border border-gray-200 rounded-xl p-4">
                                                    <div className="flex justify-between">
                                                        <p className="font-semibold text-gray-800">
                                                            {new Date(t.created_at).toLocaleString('vi-VN')}
                                                        </p>
                                                        <span
                                                            className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(t.status)}`}
                                                        >
                                                            {getStatusText(t.status)}
                                                        </span>
                                                    </div>
                                                    <p className="text-yellow-600 font-bold text-lg mt-2">
                                                        +{formatPrice(t.amount)} VNĐ
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ✅ POPUP hiển thị thông tin chuyển khoản */}
            {showPopup && transferInfo && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
                    <div className="bg-gradient-to-b from-yellow-50 to-white border border-yellow-300 rounded-2xl shadow-2xl w-[500px] max-w-[90%] p-6 animate-fadeIn">
                        <h2 className="text-xl font-bold text-yellow-700 mb-4 text-center">🏦 Thông tin chuyển khoản</h2>

                        <div className="bg-white rounded-xl shadow p-5 border border-gray-200">
                            <div className="grid grid-cols-2 gap-4 mb-3">
                                <div>
                                    <p className="text-sm text-gray-600">Ngân hàng</p>
                                    <p className="font-bold text-gray-800">{transferInfo.bankInfo.bank}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Số tài khoản</p>
                                    <p className="font-mono text-blue-600 text-lg font-semibold">
                                        {transferInfo.bankInfo.accountNumber}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Chủ tài khoản</p>
                                    <p className="font-bold text-gray-800">{transferInfo.bankInfo.accountName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Số tiền</p>
                                    <p className="font-bold text-red-600 text-lg">
                                        {formatPrice(depositAmount)} VNĐ
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4">
                                <p className="text-sm text-gray-600 mb-1">Nội dung chuyển khoản</p>
                                <div className="flex items-center gap-2">
                                    <p className="flex-1 bg-green-50 border border-green-300 text-green-700 font-mono font-semibold px-3 py-2 rounded-lg">
                                        {transferInfo.transferCode}
                                    </p>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(transferInfo.transferCode)}
                                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                            <p className="font-semibold mb-1">Lưu ý quan trọng:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Vui lòng chuyển khoản đúng số tiền và nội dung.</li>
                                <li>Thời gian xử lý: 5–15 phút sau khi chuyển khoản.</li>
                                <li>Liên hệ hỗ trợ nếu sau 30 phút chưa được duyệt.</li>
                            </ul>
                        </div>

                        <div className="flex justify-center mt-6">
                            <button
                                onClick={() => setShowPopup(false)}
                                className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-all shadow-md"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Footers />
        </div>
    );
};

export default WalletPage;
