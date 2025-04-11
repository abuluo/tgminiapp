const logger = require('../utils/logger');
const telegramBindingModel = require('../models/telegramBinding');

/**
 * 创建Telegram群组绑定
 * @param {Object} req Express请求对象
 * @param {Object} res Express响应对象
 */
const createBinding = (req, res) => {
    try {
        const { groupId, telegramGroupId, telegramGroupName } = req.body;
        
        // 验证必要参数
        if (!groupId || !telegramGroupId) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数',
                error: 'MISSING_PARAMS'
            });
        }
        
        // 检查是否已绑定
        const existingBinding = telegramBindingModel.findByGroupId(groupId);
        if (existingBinding) {
            return res.status(400).json({
                success: false,
                message: '该群组已绑定Telegram群组',
                error: 'ALREADY_BOUND'
            });
        }
        
        // 检查Telegram群组是否已被绑定
        const existingTelegramBinding = telegramBindingModel.findByTelegramGroupId(telegramGroupId);
        if (existingTelegramBinding) {
            return res.status(400).json({
                success: false,
                message: '该Telegram群组已被绑定',
                error: 'TELEGRAM_GROUP_ALREADY_BOUND'
            });
        }
        
        // 创建绑定
        const binding = telegramBindingModel.createBinding({
            groupId,
            telegramGroupId,
            telegramGroupName,
            createdBy: req.user.id
        });
        
        logger.info(`Created Telegram binding: ${binding.id} for group ${groupId} with Telegram group ${telegramGroupId}`);
        
        res.json({
            success: true,
            message: '绑定成功',
            data: binding
        });
    } catch (error) {
        logger.error('Error creating Telegram binding:', error);
        res.status(500).json({
            success: false,
            message: '绑定过程中出现错误',
            error: 'BINDING_ERROR'
        });
    }
};

/**
 * 解除Telegram群组绑定
 * @param {Object} req Express请求对象
 * @param {Object} res Express响应对象
 */
const unbindTelegram = (req, res) => {
    try {
        const { groupId } = req.params;
        
        // 检查绑定是否存在
        const existingBinding = telegramBindingModel.findByGroupId(groupId);
        if (!existingBinding) {
            return res.status(404).json({
                success: false,
                message: '找不到绑定记录',
                error: 'BINDING_NOT_FOUND'
            });
        }
        
        // 解除绑定
        const unbinded = telegramBindingModel.unbind(existingBinding.id);
        if (!unbinded) {
            return res.status(500).json({
                success: false,
                message: '解除绑定失败',
                error: 'UNBIND_FAILED'
            });
        }
        
        logger.info(`Unbound Telegram group from group ${groupId}`);
        
        res.json({
            success: true,
            message: '解除绑定成功'
        });
    } catch (error) {
        logger.error('Error unbinding Telegram group:', error);
        res.status(500).json({
            success: false,
            message: '解除绑定过程中出现错误',
            error: 'UNBIND_ERROR'
        });
    }
};

/**
 * 获取群组的Telegram绑定信息
 * @param {Object} req Express请求对象
 * @param {Object} res Express响应对象
 */
const getBindingByGroupId = (req, res) => {
    try {
        const { groupId } = req.params;
        
        // 获取绑定信息
        const binding = telegramBindingModel.findByGroupId(groupId);
        
        if (!binding) {
            return res.status(404).json({
                success: false,
                message: '找不到绑定记录',
                error: 'BINDING_NOT_FOUND'
            });
        }
        
        res.json({
            success: true,
            data: binding
        });
    } catch (error) {
        logger.error('Error getting Telegram binding:', error);
        res.status(500).json({
            success: false,
            message: '获取绑定信息时出现错误',
            error: 'GET_BINDING_ERROR'
        });
    }
};

module.exports = {
    createBinding,
    unbindTelegram,
    getBindingByGroupId
}; 