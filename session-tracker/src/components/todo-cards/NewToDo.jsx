import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

// Predefined classes with unique colors
const CLASS_LIST = [
    { name: "1801 - Systems", color: "#f87171" },
    { name: "1802 - Collab", color: "#fb923c" },
    { name: "2150 - Frontend", color: "#4ade80" },
    { name: "2301 - Enterprise", color: "#60a5fa" },
    { name: "2401 - Backend", color: "#c084fc" },
];

// Color palette for custom classes
const COLOR_PALETTE = [
    '#f87171', '#fb923c', '#fbbf24', '#4ade80',
    '#22d3ee', '#60a5fa', '#c084fc', '#f472b6',
];

const DEFAULT_CLASS_COLOR = '#60a5fa';

export default function NewToDo() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [classType, setClassType] = useState('');
    const [classColor, setClassColor] = useState(DEFAULT_CLASS_COLOR);
    const [importance, setImportance] = useState(3);
    const [dueDate, setDueDate] = useState('');
    const [showPalette, setShowPalette] = useState(false);

    const importanceColors = {
        1: '#4ade80',
        2: '#60a5fa',
        3: '#fbbf24',
        4: '#fb923c',
        5: '#f87171',
    };

    // When selecting a preset class, auto-set its color
    const handleChipClick = (cls) => {
        if (classType === cls.name) {
            setClassType('');
            setClassColor(DEFAULT_CLASS_COLOR);
        } else {
            setClassType(cls.name);
            setClassColor(cls.color);
        }
        setShowPalette(false);
    };

    // When typing a custom class, keep current color (or default)
    const handleCustomClass = (e) => {
        const value = e.target.value;
        setClassType(value);
        // If they clear it, reset color
        if (!value.trim()) setClassColor(DEFAULT_CLASS_COLOR);
        // If typing doesn't match a preset, show palette option
        const match = CLASS_LIST.find((c) => c.name === value);
        if (match) {
            setClassColor(match.color);
            setShowPalette(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user || !title.trim()) return;

        try {
            await addDoc(collection(db, 'users', user.uid, 'todos'), {
                title,
                classType,
                classColor,
                importance,
                dueDate,
                complete: false,
                createdAt: serverTimestamp(),
            });

            setTitle('');
            setClassType('');
            setClassColor(DEFAULT_CLASS_COLOR);
            setImportance(3);
            setDueDate('');
            setShowPalette(false);
            setIsOpen(false);
        } catch (err) {
            console.error('Failed to add task:', err);
        }
    };

    // Check if current classType matches a preset
    const isCustomClass = classType && !CLASS_LIST.find((c) => c.name === classType);

    return (
        <div className="todo-new-entry-wrapper">
            <button
                className={`todo-new-btn ${isOpen ? 'todo-new-btn-close' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? '✕ Close' : '+ New Entry'}
            </button>

            {isOpen && (
                <form className="todo-form" onSubmit={handleSubmit}>
                    <div className="todo-form-group">
                        <label className="todo-form-label">Task Title</label>
                        <input
                            className="todo-form-input"
                            type="text"
                            placeholder="What needs to be done?"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="todo-form-group">
                        <label className="todo-form-label">Class</label>
                        {/* Quick-select chips with unique colors */}
                        <div className="todo-class-chips">
                            {CLASS_LIST.map((cls) => (
                                <button
                                    key={cls.name}
                                    type="button"
                                    className={`todo-class-chip ${classType === cls.name ? 'todo-class-chip-active' : ''}`}
                                    style={{
                                        '--chip-color': cls.color,
                                        borderColor: classType === cls.name ? cls.color : undefined,
                                        backgroundColor: classType === cls.name ? `${cls.color}25` : undefined,
                                        color: classType === cls.name ? cls.color : undefined,
                                    }}
                                    onClick={() => handleChipClick(cls)}
                                >
                                    <span className="todo-chip-dot" style={{ backgroundColor: cls.color }}></span>
                                    {cls.name}
                                </button>
                            ))}
                        </div>

                        {/* Manual input */}
                        <div className="todo-custom-class-row">
                            <input
                                className="todo-form-input"
                                type="text"
                                placeholder="Or type a custom class..."
                                value={classType}
                                onChange={handleCustomClass}
                            />
                            {/* Color picker toggle — only show for custom classes */}
                            {isCustomClass && (
                                <button
                                    type="button"
                                    className="todo-color-toggle"
                                    style={{ backgroundColor: classColor }}
                                    onClick={() => setShowPalette(!showPalette)}
                                    title="Pick a color"
                                />
                            )}
                        </div>

                        {/* Color palette */}
                        {showPalette && isCustomClass && (
                            <div className="todo-color-palette">
                                {COLOR_PALETTE.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        className={`todo-color-swatch ${classColor === color ? 'todo-color-swatch-active' : ''}`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => {
                                            setClassColor(color);
                                            setShowPalette(false);
                                        }}
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
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>

                        <div className="todo-form-group todo-importance-slider">
                            <div className="todo-importance-header">
                                <span className="todo-form-label">Importance</span>
                                <span
                                    className="todo-importance-value"
                                    style={{ backgroundColor: importanceColors[importance], color: '#1a1a2e' }}
                                >
                                    {importance}/5
                                </span>
                            </div>
                            <input
                                className="todo-slider"
                                type="range"
                                min="1"
                                max="5"
                                value={importance}
                                onChange={(e) => setImportance(parseInt(e.target.value))}
                            />
                        </div>
                    </div>

                    <button className="todo-form-submit" type="submit">Add Task</button>
                </form>
            )}
        </div>
    );
}