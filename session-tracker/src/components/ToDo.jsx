import NewToDo from "./todo-cards/NewToDo";
import ToDoList from "./todo-cards/ToDoList";
import '../css/ToDo.css';

export default function ToDo() {
    return (
        <div className="todo-container">
            <div className="todo-content">
                <div className="todo-header">
                    <h2>To Do List</h2>
                    <p className="todo-header-sub">Stay on top of your tasks and deadlines.</p>
                </div>
                <NewToDo />
                <ToDoList />
            </div>
        </div>
    );
}