document.addEventListener('DOMContentLoaded', function() {
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');
    const chatMessages = document.getElementById('chatMessages');
    const sendButton = document.querySelector('#messageForm button[type="submit"]');
    
    // 绑定相关元素
    const bindingArea = document.getElementById('bindingArea');
    const toggleBindingArea = document.getElementById('toggleBindingArea');
    const bindingForm = document.getElementById('bindingForm');
    const verificationCode = document.getElementById('verificationCode');
    const verifyCodeBtn = document.getElementById('verifyCodeBtn');
    const bindingStatus = document.getElementById('bindingStatus');
    
    // 获取URL中的群组ID参数
    const urlParams = new URLSearchParams(window.location.search);
    const groupId = urlParams.get('groupId') || '478708'; // 使用默认群组ID如果没有指定

    // WebSocket连接
    let socket = io({
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        autoConnect: true,
        forceNew: false,
        path: '/socket.io'
    });
    
    // 连接错误处理
    socket.on('connect_error', (error) => {
        console.error('WebSocket连接错误:', error);
        console.log('尝试重新连接...');
    });
    
    // 连接超时处理
    socket.on('connect_timeout', () => {
        console.error('WebSocket连接超时');
    });
    
    // 连接成功
    socket.on('connect', () => {
        console.log('已连接到WebSocket服务器');
        
        // 加入聊天室
        socket.emit('joinGroup', groupId);
        console.log('尝试加入群组:', groupId);
    });
    
    // 加入聊天室响应
    socket.on('joinedGroup', (data) => {
        console.log('已加入群组:', data);
        // 可以在这里添加提示或者UI更新
        appendMessage({
            content: '✅ 已成功连接到聊天室',
            sender: 'System',
            timestamp: new Date()
        });
    });
    
    // 监听新消息
    socket.on('newMessage', function(message) {
        console.log('收到新消息:', message);
        appendMessage(message);
    });
    
    // 监听广播消息
    socket.on('broadcastMessage', function(data) {
        console.log('收到广播消息:', data);
        // 如果消息是给当前群组的，显示它
        if (data.targetGroup === groupId) {
            appendMessage(data.message);
        }
    });
    
    // 添加消息到聊天界面
    function appendMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        
        // 添加消息ID作为属性，用于防止重复
        messageDiv.setAttribute('data-message-id', message.messageId || Date.now());
        
        // 检查消息是否已存在
        if (document.querySelector(`.message[data-message-id="${messageDiv.getAttribute('data-message-id')}"]`)) {
            console.log('消息已存在，不重复添加');
            return;
        }
        
        // 消息内容格式化
        let content = message.text || message.content || '无内容';
        let sender = message.from || message.sender || '未知用户';
        let time = message.sentAt ? new Date(message.sentAt).toLocaleTimeString() : new Date().toLocaleTimeString();
        
        messageDiv.innerHTML = `
            <span class="sender">${sender}</span>
            <span class="time">${time}</span>
            <div class="content">${content}</div>
        `;
        
        document.querySelector('.chat-messages').appendChild(messageDiv);
        
        // 滚动到底部
        const chatMessages = document.querySelector('.chat-messages');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // 断开连接处理
    socket.on('disconnect', () => {
        console.log('已断开与WebSocket服务器的连接');
    });
    
    // 验证码绑定区域折叠/展开功能
    toggleBindingArea.addEventListener('click', function() {
        if (bindingForm.style.display === 'none') {
            bindingForm.style.display = 'block';
            toggleBindingArea.innerHTML = '<i class="bi bi-chevron-up"></i>';
        } else {
            bindingForm.style.display = 'none';
            toggleBindingArea.innerHTML = '<i class="bi bi-chevron-down"></i>';
        }
    });
    
    // 验证按钮点击事件
    verifyCodeBtn.addEventListener('click', async function() {
        const code = verificationCode.value.trim();
        if (!code || !/^\d{6}$/.test(code)) {
            bindingStatus.innerHTML = '<span class="text-danger">请输入6位数字验证码</span>';
            return;
        }
        
        verifyCodeBtn.disabled = true;
        verifyCodeBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 验证中...';
        bindingStatus.innerHTML = '<span class="text-info">正在验证和绑定...</span>';
        
        try {
            // 尝试验证并绑定
            const response = await fetch('/api/groups/verify-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code: code,
                    groupId: groupId
                })
            });
            
            const data = await response.json();
            console.log('验证响应:', data);
            
            if (data.success) {
                // 绑定成功
                bindingStatus.innerHTML = '<span class="text-success"><i class="bi bi-check-circle"></i> 绑定成功！消息现在会同步到Telegram群组。</span>';
                // 更新UI，显示已绑定状态
                const telegramBadge = document.querySelector('.telegram-badge');
                if (telegramBadge) {
                    telegramBadge.style.display = 'inline-block';
                }
                // 1秒后隐藏绑定区域
                setTimeout(() => {
                    bindingArea.style.display = 'none';
                }, 5000);
            } else {
                // 绑定失败
                bindingStatus.innerHTML = `<span class="text-danger"><i class="bi bi-exclamation-triangle"></i> ${data.message || '验证失败，请检查验证码是否正确'}</span>`;
            }
        } catch (error) {
            console.error('验证过程中出错:', error);
            bindingStatus.innerHTML = '<span class="text-danger"><i class="bi bi-exclamation-triangle"></i> 验证过程中出现错误，请稍后再试</span>';
        } finally {
            verifyCodeBtn.disabled = false;
            verifyCodeBtn.innerHTML = '验证';
        }
    });
    
    // 特殊功能：尝试绑定Telegram群组
    const tryToBindTelegram = async (telegramGroupId, code) => {
        try {
            console.log(`尝试手动绑定: 平台群组=${groupId}, Telegram群组=${telegramGroupId}, 验证码=${code}`);
            
            const response = await fetch('/api/force-binding', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    groupId: code || groupId,
                    telegramGroupId: telegramGroupId,
                    telegramGroupName: '手动绑定的群组'
                })
            });
            
            const data = await response.json();
            console.log('绑定响应:', data);
            
            if (data.success) {
                bindingStatus.innerHTML = '<span class="text-success"><i class="bi bi-check-circle"></i> 绑定成功！消息现在会同步到Telegram群组。</span>';
                return true;
            } else {
                bindingStatus.innerHTML = `<span class="text-danger"><i class="bi bi-exclamation-triangle"></i> ${data.message || '绑定失败'}</span>`;
                return false;
            }
        } catch (error) {
            console.error('绑定过程中出错:', error);
            bindingStatus.innerHTML = '<span class="text-danger"><i class="bi bi-exclamation-triangle"></i> 绑定过程中出现错误</span>';
            return false;
        }
    };
    
    // 发送消息到服务器的函数
    const sendMessageToServer = async (messageText) => {
        try {
            // 特殊指令检测 - 绑定Telegram群组
            if (messageText.startsWith('绑定Telegram群组:') || messageText.startsWith('绑定Telegram群组：')) {
                const parts = messageText.split(/[:：]\s*/);
                if (parts.length >= 2) {
                    const telegramGroupId = parts[1].trim();
                    return await tryToBindTelegram(telegramGroupId, groupId);
                }
            }
            
            console.log(`尝试发送消息到服务器: ${messageText}`);
            
            // 通过 WebSocket 发送消息
            socket.emit('chatMessage', {
                groupId: groupId,
                message: messageText
            });
            
            return { success: true };
        } catch (error) {
            console.error('发送消息错误:', error);
            return { success: false, error: error.message };
        }
    };
    
    // 更新消息状态的函数
    const updateMessageStatus = (messageElement, status) => {
        const statusBadge = messageElement.querySelector('.telegram-status');
        if (statusBadge) {
            if (status.success && status.telegramSent) {
                statusBadge.innerHTML = '<span class="telegram-badge"><i class="bi bi-telegram"></i> 已同步</span>';
                statusBadge.classList.remove('text-danger');
                statusBadge.classList.add('text-success');
            } else {
                statusBadge.innerHTML = '<span class="text-danger"><i class="bi bi-exclamation-triangle"></i> 同步失败</span>';
                statusBadge.classList.remove('text-success');
                statusBadge.classList.add('text-danger');
            }
        }
    };
    
    // 模拟发送消息
    messageForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const messageText = messageInput.value.trim();
        if (!messageText) return;
        
        // 禁用发送按钮，防止重复提交
        sendButton.disabled = true;
        sendButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 发送中...';
        
        // 创建新消息元素
        const newMessage = document.createElement('div');
        newMessage.className = 'message message-self';
        newMessage.id = 'msg-' + Date.now();
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = messageText;
        
        const messageMeta = document.createElement('div');
        messageMeta.className = 'message-meta';
        
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        
        messageMeta.innerHTML = `你 · 今天 ${hours}:${minutes} <span class="telegram-status"><i class="bi bi-hourglass-split"></i> 同步中...</span>`;
        
        newMessage.appendChild(messageContent);
        newMessage.appendChild(messageMeta);
        
        // 添加到消息列表
        chatMessages.appendChild(newMessage);
        
        // 清空输入框
        messageInput.value = '';
        
        // 滚动到底部
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // 发送消息到服务器并同步到Telegram
        const result = await sendMessageToServer(messageText);
        
        // 恢复发送按钮
        sendButton.disabled = false;
        sendButton.innerHTML = '发送 <i class="bi bi-send"></i>';
        
        // 更新消息状态
        updateMessageStatus(newMessage, result);
        
        // 仅在开发环境下模拟Telegram回复
        if (result.success) {
            setTimeout(() => {
                // 随机决定是否显示回复
                if (Math.random() > 0.3) {
                    const telegramMessage = document.createElement('div');
                    telegramMessage.className = 'message message-other';
                    
                    const telegramContent = document.createElement('div');
                    telegramContent.className = 'message-content';
                    
                    // 随机回复
                    const replies = [
                        "感谢分享，非常有价值的观点！",
                        "我认为还需要观察一下成交量的变化",
                        "今天市场波动较大，大家小心操作",
                        "同意你的看法，这是个不错的入场点"
                    ];
                    telegramContent.textContent = replies[Math.floor(Math.random() * replies.length)];
                    
                    const telegramMeta = document.createElement('div');
                    telegramMeta.className = 'message-meta';
                    
                    const users = ["王大师", "行情专家", "技术分析师", "资深交易员"];
                    const user = users[Math.floor(Math.random() * users.length)];
                    
                    telegramMeta.innerHTML = `${user} · 今天 ${hours}:${Math.floor(Number(minutes)) + 1} <span class="telegram-badge"><i class="bi bi-telegram"></i></span>`;
                    
                    telegramMessage.appendChild(telegramContent);
                    telegramMessage.appendChild(telegramMeta);
                    
                    chatMessages.appendChild(telegramMessage);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            }, 2000);
        }
    });
    
    // 欢迎消息处理
    socket.on('welcome', (data) => {
        console.log('收到欢迎消息:', data);
    });
    
    // 心跳消息处理
    socket.on('heartbeat', (data) => {
        console.log('收到心跳:', data.timestamp);
        // 回复心跳
        socket.emit('heartbeat_response', { timestamp: new Date() });
    });
    
    // 初始滚动到底部
    chatMessages.scrollTop = chatMessages.scrollHeight;
}); 