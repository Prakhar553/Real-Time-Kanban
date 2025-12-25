import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const socket = io('http://localhost:5000');

function App() {
  const [columns, setColumns] = useState({
    todo: { name: "To Do", items: [] },
    inProgress: { name: "In Progress", items: [] },
    done: { name: "Done", items: [] }
  });
  const [taskInput, setTaskInput] = useState("");

  useEffect(() => {
    axios.get('http://localhost:5000/tasks').then(res => {
      const tasks = res.data;
      setColumns({
        todo: { name: "To Do", items: tasks.filter(t => t.status === 'todo') },
        inProgress: { name: "In Progress", items: tasks.filter(t => t.status === 'in-progress') },
        done: { name: "Done", items: tasks.filter(t => t.status === 'done') }
      });
    });

    socket.on('receive_update', (updatedColumns) => {
      setColumns(updatedColumns);
    });

    return () => socket.off('receive_update');
  }, []);

  const addTask = async () => {
    if (!taskInput) return;
    const res = await axios.post('http://localhost:5000/tasks', { title: taskInput, status: 'todo' });
    const newColumns = { ...columns, todo: { ...columns.todo, items: [...columns.todo.items, res.data] } };
    setColumns(newColumns);
    setTaskInput("");
    socket.emit('task_moved', newColumns);
  };

  // New Delete Task Function
  const deleteTask = async (columnId, taskId) => {
    await axios.delete(`http://localhost:5000/tasks/${taskId}`);
    const updatedItems = columns[columnId].items.filter(item => item._id !== taskId);
    const newColumns = { ...columns, [columnId]: { ...columns[columnId], items: updatedItems } };
    setColumns(newColumns);
    socket.emit('task_moved', newColumns);
  };

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    if (source.droppableId !== destination.droppableId) {
      const sourceCol = columns[source.droppableId];
      const destCol = columns[destination.droppableId];
      const sourceItems = [...sourceCol.items];
      const destItems = [...destCol.items];
      const [removed] = sourceItems.splice(source.index, 1);
      destItems.splice(destination.index, 0, removed);

      const newColumns = {
        ...columns,
        [source.droppableId]: { ...sourceCol, items: sourceItems },
        [destination.droppableId]: { ...destCol, items: destItems }
      };

      setColumns(newColumns);
      
      // Update the status in the Database
      await axios.put(`http://localhost:5000/tasks/${draggableId}`, { status: destination.droppableId });
      socket.emit('task_moved', newColumns);
    } else {
      const column = columns[source.droppableId];
      const copiedItems = [...column.items];
      const [removed] = copiedItems.splice(source.index, 1);
      copiedItems.splice(destination.index, 0, removed);

      const newColumns = { ...columns, [source.droppableId]: { ...column, items: copiedItems } };
      setColumns(newColumns);
      socket.emit('task_moved', newColumns);
    }
  };

  return (
    <div style={{ backgroundColor: '#1a1a2e', color: 'white', minHeight: '100vh', padding: '40px' }}>
      <h1>Real-Time Kanban Board</h1>
      
      <div style={{ marginBottom: '30px' }}>
        <input 
          value={taskInput} 
          onChange={(e) => setTaskInput(e.target.value)}
          placeholder="New Task Name..."
          style={{ padding: '10px', borderRadius: '5px', border: 'none', width: '250px' }}
        />
        <button onClick={addTask} style={{ padding: '10px 20px', marginLeft: '10px', backgroundColor: '#e94560', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Add Task
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
        <DragDropContext onDragEnd={onDragEnd}>
          {Object.entries(columns).map(([id, column]) => (
            <div key={id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3>{column.name}</h3>
              <Droppable droppableId={id}>
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} style={{ background: '#16213e', padding: '15px', borderRadius: '8px', width: '280px', minHeight: '400px' }}>
                    {column.items.map((task, index) => (
                      <Draggable key={task._id} draggableId={task._id} index={index}>
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} 
                               style={{ ...provided.draggableProps.style, padding: '15px', margin: '0 0 10px 0', background: '#0f3460', borderRadius: '5px', color: '#e94560', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {task.title}
                            <button onClick={() => deleteTask(id, task._id)} style={{ background: 'transparent', border: '1px solid #e94560', color: '#e94560', borderRadius: '3px', cursor: 'pointer', fontSize: '10px' }}>
                              Delete
                            </button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </DragDropContext>
      </div>
    </div>
  );
}

export default App;