const TelegramBot = require('node-telegram-bot-api');
const logger = require('../utils/logger');
const config = require('../config');
const telegramBindingModel = require('../models/telegramBinding');

// 存储验证码的临时数据库（生产环境应使用Redis或MongoDB）
const verificationCodes = new Map();

// 随机验证码生成
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// 创建 Telegram Bot 实例
const botToken = config.telegram.token;
let bot = null;

// 初始化bot
const initBot = () => {
    try {
        if (!botToken) {
            throw new Error('Telegram Bot Token not found');
        }

        // 创建bot实例，设置轮询模式
        bot = new TelegramBot(botToken, { polling: true });
        logger.info('Telegram bot initialized');

        // 处理 /start 命令
        bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            const chatType = msg.chat.type;
            const chatTitle = msg.chat.title;
            
            logger.info(`收到 /start 命令：
群组ID: ${chatId}
类型: ${chatType}
名称: ${chatTitle}
            `);
            
            bot.sendMessage(chatId, `欢迎使用 ${config.telegram.username} 机器人！

您可以使用以下命令：
/bind - 生成绑定验证码
/help - 查看帮助信息

当前群组信息：
- 群组ID: ${chatId}
- 类型: ${chatType}
- 名称: ${chatTitle}`);
        });

        // 处理 /help 命令
        bot.onText(/\/help/, (msg) => {
            const chatId = msg.chat.id;
            bot.sendMessage(chatId, `${config.telegram.username} 机器人使用帮助：

1. 将机器人添加到您的群组中
2. 将机器人设为管理员
3. 在群组中发送 /bind 命令获取验证码
4. 在网页端输入验证码完成绑定

当前群组ID: ${chatId}`);
        });

        // 处理 /bind 命令
        bot.onText(/\/bind/, (msg) => {
            const chatId = msg.chat.id;
            
            // 检查是否为群组
            if (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') {
                bot.sendMessage(chatId, '请在群组中使用此命令');
                return;
            }

            const groupName = msg.chat.title;
            const userId = msg.from.id;
            const userName = msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : '');
            
            // 检查用户是否是管理员
            bot.getChatMember(chatId, userId).then(chatMember => {
                if (['creator', 'administrator'].includes(chatMember.status)) {
                    // 生成验证码
                    const code = generateVerificationCode();
                    
                    // 存储验证码信息
                    verificationCodes.set(code, {
                        groupId: chatId.toString(),
                        groupName: groupName,
                        userId: userId,
                        userName: userName,
                        createdAt: new Date()
                    });
                    
                    // 设置验证码过期时间（10分钟）
                    setTimeout(() => {
                        if (verificationCodes.has(code)) {
                            verificationCodes.delete(code);
                        }
                    }, 10 * 60 * 1000);
                    
                    // 发送验证码
                    bot.sendMessage(
                        chatId, 
                        `绑定验证码：<code>${code}</code>\n\n此验证码10分钟内有效，请在平台上输入此验证码完成绑定。`, 
                        { parse_mode: 'HTML' }
                    );
                    
                    logger.info(`Generated verification code ${code} for group ${groupName} (${chatId})`);
                } else {
                    bot.sendMessage(chatId, '只有群组管理员可以使用此命令');
                }
            }).catch(error => {
                logger.error('Error checking chat member:', error);
                bot.sendMessage(chatId, '验证管理员权限时出错，请确保机器人是群组管理员');
            });
        });

        // 监听群组消息
        bot.on('message', (msg) => {
            try {
                logger.info(`Received message from Telegram: ${JSON.stringify(msg, null, 2)}`);
                
                const telegramGroupId = msg.chat.id.toString();
                const senderName = msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : '');
                const messageText = msg.text || '';
                
                logger.info(`收到消息: "${messageText}" 来自 ${senderName} 在群组 ${telegramGroupId}`);
                
                // 忽略命令消息
                if (msg.text && msg.text.startsWith('/')) {
                    logger.info('Ignoring command message');
                    return;
                }
                
                // 忽略非群组消息
                if (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') {
                    logger.info(`Ignoring non-group message (type: ${msg.chat.type})`);
                    return;
                }
                
                // 检查该Telegram群组是否已绑定平台群组
                const binding = telegramBindingModel.findByTelegramGroupId(telegramGroupId);
                
                if (binding) {
                    logger.info(`Found binding for Telegram group ${telegramGroupId} -> Platform group ${binding.groupId}`);
                    
                    // 创建消息对象
                    const messageObj = {
                        id: Date.now().toString(),
                        sender: senderName,
                        senderType: 'telegram',
                        content: messageText,
                        timestamp: new Date(),
                        telegramInfo: {
                            userId: msg.from.id,
                            messageId: msg.message_id,
                            groupId: telegramGroupId
                        }
                    };
                    
                    // 通过WebSocket发送消息到客户端
                    if (global.sendMessageToWebSockets) {
                        logger.info(`将Telegram消息通过WebSocket发送到平台群组 ${binding.groupId}`);
                        global.sendMessageToWebSockets(binding.groupId, messageObj);
                    } else {
                        logger.error('WebSocket发送方法未定义，无法将消息发送到客户端');
                    }
                } else {
                    logger.warn(`No binding found for Telegram group ${telegramGroupId}, message will not be forwarded to platform`);
                }
            } catch (error) {
                logger.error(`处理Telegram消息时出错: ${error.message}`, error);
            }
        });

        // 监听错误
        bot.on('error', (error) => {
            logger.error('Telegram bot error:', error);
        });

        // 监听轮询错误
        bot.on('polling_error', (error) => {
            logger.error('Telegram bot polling error:', error);
        });

        return true;
    } catch (error) {
        logger.error('Failed to initialize Telegram bot:', error);
        return false;
    }
};

