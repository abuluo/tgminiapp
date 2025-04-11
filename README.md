# Telegram Exchange Chat

A real-time chat application that integrates Telegram groups with a web interface. This application allows users to communicate seamlessly between Telegram groups and a web-based chat interface.

## Features

- Real-time messaging between Telegram groups and web interface
- User authentication and authorization
- Message history and persistence
- Modern and responsive web interface
- Secure communication using WebSocket
- MongoDB database for data storage

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Telegram Bot Token

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/telegram-exchange-chat.git
cd telegram-exchange-chat
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add the following environment variables:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/telegram-chat
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
JWT_SECRET=your_jwt_secret
```

4. Start the development server:
```bash
npm run dev
```

## Usage

1. Start the application using `npm start` or `npm run dev` for development
2. Access the web interface at `http://localhost:3000`
3. Connect your Telegram bot to the desired groups
4. Begin chatting!

## Project Structure

```
telegram-exchange-chat/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── utils/          # Utility functions
│   └── index.js        # Application entry point
├── .env                # Environment variables
├── .gitignore         # Git ignore file
├── package.json       # Project dependencies
└── README.md          # Project documentation
```

## API Documentation

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify JWT token

### Messages

- `GET /api/messages` - Get message history
- `POST /api/messages` - Send a new message
- `DELETE /api/messages/:id` - Delete a message

### Telegram Integration

- `POST /api/telegram/webhook` - Telegram webhook endpoint
- `GET /api/telegram/groups` - Get connected Telegram groups

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

# Telegram Mini App 示例

这是一个简单的 Telegram Mini App 示例，展示了如何创建一个基于网页的 Telegram 小程序。

## 部署指南

### 使用 GitHub Pages 部署

1. Fork 或克隆此仓库到你的 GitHub 账号
2. 在仓库设置中启用 GitHub Pages：
   - 进入仓库 Settings > Pages
   - Source 选择 "Deploy from a branch"
   - Branch 选择 "main" 或 "master"，文件夹选择 "/" (root)
   - 点击 Save
3. 等待几分钟，GitHub Pages 会自动部署你的网站
4. 部署完成后，你的网站将可以通过 `https://{你的用户名}.github.io/{仓库名}/` 访问

### 在 Telegram 中注册你的 Mini App

1. 在 Telegram 中找到 @BotFather，开始聊天
2. 发送 `/newbot` 命令创建一个新机器人，按照指示完成创建
3. 创建好机器人后，发送 `/newapp` 命令创建一个新的 Mini App
4. 选择你刚刚创建的机器人
5. 按照指示填写 Mini App 的标题、描述、上传封面图等
6. 当被要求提供 Web App URL 时，输入你的 GitHub Pages URL:
   ```
   https://{你的用户名}.github.io/{仓库名}/src/public/simple-test.html
   ```
7. 填写一个短名称，这将用于 Mini App 的直接链接

### 测试你的 Mini App

Mini App 创建完成后，你可以通过以下方式访问它：

1. 直接链接：`https://t.me/{你的机器人用户名}/{Mini App短名称}`
2. 通过机器人的菜单按钮（在聊天界面底部）

## 文件说明

- `src/public/simple-test.html` - 极简版测试页面，用于调试
- `src/public/test-mini-app.html` - 功能较为完整的测试页面
- `src/public/mini-app.html` - 主要的 Mini App 页面，带有完整的调试功能

## 调试技巧

如果遇到连接问题，可以尝试：

1. 确保 HTML 文件中只使用 HTTPS 资源
2. 减少外部依赖，尽量使用内联 CSS 和 JS
3. 在浏览器中直接打开 Mini App URL 检查是否有错误
4. 如果在 Telegram 内打开失败，检查控制台日志

## 多平台兼容性

本示例已在以下环境中测试：

- Telegram Desktop
- Telegram iOS
- Telegram Android

## 代码示例

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>简单测试</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <style>
        body { font-family: sans-serif; padding: 20px; }
        #log { background: #f0f0f0; padding: 10px; margin-top: 20px; }
    </style>
</head>
<body>
    <h1>测试页面</h1>
    <button onclick="showAlert()">点击测试</button>
    <div id="log"></div>

    <script>
        const logElement = document.getElementById('log');
        
        function log(msg) {
            logElement.innerHTML += msg + '<br>';
        }
        
        function showAlert() {
            alert('按钮测试成功！');
            log('按钮已点击');
        }
        
        try {
            log('页面加载成功');
            if (window.Telegram && window.Telegram.WebApp) {
                log('Telegram WebApp API 可用');
                window.Telegram.WebApp.ready();
                log('已调用 WebApp.ready()');
            } else {
                log('Telegram WebApp API 不可用');
            }
        } catch (e) {
            log('错误: ' + e.message);
        }
    </script>
</body>
</html>
``` 