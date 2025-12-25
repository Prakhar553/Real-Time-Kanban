const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors()); 
app.use(express.json()); 

const server = http.createServer(app);

// 1. Database Connection
const mongoURI = "mongodb+srv://prakharagarwal615:Gaming%4020cr@cluster0.gpboct4.mongodb.net/taskDB?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch(err => console.log("❌ DB Connection Error: ", err));

// 2. Task Schema & Model
const TaskSchema = new mongoose.Schema({
    title: String,
    status: { type: String, default: 'todo' }, // todo, in-progress, done
});
const Task = mongoose.model('Task', TaskSchema);

// 3. API Routes
app.get('/tasks', async (req, res) => {
    const tasks = await Task.find();
    res.json(tasks);
});

app.post('/tasks', async (req, res) => {
    const newTask = new Task(req.body);
    await newTask.save();
    res.json(newTask);
});

// Update task status in database when moved
app.put('/tasks/:id', async (req, res) => {
    const { status } = req.body;
    const updatedTask = await Task.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(updatedTask);
});

// Delete a task
app.delete('/tasks/:id', async (req, res) => {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: "Task deleted" });
});

// 4. Socket.io Logic
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000", 
        methods: ["GET", "POST", "PUT", "DELETE"] // Added PUT and DELETE
    }
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('task_moved', (data) => {
        socket.broadcast.emit('receive_update', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = 5000;
server.listen(PORT, () => {
    console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
});