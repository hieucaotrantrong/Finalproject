import React, { useEffect, useState } from 'react';
import axios from 'axios';

const SupportManagement = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [reply, setReply] = useState('');

    // Fetch danh sách hỗ trợ
    const fetchRequests = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/support', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRequests(response.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setError('Không thể tải danh sách yêu cầu hỗ trợ');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    // Gửi phản hồi
    const handleReply = async (requestId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `http://localhost:5000/api/support/${requestId}/reply`,
                { reply },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            setReply('');
            setSelectedRequest(null);
            fetchRequests();
            alert('✅ Phản hồi đã được gửi thành công!');
        } catch (err) {
            console.error(err);
            alert('❌ Không thể gửi phản hồi. Vui lòng thử lại.');
        }
    };

    if (loading) return <div className="text-center py-4">Đang tải...</div>;
    if (error) return <div className="text-red-500 text-center py-4">{error}</div>;

    return (
        <div className="p-6 bg-white rounded-xl shadow-lg border border-yellow-300">

            {requests.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                    Chưa có yêu cầu hỗ trợ nào.
                </p>
            ) : (
                <div className="grid gap-6">
                    {requests.map((request) => (
                        <div
                            key={request.id}
                            className={`border rounded-xl shadow-sm transition-all hover:shadow-md overflow-hidden ${request.status === 'pending'
                                ? 'border-yellow-400'
                                : 'border-green-500'
                                }`}
                        >
                            {/* Header */}
                            <div className="flex justify-between items-start bg-yellow-50 px-5 py-3 border-b">
                                <div>
                                    <h3 className="font-semibold text-lg text-gray-800 capitalize">
                                        {request.name}
                                    </h3>
                                    <p className="text-sm text-gray-500">{request.email}</p>
                                </div>

                                <div className="text-right">
                                    <p className="text-xs text-gray-500">
                                        Gửi lúc: {new Date(request.created_at).toLocaleString('vi-VN')}
                                    </p>
                                    <span
                                        className={`inline-block mt-1 text-xs px-2 py-1 rounded-full font-semibold ${request.status === 'pending'
                                            ? 'bg-yellow-400 text-gray-800'
                                            : 'bg-green-500 text-white'
                                            }`}
                                    >
                                        {request.status === 'pending' ? '⏳ Chờ phản hồi' : '✅ Đã phản hồi'}
                                    </span>
                                </div>
                            </div>

                            {/* Nội dung yêu cầu */}
                            <div className="px-5 py-4">
                                <div className="mb-2">
                                    <span className="font-medium text-gray-700">Chủ đề:</span>{' '}
                                    <span className="text-gray-800">{request.topic}</span>
                                </div>
                                <div className="text-gray-700 border-l-4 border-yellow-400 pl-3 italic">
                                    {request.message}
                                </div>
                            </div>

                            {/* Phần phản hồi */}
                            {request.reply ? (
                                <div className="bg-green-50 px-5 py-4 border-t border-green-200">
                                    <div className="font-semibold text-green-700 mb-2">Phản hồi:</div>
                                    <p className="text-green-800">{request.reply}</p>
                                    <p className="text-sm text-green-600 mt-2">
                                        Đã trả lời: {new Date(request.replied_at).toLocaleString('vi-VN')}
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-gray-50 px-5 py-4 border-t border-gray-200">
                                    {selectedRequest === request.id ? (
                                        <div className="space-y-3">
                                            <textarea
                                                value={reply}
                                                onChange={(e) => setReply(e.target.value)}
                                                className="w-full border border-yellow-300 rounded-md p-3 h-28 focus:ring-2 focus:ring-yellow-400 outline-none"
                                                placeholder="✏ Nhập nội dung phản hồi..."
                                            />
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => handleReply(request.id)}
                                                    className="bg-yellow-400 text-black font-semibold px-4 py-2 rounded-lg shadow hover:bg-yellow-500 transition"
                                                >
                                                    Gửi phản hồi
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedRequest(null);
                                                        setReply('');
                                                    }}
                                                    className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 transition"
                                                >
                                                    Hủy
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setSelectedRequest(request.id)}
                                            className="text-yellow-600 font-semibold hover:text-yellow-700 transition ml-4 mb-2"
                                        >
                                            Trả lời yêu cầu này
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SupportManagement;
