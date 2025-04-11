const crypto = require('crypto');
const config = require('../config/telegram-mini-app');
const logger = require('../utils/logger');

// 验证 Telegram WebApp 初始化数据
const verifyInitData = (initData) => {
    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        urlParams.delete('hash');
        
        // 按字典序排序参数
        const params = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        
        // 计算 HMAC-SHA256
        const secret = crypto.createHmac('sha256', 'WebAppData')
            .update(config.botToken)
            .digest();
        
        const calculatedHash = crypto.createHmac('sha256', secret)
            .update(params)
            .digest('hex');
        
        return calculatedHash === hash;
    } catch (error) {
        logger.error('验证初始化数据时出错:', error);
        return false;
    }
};

// Telegram Mini App 认证中间件
const telegramAuth = (req, res, next) => {
    try {
        // 从请求头获取初始化数据
        const initData = req.headers['x-telegram-init-data'];
        
        if (!initData) {
            logger.warn('请求缺少 Telegram 初始化数据');
            return res.status(401).json({
                success: false,
                message: '未授权的访问'
            });
        }
        
        // 验证初始化数据
        if (!verifyInitData(initData)) {
            logger.warn('Telegram 初始化数据验证失败');
            return res.status(401).json({
                success: false,
                message: '无效的认证数据'
            });
        }
        
        // 解析用户数据
        const urlParams = new URLSearchParams(initData);
        const user = JSON.parse(urlParams.get('user'));
        
        // 将用户信息添加到请求对象
        req.user = {
            id: user.id.toString(),
            username: user.username,
            firstName: user.first_name,
            lastName: user.last_name,
            languageCode: user.language_code,
            isPremium: user.is_premium || false,
            source: 'telegram'
        };
        
        next();
    } catch (error) {
        logger.error('Telegram 认证中间件出错:', error);
        res.status(500).json({
            success: false,
            message: '认证处理出错'
        });
    }
};

module.exports = {
    telegramAuth,
    verifyInitData
}; 