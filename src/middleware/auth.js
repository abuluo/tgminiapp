// 模拟认证中间件
const mockAuth = (req, res, next) => {
    // 模拟用户数据
    req.user = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin'
    };
    next();
};

module.exports = {
    mockAuth
}; 