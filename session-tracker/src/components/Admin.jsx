// src/components/Admin.jsx
import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import '../css/Admin.css';

export default function Admin() {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [role, setRole] = useState('user');
    const [coins, setCoins] = useState(0);
    const [xp, setXp] = useState(0);
    const [displayName, setDisplayName] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedUser) {
            setError("Please select a user.");
            setMessage("");
            return;
        }

        try {
            await updateDoc(doc(db, "users", selectedUser.id), {
                role, coins, xp, displayName
            });
            setMessage("User updated successfully.");
            setError("");
        } catch (err) {
            console.error(err);
            setError("Failed to update user.");
            setMessage('');
        } finally {
            setTimeout(() => { setMessage(''); setError(''); }, 3000);
        }
    };

    const handleUserSelect = (id) => {
        const user = users.find(u => u.id === id);
        if (!user) return;
        setSelectedUser(user);
        setRole(user.role || "user");
        setCoins(user.coins || 0);
        setXp(user.xp || 0);
        setDisplayName(user.displayName || "");
    };

    useEffect(() => {
        const fetchAllUsers = async () => {
            try {
                const q = query(collection(db, 'users'), orderBy('displayName'));
                const snapshot = await getDocs(q);
                setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (err) {
                console.error('Error: ', err);
            }
        };
        fetchAllUsers();
    }, []);

    return (
        <div className="admin-container">
            <div className="admin-content">
                <div className="admin-header">
                    <h2 className="admin-title">Admin Panel</h2>
                    <p className="admin-subtitle">User Management</p>
                </div>

                {message && <div className="admin-msg admin-msg-success">✓ {message}</div>}
                {error && <div className="admin-msg admin-msg-error">✕ {error}</div>}

                <form className="admin-form" onSubmit={handleSubmit}>
                    <div className="admin-form-group">
                        <label className="admin-form-label">Select User</label>
                        <select
                            className="admin-select"
                            onChange={(e) => handleUserSelect(e.target.value)}
                            value={selectedUser?.id || ''}
                        >
                            <option value="">Select a user...</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.displayName} — {u.role || 'user'}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedUser && (
                        <div className="admin-selected-user">
                            <div className="admin-selected-avatar">
                                {(selectedUser.displayName || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="admin-selected-info">
                                <span className="admin-selected-name">{selectedUser.displayName}</span>
                                <span className="admin-selected-email">{selectedUser.email}</span>
                            </div>
                            <span className="admin-selected-coins">🪙 {selectedUser.coins || 0}</span>
                        </div>
                    )}

                    <div className="admin-form-row">
                        <div className="admin-form-group">
                            <label className="admin-form-label">Role</label>
                            <select className="admin-select" value={role} onChange={(e) => setRole(e.target.value)}>
                                <option value="viewer">Viewer</option>
                                <option value="user">User</option>
                                <option value="staff">Staff</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div className="admin-form-group">
                            <label className="admin-form-label">Coins</label>
                            <input
                                className="admin-input"
                                type="number"
                                value={coins}
                                onChange={(e) => setCoins(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="admin-form-row">
                        <div className="admin-form-group">
                            <label className="admin-form-label">XP</label>
                            <input
                                className="admin-input"
                                type="number"
                                value={xp}
                                onChange={(e) => setXp(Number(e.target.value))}
                            />
                        </div>
                        <div className="admin-form-group">
                            <label className="admin-form-label">Display Name</label>
                            <input
                                className="admin-input"
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Enter name..."
                            />
                        </div>
                    </div>

                    <button className="admin-submit" type="submit" disabled={!selectedUser}>
                        Update User
                    </button>
                </form>

                <div className="admin-user-list">
                    <div className="admin-user-list-header">
                        <h3 className="admin-user-list-title">All Users ({users.length})</h3>
                    </div>
                    <div className="admin-user-list-scroll">
                        {users.map(u => (
                            <div
                                key={u.id}
                                className={`admin-user-row ${selectedUser?.id === u.id ? 'admin-user-row-active' : ''}`}
                                onClick={() => handleUserSelect(u.id)}
                            >
                                <div className="admin-user-row-left">
                                    <div className="admin-user-row-avatar">
                                        {(u.displayName || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <span className="admin-user-row-name">{u.displayName}</span>
                                </div>
                                <div className="admin-user-row-right">
                                    <span className="admin-user-row-role">{u.role || 'user'}</span>
                                    <span className="admin-user-row-coins">🪙 {u.coins || 0}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}