const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const config = require('./config');
const logger = require('./utils/logger');
const { telegramAuth } = require('./middleware/telegramAuth');
const telegramBot = require('./services/telegramBot');
const telegramBindingController = require('./controllers/telegramBindingController');
const telegramBindingModel = require('./models/telegramBinding');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*", // 在开发环境中允许所有源，生产环境应该限制为特定域名
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'] // 支持 WebSocket 和轮询
});

// 存储当前活跃的WebSocket连接
const activeConnections = new Map();

// 全局WebSocket消息发送函数
global.sendMessageToWebSockets = (groupId, message) => {
    logger.info(`尝试通过WebSocket发送消息到群组 ${groupId}`);
    
    // 获取该群组的所有连接
    const connections = Array.from(activeConnections.values())
        .filter(conn => conn.groupId === groupId);
    
    if (connections.length === 0) {
        logger.warn(`群组 ${groupId} 没有活跃的WebSocket连接`);
        return false;
    }
    
    // 向所有连接发送消息
    connections.forEach(conn => {
        try {
            conn.socket.emit('newMessage', message);
            logger.info(`消息已发送到连接 ${conn.socket.id}`);
        } catch (error) {
            logger.error(`向连接 ${conn.socket.id} 发送消息失败:`, error);
        }
    });
    
    return true;
};

// Socket.IO 连接处理
io.on('connection', (socket) => {
    logger.info(`New WebSocket connection: ${socket.id}`);
    
    // 处理客户端加入群组
    socket.on('joinGroup', (groupId) => {
        if (!groupId) {
            logger.warn(`Client ${socket.id} attempted to join without groupId`);
            return;
        }
        
        logger.info(`Client ${socket.id} joining group ${groupId}`);
        
        // 将连接信息存储到Map中
        activeConnections.set(socket.id, {
            socket,
            groupId,
            joinedAt: new Date()
        });
        
        // 加入Socket.IO房间
        socket.join(`group_${groupId}`);
        
        // 发送加入成功消息
        socket.emit('joinedGroup', {
            groupId,
            timestamp: new Date()
        });
    });
    
    // 处理断开连接
    socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
        
        // 从活跃连接中移除
        const connection = activeConnections.get(socket.id);
        if (connection) {
            logger.info(`Removing client ${socket.id} from group ${connection.groupId}`);
            activeConnections.delete(socket.id);
        }
    });
    
    // 处理来自客户端的消息
    socket.on('chatMessage', async (data) => {
        try {
            const { groupId, message } = data;
            if (!groupId || !message) {
                logger.warn(`Invalid message data from client ${socket.id}`);
                return;
            }
            
            logger.info(`Received chat message from client ${socket.id} for group ${groupId}`);
            
            // 获取连接信息
            const connection = activeConnections.get(socket.id);
            if (!connection || connection.groupId !== groupId) {
                logger.warn(`Client ${socket.id} not authorized for group ${groupId}`);
                return;
            }
            
            // 创建消息对象
            const messageObj = {
                id: Date.now().toString(),
                content: message,
                sender: 'User', // 这里应该使用实际的用户信息
                timestamp: new Date(),
                groupId
            };
            
            // 广播消息到同一群组的所有客户端
            io.to(`group_${groupId}`).emit('newMessage', messageObj);
            
            // 尝试发送到Telegram
            const telegramSent = await telegramBot.sendMessageToTelegram(
                groupId,
                'User', // 这里应该使用实际的用户信息
                message
            );
            
            if (telegramSent) {
                logger.info(`Message successfully forwarded to Telegram for group ${groupId}`);
            } else {
                logger.warn(`Failed to forward message to Telegram for group ${groupId}`);
            }
            
        } catch (error) {
            logger.error(`Error handling chat message from client ${socket.id}:`, error);
            socket.emit('error', {
                message: 'Failed to process message',
                error: error.message
            });
        }
    });
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "telegram.org", "*.telegram.org"],
            connectSrc: ["'self'", "telegram.org", "*.telegram.org"],
            frameSrc: ["'self'", "telegram.org", "*.telegram.org"],
            imgSrc: ["'self'", "data:", "telegram.org", "*.telegram.org"],
            styleSrc: ["'self'", "'unsafe-inline'"],
        },
    },
}));
app.use(morgan('combined'));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// API 路由使用 Telegram 认证
app.use('/api', telegramAuth);

// 视图路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/groups', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'groups.html'));
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat_list.html'));
});

app.get('/chat/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat_detail.html'));
});

app.get('/create-chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'create_chat.html'));
});

app.get('/bind-telegram', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'bind_telegram.html'));
});

app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

// API 路由
app.get('/api/user', (req, res) => {
    res.json(req.user);
});

