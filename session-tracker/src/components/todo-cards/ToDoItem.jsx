import { useState } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

const CLASS_LIST = [
    { name: "1801 - Systems", color: "#f87171" },
    { name: "1802 - Collab", color: "#fb923c" },
    { name: "2150 - Frontend", color: "#4ade80" },
    { name: "2301 - Enterprise", color: "#60a5fa" },
    { name: "2401 - Backend", color: "#c084fc" },
];

const COLOR_PALETTE = [
    '#f87171', '#fb923c', '#fbbf24', '#4ade80',
    '#22d3ee', '#60a5fa', '#c084fc', '#f472b6',
];

const getDueUrgency = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate + 'T00:00:00');
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'overdue';
    if (diffDays <= 3) return 'urgent';
    if (diffDays <= 7) return 'soon';
    return 'safe';
};

const importanceColors = {
    1: '#4ade80',
    2: '#60a5fa',
    3: '#fbbf24',
    4: '#fb923c',
    5: '#f87171',
};

export default function TodoItem({ task }) {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);
    const [editClassType, setEditClassType] = useState(task.classType || '');
    const [editClassColor, setEditClassColor] = useState(task.classColor || '#60a5fa');
    const [editImportance, setEditImportance] = useState(task.importance || 3);
    const [editDueDate, setEditDueDate] = useState(task.dueDate || '');
    const [showPalette, setShowPalette] = useState(false);

    const formatDueDate = (dueDate) => {
        if (!dueDate) return '';
        const date = new Date(dueDate + 'T00:00:00');
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    };

    const handleToggle = async (e) => {
        e.stopPropagation();
        if (!user) return;
        const taskRef = doc(db, 'users', user.uid, 'todos', task.id);
        await updateDoc(taskRef, { complete: !task.complete });
    };

    const handleDelete = async (e) => {
        e.stopPropagation();
        if (!user) return;
        const taskRef = doc(db, 'users', user.uid, 'todos', task.id);
        await deleteDoc(taskRef);
    };

    const handleCardClick = () => {
        if (!isEditing) setIsEditing(true);
    };

    const handleChipClick = (cls) => {
        if (editClassType === cls.name) {
            setEditClassType('');
            setEditClassColor('#60a5fa');
        } else {
            setEditClassType(cls.name);
            setEditClassColor(cls.color);
        }
        setShowPalette(false);
    };

    const handleCustomClass = (e) => {
        const value = e.target.value;
        setEditClassType(value);
        if (!value.trim()) setEditClassColor('#60a5fa');
        const match = CLASS_LIST.find((c) => c.name === value);
        if (match) {
            setEditClassColor(match.color);
            setShowPalette(false);
        }
    };

    const isCustomClass = editClassType && !CLASS_LIST.find((c) => c.name === editClassType);

    const handleSave = async () => {
        if (!user || !editTitle.trim()) return;
        const taskRef = doc(db, 'users', user.uid, 'todos', task.id);
        await updateDoc(taskRef, {
            title: editTitle,
            classType: editClassType,
            classColor: editClassColor,
            importance: editImportance,
            dueDate: editDueDate,
        });
        setIsEditing(false);
        setShowPalette(false);
    };

    const handleCancel = () => {
        setEditTitle(task.title);
        setEditClassType(task.classType || '');
        setEditClassColor(task.classColor || '#60a5fa');
        setEditImportance(task.importance || 3);
        setEditDueDate(task.dueDate || '');
        setIsEditing(false);
        setShowPalette(false);
    };

    const urgency = getDueUrgency(task.dueDate);
    const badgeColor = task.classColor || '#60a5fa';

    // --- EDIT MODE ---
    if (isEditing) {
        return (
            <div className="todo-edit-wrapper">
                <div className="todo-edit-form">
                    <div className="todo-form-group">
                        <label className="todo-form-label">Task Title</label>
                        <input
                            className="todo-form-input"
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="todo-form-group">
                        <label className="todo-form-label">Class</label>
                        <div className="todo-class-chips">
                            {CLASS_LIST.map((cls) => (
                                <button
                                    key={cls.name}
                                    type="button"
                                    className={`todo-class-chip ${editClassType === cls.name ? 'todo-class-chip-active' : ''}`}
                                    style={{
                                        borderColor: editClassType === cls.name ? cls.color : undefined,
                                        backgroundColor: editClassType === cls.name ? `${cls.color}25` : undefined,
                                        color: editClassType === cls.name ? cls.color : undefined,
                                    }}
                                    onClick={() => handleChipClick(cls)}
                                >
                                    <span className="todo-chip-dot" style={{ backgroundColor: cls.color }}></span>
                                    {cls.name}
                                </button>
                            ))}
                        </div>
                        <div className="todo-custom-class-row">
                            <input
                                className="todo-form-input"
                                type="text"
                                placeholder="Or type a custom class..."
                                value={editClassType}
                                onChange={handleCustomClass}
                            />
                            {isCustomClass && (
                                <button
                                    type="button"
                                    className="todo-color-toggle"
                                    style={{ backgroundColor: editClassColor }}
                                    onClick={() => setShowPalette(!showPalette)}
                                />
                            )}
                        </div>
                        {showPalette && isCustomClass && (
                            <div className="todo-color-palette">
                                {COLOR_PALETTE.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        className={`todo-color-swatch ${editClassColor === color ? 'todo-color-swatch-active' : ''}`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => { setEditClassColor(color); setShowPalette(false); }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="todo-form-row">
                        <div className="todo-form-group">
                            <label className="todo-form-label">Due Date</label>
                            <input
                                className="todo-form-input"
                                type="date"
                                value={editDueDate}
                                onChange={(e) => setEditDueDate(e.target.value)}
                            />
                        </div>
                        <div className="todo-form-group todo-importance-slider">
                            <div className="todo-importance-header">
                                <span className="todo-form-label">Importance</span>
                                <span
                                    className="todo-importance-value"
                                    style={{ backgroundColor: importanceColors[editImportance], color: '#1a1a2e' }}
                                >
                                    {editImportance}/5
                                </span>
                            </div>
                            <input
                                className="todo-slider"
                                type="range"
                                min="1"
                                max="5"
                                value={editImportance}
                                onChange={(e) => setEditImportance(parseInt(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="todo-edit-actions">
                        <button className="todo-edit-save" onClick={handleSave}>Save</button>
                        <button className="todo-edit-cancel" onClick={handleCancel}>Cancel</button>
                    </div>
                </div>
            </div>
        );
    }

    // --- VIEW MODE ---
    return (
        <div className={`todo-item ${task.complete ? 'todo-item-done' : ''}`}>
            <div className="todo-importance" style={{ backgroundColor: importanceColors[task.importance] }}>
                {task.importance}
            </div>

            <div className="todo-item-right">
                <div className="todo-card-row">
                    <div className="todo-card" onClick={handleCardClick}>
                        <span className="todo-title">{task.title}</span>
                        <div
                            className={`todo-checkbox ${task.complete ? 'todo-checkbox-done' : ''}`}
                            onClick={handleToggle}
                        >
                            {task.complete ? '✓' : ''}
                        </div>
                    </div>
                    <button className="todo-delete-btn" onClick={handleDelete} title="Delete task">
                        ✕
                    </button>
                </div>

                {(task.classType || task.dueDate) && (
                    <div className="todo-badges">
                        
                        {task.classType && (
                            <span
                                className="todo-badge todo-badge-class"
                                style={{
                                    backgroundColor: `${badgeColor}20`,
                                    color: badgeColor,
                                    borderColor: `${badgeColor}40`,
                                }}
                            >
                                {task.classType}
                            </span>
                        )}
                        {task.dueDate && (
                            <span className={`todo-badge todo-badge-date todo-badge-date-${urgency}`}>
                                {formatDueDate(task.dueDate)}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}