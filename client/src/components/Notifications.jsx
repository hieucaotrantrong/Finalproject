import React, { useState, useEffect, useRef } from 'react';
import { IoMdNotifications } from 'react-icons/io';
import axios from 'axios';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [unread, setUnread] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    const dropdownRef = useRef(null);
    const timeoutRef = useRef(null);

    // ================= FETCH =================
    const fetchNotifications = async () => {
        try {
            const userEmail =
                localStorage.getItem('userEmail') ||
                JSON.parse(localStorage.getItem('user') || '{}')?.email;

            if (!userEmail) return;

            const response = await axios.get(`http://localhost:5000/api/notifications/${userEmail}`);

            const newNotifications = response.data;

            setNotifications(newNotifications);
            setUnread(newNotifications.filter(n => !n.is_read).length);
        } catch (error) {
            console.error('Lỗi khi tải thông báo:', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    // ================= CLICK OUTSIDE =================
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ================= HOVER DELAY =================
    const handleMouseEnter = () => {
        clearTimeout(timeoutRef.current);
        setIsOpen(true);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 300); // delay 300ms để có "cầu"
    };

    // ================= MARK READ =================
    const handleMarkAsRead = async (id) => {
        try {
            await axios.put(`http://localhost:5000/api/notifications/${id}/read`);

            const updated = notifications.map(n =>
                n.id === id ? { ...n, is_read: true } : n
            );

            setNotifications(updated);
            setUnread(updated.filter(n => !n.is_read).length);
        } catch (error) {
            console.error('Lỗi khi đọc:', error);
        }
    };

    // ================= MARK ALL AS READ =================
    const handleMarkAllAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
        if (unreadIds.length === 0) return;

        const previousNotifications = notifications;
        const previousUnread = unread;

        const updated = notifications.map(n => ({ ...n, is_read: true }));
        setNotifications(updated);
        setUnread(0);

        try {
            await axios.put(`http://localhost:5000/api/notifications/read-all`, {
                ids: unreadIds
            });
        } catch (error) {
            console.error('Lỗi khi đọc tất cả:', error);
            setNotifications(previousNotifications);
            setUnread(previousUnread);
        }
    };

    return (
        <div
            className="relative"
            ref={dropdownRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* ICON */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-800"
            >
                <IoMdNotifications className="text-2xl" />

                {unread > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                        {unread}
                    </span>
                )}
            </button>

            {/* DROPDOWN */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">

                    {/* HEADER */}
                    <div className="p-4 border-b flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Thông báo</h3>
                        {notifications.length > 0 && unread > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-sm text-blue-500 hover:underline"
                            >
                                Đọc tất cả
                            </button>
                        )}
                    </div>

                    {/* LIST */}
                    <div className="divide-y">
                        {notifications.length === 0 ? (
                            <div className="p-4 text-gray-500 text-center">
                                Không có thông báo nào
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-4 hover:bg-gray-50 cursor-pointer ${
                                        !notification.is_read ? 'bg-blue-50' : ''
                                    }`}
                                    onClick={() => handleMarkAsRead(notification.id)}
                                >
                                    <div className="text-sm font-medium text-gray-900">
                                        {notification.title}
                                    </div>

                                    <div className="text-sm text-gray-500 mt-1">
                                        {notification.message}
                                    </div>

                                    <div className="text-xs text-gray-400 mt-1">
                                        {new Date(notification.created_at).toLocaleString('vi-VN')}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notifications;