// Bot信息API
app.get('/api/bot-info', (req, res) => {
    res.json({
        success: true,
        data: {
            username: config.telegram.username,
            enabled: config.telegram.enabled
        }
    });
});

// 群组相关API
app.post('/api/groups', (req, res) => {
    // 创建新群组
    res.json({
        success: true,
        message: '群组创建成功',
        data: {
            id: Date.now(),
            name: req.body.name,
            description: req.body.description,
            type: req.body.type,
            tags: req.body.tags,
            createdAt: new Date(),
            memberCount: 1
        }
    });
});

// Telegram绑定相关API
app.post('/api/groups/bind-telegram', telegramBindingController.createBinding);
app.get('/api/groups/:groupId/telegram-binding', telegramBindingController.getBindingByGroupId);
app.delete('/api/groups/:groupId/telegram-binding', telegramBindingController.unbindTelegram);

// 列出所有绑定关系
app.get('/api/telegram-bindings', (req, res) => {
    try {
        const bindings = telegramBindingModel.getAllBindings();
        res.json({
            success: true,
            data: bindings
        });
    } catch (error) {
        logger.error('Error listing telegram bindings:', error);
        res.status(500).json({
            success: false,
            message: '获取绑定列表失败',
            error: 'GET_BINDINGS_ERROR'
        });
    }
});

// 手动创建/强制绑定（仅供测试使用）
app.post('/api/force-binding', (req, res) => {
    try {
        const { groupId, telegramGroupId, telegramGroupName } = req.body;
        
        if (!groupId || !telegramGroupId) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数',
                error: 'MISSING_PARAMS'
            });
        }
        
        const binding = telegramBindingModel.createManualBinding(
            groupId, 
            telegramGroupId, 
            telegramGroupName || `Telegram群组${telegramGroupId}`
        );
        
        logger.info(`手动创建绑定: 平台群组 ${groupId} -> Telegram群组 ${telegramGroupId}`);
        
        // 尝试发送测试消息
        telegramBot.sendMessageToTelegram(
            groupId,
            'System',
            '✅ 手动绑定成功，这是一条测试消息。'
        ).then(sent => {
            logger.info(`测试消息发送${sent ? '成功' : '失败'}`);
        }).catch(err => {
            logger.error('发送测试消息失败:', err);
        });
        
        res.json({
            success: true,
            message: '手动绑定创建成功',
            data: binding
        });
    } catch (error) {
        logger.error('Error creating manual binding:', error);
        res.status(500).json({
            success: false,
            message: '创建手动绑定失败',
            error: 'CREATE_MANUAL_BINDING_ERROR'
        });
    }
});

// 消息发送API
app.post('/api/groups/:groupId/messages', async (req, res) => {
    try {
        const { groupId } = req.params;
        const { message } = req.body;
        
        logger.info(`接收到从平台发送的消息: 群组=${groupId}, 消息="${message}"`);
        
        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: '消息内容不能为空',
                error: 'EMPTY_MESSAGE'
            });
        }
        
        // 检查群组是否存在（实际应用中需要从数据库查询）
        // 这里简化处理，假设群组ID有效
        
        // 检查是否绑定了Telegram群组
        const binding = telegramBindingModel.findByGroupId(groupId);
        logger.info(`为群组 ${groupId} 查找绑定: ${binding ? '找到' : '未找到'}`);
        
        // 存储消息到数据库（这里省略，实际应用中需要实现）
        
        // 尝试发送消息到Telegram
        let telegramSent = false;
        if (binding) {
            telegramSent = await telegramBot.sendMessageToTelegram(
                groupId,
                req.user.username,
                message
            );
            logger.info(`向Telegram发送消息: ${telegramSent ? '成功' : '失败'}`);
        } else {
            logger.warn(`没有为群组 ${groupId} 找到Telegram绑定，消息不会同步到Telegram`);
        }
        
        res.json({
            success: true,
            message: '消息发送成功',
            data: {
                id: Date.now().toString(),
                content: message,
                sender: req.user.username,
                senderId: req.user.id,
                groupId: groupId,
                createdAt: new Date(),
                telegramSent
            }
        });
    } catch (error) {
        logger.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            message: '发送消息失败',
            error: 'SEND_MESSAGE_ERROR'
        });
    }
});

