import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { FiSend } from 'react-icons/fi';
import { IoMdClose } from 'react-icons/io';

const WELCOME_MESSAGES = [
    {
        text: 'Xin chào Anh/Chị! Em là trợ lý AI của Thế giới di động',
        isUser: false,
    },
    {
        text: 'Em rất sẵn lòng hỗ trợ Anh/Chị 😊',
        isUser: false,
    },
];

const ChatBotIcon = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [responses, setResponses] = useState(WELCOME_MESSAGES);
    const messagesEndRef = useRef(null);

    const handleToggle = () => setIsOpen((prev) => !prev);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [responses, isOpen]);

    const handleSendMessage = async () => {
        if (!message.trim()) return;

        const newResponses = [...responses, { text: message, isUser: true }];
        setResponses(newResponses);

        try {
            const response = await axios.post('http://localhost:5000/api/chatbot/chat', { prompt: message });
            setResponses([...newResponses, { text: response.data.text, isUser: false }]);
            setMessage('');
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSendMessage();
    };

    const MessageContent = ({ text }) => {
        if (text.includes('/assets/')) {
            const [prefix, imageName] = text.split('/assets/');

            return (
                <>
                    <div>{prefix}</div>
                    <img
                        src={`/assets/${imageName}`}
                        alt="Product"
                        className="mt-2 h-auto w-full rounded-lg"
                    />
                </>
            );
        }

        return <div>{text}</div>;
    };

    const ChatAvatar = ({ isUser }) => {
        if (isUser) return null;

        return (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#ffd400] shadow-sm border border-white/80">
                <img src="/assets/chatbot.png" alt="bot" className="h-5 w-5 rounded-full object-cover" />
            </div>
        );
    };

    return (
        <div>
            {!isOpen && (
                <div className="fixed bottom-24 right-6 z-40 max-w-[210px] rounded-2xl border border-[#e7e7e7] bg-white px-4 py-3 shadow-[0_14px_40px_rgba(0,0,0,0.12)]">
                    <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#ffd400]">
                            <img src="/assets/chatbot.png" alt="Chatbot" className="h-6 w-6 rounded-full object-cover" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800">Trợ lý TDDD</p>
                            <p className="mt-1 text-xs leading-5 text-gray-600">
                                Xin chào Anh/Chị!
                                <br />
                                Em rất sẵn lòng hỗ trợ.
                            </p>
                        </div>
                    </div>
                    <div className="absolute -bottom-1 right-8 h-3 w-3 rotate-45 border-r border-b border-[#e7e7e7] bg-white" />
                </div>
            )}

            <button
                onClick={handleToggle}
                className="fixed bottom-6 right-6 z-50 h-16 w-16 overflow-hidden rounded-full border border-[#f0c400] bg-[#ffd400] shadow-[0_10px_30px_rgba(0,0,0,0.16)] transition-all duration-300 ease-in-out hover:scale-110"
            >
                <img src="/assets/chatbot.png" alt="Chatbot" className="h-14 w-14 rounded-full object-cover" />
            </button>

            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 flex h-[560px] w-[375px] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[28px] border border-[#d8d8d8] bg-[#f3f3f3] shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
                    <div className="flex items-center justify-between bg-[#555] px-4 py-3 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#ffd400]">
                                <img src="/assets/chatbot.png" alt="Chatbot" className="h-7 w-7 rounded-full object-cover" />
                            </div>
                            <h3 className="text-base font-semibold leading-tight">Thế giới di động</h3>
                        </div>

                        <button onClick={handleToggle} className="rounded-full p-1.5 text-white/90 transition hover:bg-white/10 hover:text-white">
                            <IoMdClose />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-[#f3f3f3] px-4 py-4">
                        <div className="space-y-3">
                            {responses.map((res, index) => (
                                <div key={index} className={`flex items-end gap-2 ${res.isUser ? 'justify-end' : 'justify-start'}`}>
                                    {!res.isUser && <ChatAvatar isUser={false} />}

                                    <div
                                        className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                                            res.isUser
                                                ? 'rounded-br-md bg-[#ffd400] text-gray-900'
                                                : 'rounded-bl-md bg-[#f7f7fb] text-gray-800 border border-white'
                                        }`}
                                    >
                                        <MessageContent text={res.text} />
                                    </div>

                                    {res.isUser && (
                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4f8cff] text-[10px] font-bold text-white shadow-sm">
                                            <span>AI</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    <div className="border-t border-[#dedede] bg-[#f8f8f8] px-4 py-3">
                        <div className="flex items-center gap-2 rounded-full border border-[#d8d8d8] bg-white px-3 py-2 shadow-inner">
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="Nhập tin nhắn..."
                                className="min-w-0 flex-1 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-gray-400"
                            />
                            <button
                                onClick={handleSendMessage}
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d9d9d9] text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                            >
                                <FiSend />
                            </button>
                        </div>

                        <p className="mt-2 px-2 text-center text-[11px] text-gray-500">
                            Thông tin chỉ mang tính tham khảo, được tư vấn bởi Trí Tuệ Nhân Tạo
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatBotIcon;
