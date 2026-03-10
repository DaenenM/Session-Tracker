import { useState } from 'react';

export default function NewToDo() {
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [classType, setClassType] = useState('');
    const [importance, setImportance] = useState('');
    const [dueDate, setDueDate] = useState('');

    function handleNewEntry() {
        setIsOpen(!isOpen);
    }

    function handleSubmit(e) {
        e.preventDefault();
        console.log({ title, description });
        // TODO: save to database or state
        setTitle('');
        setDescription('');
        setIsOpen(false);
    }

    return (
        <div>
            <button className="submit-btn" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? "Close" : "New Entry"}
            </button>

            {isOpen && (
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Task title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Class (e.g. 1802 - Collab)"
                        value={classType}
                        onChange={(e) => setClassType(e.target.value)}
                    />
                    <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                    />
                    <label>
                        Importance: {importance}/5
                        <input
                            type="range"
                            min="1"
                            max="5"
                            value={importance}
                            onChange={(e) => setImportance(parseInt(e.target.value))}
                        />
                    </label>
                    <button type="submit">Add Task</button>
                </form>
            )}
        </div>
    );
}