// 验证码验证API
app.post('/api/groups/verify-code', (req, res) => {
    const { code, groupId } = req.body;
    
    if (!code) {
        return res.status(400).json({
            success: false,
            message: '请提供验证码',
            error: 'CODE_REQUIRED'
        });
    }

    logger.info(`收到验证码验证请求: code=${code}, groupId=${groupId}`);
    
    // 使用Telegram Bot服务验证验证码
    const result = telegramBot.verifyCode(code);
    
    if (result.success) {
        logger.info(`验证码 ${code} 验证成功，Telegram群组ID: ${result.data.groupId}`);
        
        // 在实际应用中，这里应该将群组与Telegram群组绑定到数据库
        const newBinding = {
            groupId: groupId || code, // 如果未提供groupId，使用验证码作为groupId
            telegramGroupId: result.data.groupId,
            telegramGroupName: result.data.groupName,
            createdBy: req.user.id
        };
        
        // 创建绑定
        const binding = telegramBindingModel.createBinding(newBinding);
        logger.info(`创建绑定成功: 平台群组 ${binding.groupId} -> Telegram群组 ${binding.telegramGroupId}`);
        
        // 尝试发送绑定成功通知到Telegram群组
        telegramBot.sendMessageToTelegram(
            binding.groupId,
            'System',
            '✅ 绑定验证成功，平台消息将与此Telegram群组同步。'
        ).then(sent => {
            logger.info(`绑定成功通知发送${sent ? '成功' : '失败'}`);
        }).catch(err => {
            logger.error('发送绑定成功通知失败:', err);
        });
        
        res.json({
            success: true,
            message: '验证成功，群组已绑定',
            data: {
                ...result.data,
                binding
            }
        });
    } else {
        logger.warn(`验证码 ${code} 验证失败: ${result.message}`);
        
        // 尝试使用代码作为verificationCode的方式（测试用）
        if (process.env.NODE_ENV === 'development') {
            logger.info('开发模式：尝试直接使用验证码作为绑定凭证');
            
            // 查找是否有绑定了相同telegramGroupId的记录
            const existingBinding = telegramBindingModel.findByTelegramGroupId(code);
            
            if (existingBinding) {
                logger.info(`找到已存在的绑定记录，使用验证码作为Telegram群组ID: ${code}`);
                
                // 创建新绑定，使用groupId和验证码作为Telegram群组ID
                const newBinding = telegramBindingModel.createManualBinding(
                    groupId || 'default-group-id',
                    code,
                    '手动绑定群组'
                );
                
                return res.json({
                    success: true,
                    message: '开发模式：使用验证码作为Telegram群组ID进行绑定',
                    data: {
                        groupId: code,
                        groupName: '手动绑定群组',
                        verifiedAt: new Date(),
                        binding: newBinding
                    }
                });
            }
        }
        
        // 正常返回验证失败
        res.status(400).json({
            success: false,
            message: result.message,
            error: 'INVALID_CODE'
        });
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    logger.error('Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

// 404 处理
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 初始化Telegram Bot
if (config.telegram.enabled) {
    logger.info(`Attempting to initialize Telegram bot with token: ${config.telegram.token ? config.telegram.token.substring(0, 5) + '...' : 'undefined'}`);
    
    try {
        const botInitialized = telegramBot.initBot();
        if (botInitialized) {
            logger.info(`Telegram bot @${config.telegram.username} is running`);
            
            // 获取所有绑定并记录日志
            const bindings = telegramBindingModel.getAllBindings();
            logger.info(`Found ${bindings.length} Telegram bindings:`);
            bindings.forEach((binding, index) => {
                logger.info(`  ${index + 1}. Platform Group ${binding.groupId} -> Telegram Group ${binding.telegramGroupId} (${binding.telegramGroupName})`);
            });
        } else {
            logger.error('Telegram bot initialization failed - bot will be disabled');
        }
    } catch (error) {
        logger.error('Exception during Telegram bot initialization:', error);
    }
} else {
    logger.warn('Telegram bot is disabled in configuration');
}

// 启动服务器
const PORT = config.port;
server.listen(PORT, async () => {
    logger.info(`Server is running on port ${PORT}`);
    logger.info(`Environment: ${config.nodeEnv}`);
    
    // 向所有绑定的Telegram群组发送连接通知
    if (config.telegram.enabled) {
        // 获取所有绑定
        const bindings = telegramBindingModel.getAllBindings();
        
        if (bindings.length > 0) {
            logger.info(`Sending connection notification to ${bindings.length} bound Telegram groups`);
            
            for (const binding of bindings) {
                try {
                    await telegramBot.sendMessageToTelegram(
                        binding.groupId,
                        'System',
                        '✅ 平台已连接到Telegram群组，消息将实时同步。'
                    );
                    logger.info(`Sent connection notification to Telegram group ${binding.telegramGroupId}`);
                } catch (error) {
                    logger.error(`Failed to send connection notification to Telegram group ${binding.telegramGroupId}:`, error);
                }
            }
        }
    }
}); 