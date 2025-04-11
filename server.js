require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');

// 创建Express应用
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// 中间件配置
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 连接MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// 创建Telegram Bot实例
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// 处理来自Telegram的消息
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    // 这里可以添加消息处理逻辑
    console.log(`Received message from ${chatId}: ${text}`);
    
    // 通过Socket.IO广播消息到连接的客户端
    io.emit('newMessage', {
        chatId,
        text,
        timestamp: new Date(),
        source: 'telegram'
    });
});

// Socket.IO连接处理
io.on('connection', (socket) => {
    console.log('New client connected');
    
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
    
    // 处理来自APP的消息
    socket.on('appMessage', async (data) => {
        try {
            // 发送消息到Telegram群组
            await bot.sendMessage(data.chatId, data.text);
            
            // 广播消息给所有连接的客户端
            io.emit('newMessage', {
                chatId: data.chatId,
                text: data.text,
                timestamp: new Date(),
                source: 'app'
            });
        } catch (error) {
            console.error('Error sending message to Telegram:', error);
        }
    });
});

// 基础路由
app.get('/', (req, res) => {
    res.json({ message: 'Telegram Exchange Chat API is running' });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 