// 验证验证码
const verifyCode = (code) => {
    if (!verificationCodes.has(code)) {
        return { success: false, message: '验证码无效或已过期' };
    }
    
    const data = verificationCodes.get(code);
    verificationCodes.delete(code); // 验证后立即删除验证码，防止重复使用
    
    return {
        success: true,
        message: '验证成功',
        data: {
            groupId: data.groupId,
            groupName: data.groupName,
            verifiedAt: new Date()
        }
    };
};

// 发送消息到Telegram群组
const sendMessageToTelegram = async (groupId, username, messageText) => {
    try {
        // 检查该平台群组是否已绑定Telegram群组
        const binding = telegramBindingModel.findByGroupId(groupId);
        
        logger.info(`Attempting to send message to Telegram for group ${groupId}. Binding exists: ${!!binding}`);
        
        if (!binding) {
            logger.warn(`Failed to send message to Telegram: Platform group ${groupId} not bound to any Telegram group`);
            return false;
        }
        
        logger.info(`Binding found for group ${groupId} -> Telegram group ${binding.telegramGroupId} (${binding.telegramGroupName})`);
        
        // 构建消息
        const formattedMessage = `<b>${username}</b>:\n${messageText}`;
        
        // 发送消息到Telegram群组
        if (!bot) {
            logger.error('Telegram bot not initialized');
            return false;
        }
        
        logger.info(`Sending message to Telegram group ${binding.telegramGroupId}: "${messageText.substring(0, 30)}${messageText.length > 30 ? '...' : ''}"`);
        
        // 尝试发送消息
        try {
            await bot.sendMessage(
                binding.telegramGroupId, 
                formattedMessage, 
                { parse_mode: 'HTML' }
            );
            logger.info(`Successfully sent message to Telegram group ${binding.telegramGroupId}`);
            return true;
        } catch (sendError) {
            logger.error(`Error sending message to Telegram group ${binding.telegramGroupId}:`, sendError);
            
            // 错误处理: 如果是因为 HTML 解析失败，尝试纯文本
            if (sendError.message.includes('parse')) {
                try {
                    await bot.sendMessage(
                        binding.telegramGroupId, 
                        `${username}: ${messageText}`
                    );
                    logger.info(`Successfully sent plain text message to Telegram group ${binding.telegramGroupId}`);
                    return true;
                } catch (plainTextError) {
                    logger.error(`Failed to send even plain text message to Telegram group ${binding.telegramGroupId}:`, plainTextError);
                }
            }
            return false;
        }
    } catch (error) {
        logger.error('Error in sendMessageToTelegram function:', error);
        return false;
    }
};

module.exports = {
    initBot,
    verifyCode,
    sendMessageToTelegram
};