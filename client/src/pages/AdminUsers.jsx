import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        role: '',
        phone: '',
        address: '',
        birth_date: '',
        gender: '',
        avatar: ''
    });
    const [showForm, setShowForm] = useState(false);
    const [newUser, setNewUser] = useState({
        first_name: '', last_name: '', email: '', password: '', role: 'user', phone: '', gender: ''
    });

    const fetchUsers = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/admin/users', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            setUsers(res.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const startEdit = (u) => {
        setEditingId(u.id);
        setForm({
            first_name: u.first_name || '',
            last_name: u.last_name || '',
            role: u.role || '',
            phone: u.phone || '',
            address: u.address || '',
            birth_date: u.birth_date ? u.birth_date.split('T')[0] : '',
            gender: u.gender || '',
            avatar: u.avatar || ''
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm({ first_name: '', last_name: '', role: '', phone: '', address: '', birth_date: '', gender: '', avatar: '' });
    };

    const saveEdit = async (id) => {
        try {
            const token = sessionStorage.getItem('token');
            await axios.put(`http://localhost:5000/api/admin/users/${id}`, form, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            await fetchUsers();
            cancelEdit();
            alert(' Cập nhật người dùng thành công!');
        } catch (err) {
            console.error(err);
            alert(' Lỗi khi cập nhật người dùng');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Xác nhận xoá người dùng?')) return;
        try {
            const token = sessionStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/admin/users/${id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            await fetchUsers();
            alert(' Xóa người dùng thành công!');
        } catch (err) {
            console.error(err);
            alert(' Lỗi khi xoá người dùng');
        }
    };

    const createUser = async (e) => {
        e.preventDefault();
        try {
            const token = sessionStorage.getItem('token');
            await axios.post('http://localhost:5000/api/admin/users', newUser, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            setNewUser({ first_name: '', last_name: '', email: '', password: '', role: 'user', phone: '', gender: '' });
            await fetchUsers();
            alert(' Tạo người dùng thành công!');
        } catch (err) {
            console.error(err);
            alert(err?.response?.data?.error || ' Lỗi khi tạo người dùng');
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
            {/* BUTTON SHOW / HIDE FORM */}
            <button
                onClick={() => setShowForm(!showForm)}
                className="w-full rounded border border-gray-600 bg-white py-2 font-semibold text-gray-700 transition hover:bg-gray-100"
            >
                {showForm ? "Ẩn form tạo người dùng" : " Thêm người dùng"}
            </button>

            {/* FORM TẠO USER */}
            {showForm && (
                <form
                    onSubmit={createUser}
                    className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-inner"
                >
                    <input
                        required placeholder="Họ"
                        value={newUser.first_name}
                        onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                        className="px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-slate-300 outline-none"
                    />
                    <input
                        required placeholder="Tên"
                        value={newUser.last_name}
                        onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                        className="px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-slate-300 outline-none"
                    />
                    <input
                        required placeholder="Email" type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        className="px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-slate-300 outline-none"
                    />
                    <input
                        required placeholder="Mật khẩu" type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        className="px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-slate-300 outline-none"
                    />
                    <select
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                        className="px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-slate-300"
                    >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                    <input
                        placeholder="Số điện thoại"
                        value={newUser.phone}
                        onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                        className="px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-slate-300"
                    />
                    <select
                        value={newUser.gender}
                        onChange={(e) => setNewUser({ ...newUser, gender: e.target.value })}
                        className="px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-slate-300"
                    >
                        <option value="">--Giới tính--</option>
                        <option value="male">Nam</option>
                        <option value="female">Nữ</option>
                        <option value="other">Khác</option>
                    </select>
                    <button
                        type="submit"
                        className="w-full rounded border border-gray-600 bg-white py-2 font-semibold text-gray-700 transition hover:bg-gray-100"
                    >
                         Xác nhận thêm người dùng
                    </button>
                </form>
            )}

            {/* TABLE */}
            <div className="overflow-x-auto mt-6">
                <table className="w-full border border-slate-200 rounded-lg overflow-hidden text-sm">
                    <thead className="bg-slate-100 text-slate-600 font-medium">
                        <tr>
                            <th className="py-2 px-3 border-r border-slate-200 font-medium">ID</th>
                            <th className="px-3 border-r border-slate-200 font-medium">Email</th>
                            <th className="px-3 border-r border-slate-200 font-medium">Họ</th>
                            <th className="px-3 border-r border-slate-200 font-medium">Tên</th>
                            <th className="px-3 border-r border-slate-200 font-medium">Vai trò</th>
                            <th className="px-3 border-r border-slate-200 font-medium">Điện thoại</th>
                            <th className="px-3 border-r border-slate-200 font-medium">Giới tính</th>
                            <th className="px-3 text-center font-medium">Hành động</th>
                        </tr>
                    </thead>

                    <tbody>
                        {users.map((u) => (
                            <tr
                                key={u.id}
                                className="border-t border-slate-200 hover:bg-slate-50 transition text-gray-800"
                            >
                                <td className="py-2 px-3 border-r border-slate-200 text-center">{u.id}</td>
                                <td className="px-3 border-r border-slate-200">{u.email}</td>

                                <td className="px-3 border-r border-slate-200">
                                    {editingId === u.id ? (
                                        <input
                                            value={form.first_name}
                                            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                                            className="px-2 py-1 rounded border border-slate-300 w-full"
                                        />
                                    ) : (
                                        u.first_name
                                    )}
                                </td>

                                <td className="px-3 border-r border-slate-200">
                                    {editingId === u.id ? (
                                        <input
                                            value={form.last_name}
                                            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                                            className="px-2 py-1 rounded border border-slate-300 w-full"
                                        />
                                    ) : (
                                        u.last_name
                                    )}
                                </td>

                                <td className="px-3 border-r border-slate-200 text-center">
                                    {editingId === u.id ? (
                                        <select
                                            value={form.role}
                                            onChange={(e) => setForm({ ...form, role: e.target.value })}
                                            className="px-2 py-1 rounded border border-slate-300"
                                        >
                                            <option value="user">user</option>
                                            <option value="admin">admin</option>
                                        </select>
                                    ) : (
                                        u.role
                                    )}
                                </td>

                                <td className="px-3 border-r border-slate-200 text-center">
                                    {editingId === u.id ? (
                                        <input
                                            value={form.phone}
                                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                            className="px-2 py-1 rounded border border-slate-300 w-full"
                                        />
                                    ) : (
                                        u.phone
                                    )}
                                </td>

                                <td className="px-3 border-r border-slate-200 text-center">
                                    {editingId === u.id ? (
                                        <select
                                            value={form.gender}
                                            onChange={(e) => setForm({ ...form, gender: e.target.value })}
                                            className="px-2 py-1 rounded border border-slate-300"
                                        >
                                            <option value="male">Nam</option>
                                            <option value="female">Nữ</option>
                                            <option value="other">Khác</option>
                                        </select>
                                    ) : (
                                        u.gender
                                    )}
                                </td>

                                <td className="py-2 px-3 text-center">
                                    {editingId === u.id ? (
                                        <>
                                            <button
                                                onClick={() => saveEdit(u.id)}
                                                className="rounded border border-gray-500 px-3 py-1 mr-2 text-sm text-gray-700 transition hover:bg-gray-100"
                                            >
                                                 Lưu
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                className="rounded border border-red-500 px-3 py-1 text-sm text-red-500 transition hover:bg-red-50"
                                            >
                                                 Hủy
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => startEdit(u)}
                                                className="rounded border border-gray-500 px-3 py-1 mr-2 text-sm text-gray-700 transition hover:bg-gray-100"
                                            >
                                                Sửa
                                            </button>
                                            <button
                                                onClick={() => handleDelete(u.id)}
                                                className="rounded border border-red-500 px-3 py-1 text-sm text-red-500 transition hover:bg-red-50"
                                            >
                                                Xóa
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}

                        {users.length === 0 && (
                            <tr>
                                <td colSpan="8" className="py-3 text-center text-gray-600">
                                    Không có người dùng
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
};

export default AdminUsers;
