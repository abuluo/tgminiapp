// 模拟数据存储（实际项目中应使用MongoDB或其他数据库）
const telegramBindings = [
    // 添加一个默认绑定，这样即使服务器重启也有预设的绑定关系
    // 在实际应用中，这里应该填写真实的 Telegram 群组 ID
    {
        id: '1234567890',
        groupId: '478708', // 使用固定的群组ID
        telegramGroupId: '-1001234567890', // 这只是一个占位符，应该替换为真实的Telegram群组ID
        telegramGroupName: '王大师的BTC趋势分析',
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        active: true
    },
    {
        id: '1234567891',
        groupId: '478708', // 使用相同的群组ID进行备份
        telegramGroupId: '-1004024087689', // 尝试使用另一个可能的Telegram群组ID
        telegramGroupName: '王大师的BTC趋势分析备用',
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        active: true
    }
];

/**
 * 创建Telegram群组绑定
 * @param {Object} data 绑定数据
 * @returns {Object} 创建的绑定记录
 */
const createBinding = (data) => {
    // 先检查是否已存在相同的绑定
    const existingGroupBinding = findByGroupId(data.groupId);
    const existingTelegramBinding = findByTelegramGroupId(data.telegramGroupId);
    
    // 如果已经存在绑定，先移除旧的绑定
    if (existingGroupBinding) {
        console.log(`移除已存在的平台群组绑定: ${existingGroupBinding.id}`);
        unbind(existingGroupBinding.id);
    }
    
    if (existingTelegramBinding) {
        console.log(`移除已存在的Telegram群组绑定: ${existingTelegramBinding.id}`);
        unbind(existingTelegramBinding.id);
    }
    
    const binding = {
        id: Date.now().toString(),
        groupId: data.groupId, // 平台群组ID
        telegramGroupId: data.telegramGroupId, // Telegram群组ID
        telegramGroupName: data.telegramGroupName, // Telegram群组名称
        createdBy: data.createdBy, // 创建人ID
        createdAt: new Date(),
        updatedAt: new Date(),
        active: true
    };
    
    telegramBindings.push(binding);
    console.log(`创建了新的绑定: 平台群组 ${binding.groupId} -> Telegram群组 ${binding.telegramGroupId}`);
    console.log(`当前绑定总数: ${telegramBindings.length}`);
    return binding;
};

/**
 * 根据平台群组ID查找绑定
 * @param {String} groupId 平台群组ID
 * @returns {Object|null} 绑定记录
 */
const findByGroupId = (groupId) => {
    const binding = telegramBindings.find(binding => binding.groupId === groupId && binding.active);
    if (binding) {
        console.log(`找到平台群组 ${groupId} 的绑定: Telegram群组 ${binding.telegramGroupId}`);
    } else {
        console.log(`未找到平台群组 ${groupId} 的绑定`);
    }
    return binding || null;
};

/**
 * 根据Telegram群组ID查找绑定
 * @param {String} telegramGroupId Telegram群组ID
 * @returns {Object|null} 绑定记录
 */
const findByTelegramGroupId = (telegramGroupId) => {
    const binding = telegramBindings.find(binding => binding.telegramGroupId === telegramGroupId && binding.active);
    if (binding) {
        console.log(`找到Telegram群组 ${telegramGroupId} 的绑定: 平台群组 ${binding.groupId}`);
    } else {
        console.log(`未找到Telegram群组 ${telegramGroupId} 的绑定`);
    }
    return binding || null;
};

/**
 * 解除绑定
 * @param {String} id 绑定记录ID
 * @returns {Boolean} 是否成功
 */
const unbind = (id) => {
    const bindingIndex = telegramBindings.findIndex(binding => binding.id === id);
    if (bindingIndex !== -1) {
        telegramBindings[bindingIndex].active = false;
        telegramBindings[bindingIndex].updatedAt = new Date();
        console.log(`解除绑定: ${id}`);
        return true;
    }
    return false;
};

/**
 * 获取所有绑定记录
 * @returns {Array} 绑定记录列表
 */
const getAllBindings = () => {
    const activeBindings = telegramBindings.filter(binding => binding.active);
    console.log(`当前活跃绑定总数: ${activeBindings.length}`);
    return activeBindings;
};

/**
 * 列出所有绑定（包括非活跃的）
 * @returns {Array} 所有绑定记录
 */
const listAllBindings = () => {
    return [...telegramBindings];
};

/**
 * 手动创建绑定（用于测试和调试）
 * @param {String} groupId 平台群组ID
 * @param {String} telegramGroupId Telegram群组ID
 * @param {String} telegramGroupName Telegram群组名称
 * @returns {Object} 创建的绑定对象
 */
const createManualBinding = (groupId, telegramGroupId, telegramGroupName) => {
    // 移除现有绑定
    telegramBindings.forEach(binding => {
        if ((binding.groupId === groupId || binding.telegramGroupId === telegramGroupId) && binding.active) {
            binding.active = false;
            binding.updatedAt = new Date();
        }
    });
    
    // 创建新绑定
    const binding = {
        id: Date.now().toString(),
        groupId: groupId,
        telegramGroupId: telegramGroupId,
        telegramGroupName: telegramGroupName,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        active: true
    };
    
    telegramBindings.push(binding);
    console.log(`手动创建绑定: 平台群组 ${groupId} -> Telegram群组 ${telegramGroupId}`);
    
    return binding;
};

module.exports = {
    createBinding,
    findByGroupId,
    findByTelegramGroupId,
    unbind,
    getAllBindings,
    listAllBindings,
    createManualBinding
}; 