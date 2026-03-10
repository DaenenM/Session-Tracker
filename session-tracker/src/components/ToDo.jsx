import NewToDo from "./todo-cards/NewToDo";
import ToDoList from "./todo-cards/ToDoList";
import '../css/ToDo.css';

export default function ToDo(){

    return(
        <div>
            <h2>The ToDo list</h2>
            <NewToDo />
            <ToDoList />
        </div>
    )
}