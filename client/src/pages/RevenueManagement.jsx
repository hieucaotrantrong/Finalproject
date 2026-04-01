import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    PointElement,
    LineElement,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    PointElement,
    LineElement,
    Tooltip,
    Legend,
    Filler
);

const formatCurrency = (value) => {
    const amount = Number(value || 0);
    return `${amount.toLocaleString('vi-VN')}đ`;
};

const formatDate = (value) => {
    if (!value) return '';
    return new Date(value).toLocaleDateString('vi-VN');
};

const toIsoDate = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const tabLikeButtonClass =
    'px-6 py-2.5 rounded border transition-all text-[15px] bg-white border-gray-300 text-gray-700 hover:border-gray-400';

const panelClass = 'rounded border border-gray-300 bg-white';

const RevenueManagement = () => {
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [summary, setSummary] = useState({
        totalRevenue: 0,
        completedOrders: 0,
        totalItems: 0,
        averageOrderValue: 0,
        totalOrders: 0,
        incompleteOrders: 0,
        completionRate: 0
    });
    const [byDate, setByDate] = useState([]);

    const handleExportPdf = () => {
        const doc = new jsPDF();
        const reportDate = formatDate(new Date());
        const startFilter = fromDate ? formatDate(fromDate) : 'Tất cả';
        const endFilter = toDate ? formatDate(toDate) : 'ất cả';

        doc.setFontSize(16);
        doc.text('Báo cáo doanh thu', 14, 16);

        doc.setFontSize(11);
        doc.text(`Ngày xuất: ${reportDate}`, 14, 24);
        doc.text(`Lọc từ: ${startFilter} - đến: ${endFilter}`, 14, 30);

        autoTable(doc, {
            startY: 36,
            head: [['Chi so', 'Gia tri']],
            body: [
                ['Tổng doanh thu', formatCurrency(summary.totalRevenue)],
                ['Đơn hoàn thành', Number(summary.completedOrders || 0).toLocaleString('vi-VN')],
                ['Sản phẩm đã bán', Number(summary.totalItems || 0).toLocaleString('vi-VN')],
                ['Giá trị TB mỗi đơn', formatCurrency(summary.averageOrderValue)],
                ['Tỷ lệ hoàn thành', `${Number(summary.completionRate || 0).toFixed(1)}%`]
            ],
            styles: { fontSize: 10 }
        });

        const tableRows = byDate.length
            ? byDate.map((row) => [
                formatDate(row.day),
                Number(row.orders || 0).toLocaleString('vi-VN'),
                formatCurrency(row.revenue)
            ])
            : [['Khong co du lieu', '-', '-']];

        autoTable(doc, {
            startY: (doc.lastAutoTable?.finalY || 36) + 8,
            head: [['Ngay', 'So don hoan thanh', 'Doanh thu']],
            body: tableRows,
            styles: { fontSize: 10 }
        });

        doc.save(`bao-cao-doanh-thu-${toIsoDate(new Date())}.pdf`);
    };

    const fetchRevenue = async (options = {}) => {
        try {
            const isReset = options.reset === true;
            const nextFrom = isReset ? '' : fromDate;
            const nextTo = isReset ? '' : toDate;

            setLoading(true);
            setError('');

            const token = localStorage.getItem('token');
            const params = {};

            if (nextFrom) params.from = nextFrom;
            if (nextTo) params.to = nextTo;

            const response = await axios.get('http://localhost:5000/api/orders/revenue/summary', {
                params,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setSummary(response.data?.summary || {
                totalRevenue: 0,
                completedOrders: 0,
                totalItems: 0,
                averageOrderValue: 0,
                totalOrders: 0,
                incompleteOrders: 0,
                completionRate: 0
            });
            setByDate(response.data?.byDate || []);
        } catch (err) {
            console.error('Loi khi lay doanh thu:', err);
            setError('Khong the tai du lieu doanh thu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRevenue();
    }, []);

    const hasFilter = useMemo(() => Boolean(fromDate || toDate), [fromDate, toDate]);

    const revenueSeries = useMemo(() => {
        const source = [...byDate].slice(0, 60);
        const mapByDay = new Map();

        source.forEach((row) => {
            const key = toIsoDate(row.day);
            mapByDay.set(key, {
                revenue: Number(row.revenue || 0),
                orders: Number(row.orders || 0)
            });
        });

        let anchorDate = new Date();

        // If user selects "Đến ngày", use it as chart end date.
        if (toDate) {
            anchorDate = new Date(toDate);
        }

        // Keep chart ending at today when there is no filter, so missing-sale days drop to 0.
        if (!toDate) {
            anchorDate = new Date();
        }

        anchorDate.setHours(0, 0, 0, 0);

        const result = [];

        // Render a continuous 7-day window ending at latest available data.
        for (let i = 6; i >= 0; i--) {
            const d = new Date(anchorDate);
            d.setDate(anchorDate.getDate() - i);
            const key = toIsoDate(d);
            const dayData = mapByDay.get(key);
            result.push({
                day: key,
                revenue: dayData?.revenue || 0,
                orders: dayData?.orders || 0
            });
        }

        return result;
    }, [byDate, toDate]);

    const revenueBarData = useMemo(() => {
        const revenueValues = revenueSeries.map((row) => Number(row.revenue || 0));
        const deltaValues = revenueValues.map((value, index) => {
            if (index === 0) return 0;
            return value - revenueValues[index - 1];
        });

        return {
            labels: revenueSeries.map((row) => formatDate(row.day)),
            datasets: [
                {
                    label: 'Doanh thu',
                    data: revenueValues,
                    borderRadius: 8,
                    backgroundColor: '#22d3ee',
                    borderSkipped: false,
                    barPercentage: 0.42,
                    categoryPercentage: 0.7
                },
                {
                    label: 'Bien dong ngay',
                    data: deltaValues,
                    borderRadius: 8,
                    backgroundColor: '#6366f1',
                    borderSkipped: false,
                    barPercentage: 0.42,
                    categoryPercentage: 0.7
                }
            ]
        };
    }, [revenueSeries]);

    const revenueBarOptions = useMemo(() => {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#475569'
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(148, 163, 184, 0.18)' },
                    ticks: { color: '#64748b', maxRotation: 0, autoSkip: true }
                },
                y: {
                    grid: { color: 'rgba(148, 163, 184, 0.18)' },
                    ticks: {
                        color: '#64748b',
                        callback: (value) => `${(Number(value) / 1000000).toFixed(1)}tr`
                    }
                }
            }
        };
    }, []);

    const trendLineData = useMemo(() => {
        return {
            labels: revenueSeries.map((row) => formatDate(row.day)),
            datasets: [
                {
                    label: 'Trung binh/ngay',
                    data: revenueSeries.map((row) => {
                        const orders = Number(row.orders || 1);
                        return Number(row.revenue || 0) / Math.max(orders, 1);
                    }),
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99,102,241,0.18)',
                    fill: true,
                    pointRadius: 0,
                    tension: 0.4
                }
            ]
        };
    }, [revenueSeries]);

    const trendLineOptions = useMemo(() => {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    display: true,
                    grid: { display: false },
                    ticks: {
                        color: '#64748b',
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 7
                    }
                },
                y: { display: false }
            }
        };
    }, []);

    const completionRatioData = useMemo(() => {
        const completed = Number(summary.completedOrders || 0);
        const incomplete = Number(summary.incompleteOrders || 0);

        if (completed === 0 && incomplete === 0) {
            return {
                labels: ['Chua co du lieu'],
                datasets: [
                    {
                        data: [1],
                        backgroundColor: ['#334155'],
                        borderWidth: 0
                    }
                ]
            };
        }

        return {
            labels: ['Đơn hoàn thành', 'Đơn chưa hoàn thành'],
            datasets: [
                {
                    data: [completed, incomplete],
                    backgroundColor: ['#22d3ee', '#f59e0b'],
                    borderWidth: 0
                }
            ]
        };
    }, [summary]);

    const completionRatioOptions = useMemo(() => {
        return {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#475569',
                        boxWidth: 10,
                        boxHeight: 10
                    }
                }
            }
        };
    }, []);

    return (
        <div className="min-h-screen p-6 bg-gray-50 text-gray-900">
            <div className="max-w-[1400px] mx-auto space-y-5">
            <section className={`${panelClass} p-5`}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                       

                        <div className="flex flex-wrap items-end gap-3 w-full lg:w-auto">
                            <div className="w-full sm:w-[220px]">
                                <label className="block text-xs text-gray-500 mb-1">Từ ngày</label>
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
                                />
                            </div>

                            <div className="w-full sm:w-[220px]">
                                <label className="block text-xs text-gray-500 mb-1">Đến ngày</label>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
                                />
                            </div>

                            <button
                                onClick={() => fetchRevenue()}
                                className={`${tabLikeButtonClass} whitespace-nowrap`}
                            >
                                Xem báo cáo
                            </button>
                            <button
                                onClick={handleExportPdf}
                                className={`${tabLikeButtonClass} whitespace-nowrap`}
                            >
                               Xuất PDF
                            </button>
                            <button
                                onClick={() => {
                                    setFromDate('');
                                    setToDate('');
                                    fetchRevenue({ reset: true });
                                }}
                                className={`${tabLikeButtonClass} whitespace-nowrap`}
                            >
                                Xóa lọc
                            </button>
                        </div>
                    </div>

                    {hasFilter && (
                        <p className="text-xs text-cyan-600 mt-3">Đang lọc dữ liệu theo khoảng ngày đã chọn.</p>
                    )}
                    {error && (
                        <p className="text-sm text-rose-600 mt-3">{error}</p>
                    )}
                </section>

                <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <article className={`${panelClass} p-4`}>
                        <p className="text-gray-500 text-sm">Tổng doanh thu</p>
                        <p className="text-2xl font-bold text-cyan-600 mt-1">{formatCurrency(summary.totalRevenue)}</p>
                    </article>

                    <article className={`${panelClass} p-4`}>
                        <p className="text-gray-500 text-sm">Đơn hoàn thành</p>
                        <p className="text-2xl font-bold text-emerald-600 mt-1">{Number(summary.completedOrders || 0).toLocaleString('vi-VN')}</p>
                    </article>

                    <article className={`${panelClass} p-4`}>
                        <p className="text-gray-500 text-sm">Sản phẩm đã bán</p>
                        <p className="text-2xl font-bold text-amber-600 mt-1">{Number(summary.totalItems || 0).toLocaleString('vi-VN')}</p>
                    </article>

                    <article className={`${panelClass} p-4`}>
                        <p className="text-gray-500 text-sm">Giá trị TB mỗi đơn</p>
                        <p className="text-2xl font-bold text-indigo-600 mt-1">{formatCurrency(summary.averageOrderValue)}</p>
                    </article>
                </section>

                <section className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-4">
                    <article className={`${panelClass} p-5`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-lg">Doanh thu theo ngay</h3>
                            <span className="text-xs text-gray-500">Top 14 ngày gần nhất</span>
                        </div>
                        <div className="h-72">
                            {loading ? (
                                <div className="h-full flex items-center justify-center text-gray-500">Đang tải dữ liệu...</div>
                            ) : revenueSeries.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-gray-500">Chưa có dữ liệu doanh thu.</div>
                            ) : (
                                <Bar data={revenueBarData} options={revenueBarOptions} />
                            )}
                        </div>
                    </article>

                    <div className="space-y-4">
                        <article className={`${panelClass} p-5`}>
                            <h3 className="font-semibold text-lg mb-3">Tỷ lệ đơn hoàn thành</h3>
                            <div className="w-[240px] h-[240px] mx-auto">
                                <Doughnut data={completionRatioData} options={completionRatioOptions} />
                            </div>
                            <p className="text-center text-cyan-600 text-sm mt-2">
                                Tỷ lệ hoàn thành: {Number(summary.completionRate || 0).toFixed(1)}%
                            </p>
                        </article>

                        <article className={`${panelClass} p-5`}>
                            <h3 className="font-semibold text-lg mb-3">Xu hướng giá trị đơn hàng</h3>
                            <div className="h-40">
                                {revenueSeries.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-gray-500">Chưa có dữ liệu.</div>
                                ) : (
                                    <Line data={trendLineData} options={trendLineOptions} />
                                )}
                            </div>
                        </article>
                    </div>
                </section>

                <section className={`${panelClass} overflow-hidden`}>
                    <div className="px-5 py-4 border-b border-gray-200">
                        <h3 className="font-semibold text-lg">Chi tiet doanh thu theo ngay</h3>
                    </div>

                    {loading ? (
                        <div className="p-5 text-gray-500">Đang tải dữ liệu...</div>
                    ) : byDate.length === 0 ? (
                        <div className="p-5 text-gray-500">Chưa có đơn hoàn thành trong khoảng thời gian này.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                                    <tr>
                                        <th className="text-left px-4 py-3">Ngày</th>
                                        <th className="text-left px-4 py-3">Số đơn hoàn thành</th>
                                        <th className="text-left px-4 py-3">Doanh thu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {byDate.map((row) => (
                                        <tr key={String(row.day)} className="border-t border-gray-200">
                                            <td className="px-4 py-3">{formatDate(row.day)}</td>
                                            <td className="px-4 py-3">{Number(row.orders || 0).toLocaleString('vi-VN')}</td>
                                            <td className="px-4 py-3 font-semibold text-emerald-600">{formatCurrency(row.revenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default RevenueManagement;
