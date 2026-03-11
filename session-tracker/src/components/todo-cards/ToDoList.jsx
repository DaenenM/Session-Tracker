import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import TodoItem from './TodoItem';

export default function ToDoList() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [showCompleted, setShowCompleted] = useState(false);

    useEffect(() => {
        if (!user) return;

        const todosRef = collection(db, 'users', user.uid, 'todos');
        const todosQuery = query(todosRef, orderBy('dueDate', 'asc'));

        const unsubscribe = onSnapshot(todosQuery, (snapshot) => {
            const items = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setTasks(items);
        });

        return () => unsubscribe();
    }, [user]);

    const activeTasks = tasks.filter((t) => !t.complete);
    const completedTasks = tasks.filter((t) => t.complete);

    return (
        <div>
            {activeTasks.length === 0 ? (
                <div className="todo-empty">No active tasks. Add one above!</div>
            ) : (
                <div className="todo-list-container">
                    <div className="todo-list-header">
                        <span className="todo-list-label">Active Tasks</span>
                        <span className="todo-list-count">{activeTasks.length}</span>
                    </div>
                    <div className="todo-list">
                        {activeTasks.map((task, index) => (
                            <div key={task.id}>
                                <TodoItem task={task} />
                                {index < activeTasks.length - 1 && <div className="todo-divider" />}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {completedTasks.length > 0 && (
                <div className="todo-completed-section">
                    <button
                        className="todo-completed-toggle"
                        onClick={() => setShowCompleted(!showCompleted)}
                    >
                        <span>Completed ({completedTasks.length})</span>
                        <svg
                            className={`todo-completed-arrow ${showCompleted ? 'todo-completed-arrow-open' : ''}`}
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                        >
                            <path
                                d="M4 6L8 10L12 6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>

                    {showCompleted && (
                        <div className="todo-completed-list">
                            {completedTasks.map((task, index) => (
                                <div key={task.id}>
                                    <TodoItem task={task} />
                                    {index < completedTasks.length - 1 && <div className="todo-divider" />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}