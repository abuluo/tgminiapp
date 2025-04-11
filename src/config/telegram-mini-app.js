const config = {
    // Telegram Mini App 配置
    botUsername: process.env.TELEGRAM_BOT_USERNAME || 'bindingt_bot',
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    
    // Mini App 配置
    appName: 'Chat Group Binding',
    shortName: 'chatbinding',
    
    // 验证配置
    authTokenExpiry: '24h',
    
    // 开发环境配置
    devMode: process.env.NODE_ENV !== 'production',
    
    // WebApp URL
    webAppUrl: process.env.WEBAPP_URL || 'https://your-domain.com',
};

module.exports = config; 