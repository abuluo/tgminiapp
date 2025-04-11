// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 激活当前页面的导航链接
    const currentPath = window.location.pathname;
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    // 复制Bot用户名
    const copyBotButton = document.querySelector('#copyBotName');
    if (copyBotButton) {
        // 获取实际的Bot用户名元素
        const botUsernameElement = document.querySelector('.bot-username');
        const botUsername = botUsernameElement ? botUsernameElement.textContent : '@YourActualBotName';
        
        copyBotButton.addEventListener('click', function() {
            navigator.clipboard.writeText(botUsername).then(() => {
                copyBotButton.textContent = '已复制';
                setTimeout(() => {
                    copyBotButton.textContent = '复制Bot用户名';
                }, 2000);
            });
        });
    }

    // 标签管理
    const tagInput = document.querySelector('#tagInput');
    const addTagButton = document.querySelector('#addTag');
    if (tagInput && addTagButton) {
        addTagButton.addEventListener('click', function() {
            const tagText = tagInput.value.trim();
            if (tagText) {
                const tags = document.querySelectorAll('.badge.bg-primary');
                if (tags.length < 3) {
                    const tagContainer = document.querySelector('.d-flex.flex-wrap.gap-2');
                    const newTag = document.createElement('span');
                    newTag.className = 'badge bg-primary';
                    newTag.innerHTML = `${tagText} <button type="button" class="btn-close btn-close-white"></button>`;
                    tagContainer.appendChild(newTag);
                    
                    // 添加删除标签的功能
                    newTag.querySelector('.btn-close').addEventListener('click', function() {
                        newTag.remove();
                    });
                    
                    tagInput.value = '';
                } else {
                    alert('最多只能添加3个标签');
                }
            }
        });

        // 为现有的标签添加删除功能
        document.querySelectorAll('.badge .btn-close').forEach(closeBtn => {
            closeBtn.addEventListener('click', function() {
                this.closest('.badge').remove();
            });
        });
    }

    // 创建聊天室表单提交
    const createChatForm = document.querySelector('#createChatRoom');
    if (createChatForm) {
        createChatForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const tags = Array.from(document.querySelectorAll('.badge.bg-primary'))
                .map(tag => tag.textContent.trim());
            
            const formData = {
                name: document.querySelector('#roomName').value,
                description: document.querySelector('#roomDescription').value,
                type: document.querySelector('#publicRoom').checked ? 'public' : 'private',
                tags: tags
            };

            try {
                const response = await fetch('/api/groups', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();
                
                if (data.success) {
                    if (document.querySelector('#bindTelegram').checked) {
                        window.location.href = '/bind-telegram';
                    } else {
                        window.location.href = '/groups';
                    }
                } else {
                    alert(data.message || '创建失败，请重试');
                }
            } catch (error) {
                console.error('创建失败:', error);
                alert('创建过程中出现错误，请重试');
            }
        });
    }

    // 验证码验证
    const verifyCodeButton = document.querySelector('#verifyCode');
    if (verifyCodeButton) {
        verifyCodeButton.addEventListener('click', async function() {
            const codeInput = document.querySelector('#verificationCode');
            const code = codeInput.value.trim();
            
            if (!code || code.length !== 6) {
                alert('请输入6位验证码');
                return;
            }

            // 禁用按钮，防止重复点击
            verifyCodeButton.disabled = true;
            verifyCodeButton.textContent = '验证中...';

            try {
                const response = await fetch('/api/groups/verify-code', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        code: code,
                        groupId: '123' // 这里应该是实际的群组ID
                    })
                });

                const data = await response.json();
                
                if (data.success) {
                    // 创建成功提示元素
                    const successAlert = document.createElement('div');
                    successAlert.className = 'alert alert-success mt-3';
                    successAlert.innerHTML = `
                        <i class="bi bi-check-circle-fill me-2"></i>
                        绑定成功！已与Telegram群组「${data.data.groupName || '未命名群组'}」完成绑定。
                    `;
                    
                    // 插入提示元素
                    const verificationInputGroup = codeInput.closest('.mb-3');
                    verificationInputGroup.parentNode.insertBefore(successAlert, verificationInputGroup.nextSibling);
                    
                    // 禁用输入框
                    codeInput.disabled = true;
                    
                    // 更改按钮文本
                    verifyCodeButton.textContent = '已绑定';
                    
                    // 3秒后跳转到群组列表页面
                    setTimeout(() => {
                        window.location.href = '/groups';
                    }, 3000);
                } else {
                    alert(data.message || '验证失败，请重试');
                    verifyCodeButton.disabled = false;
                    verifyCodeButton.textContent = '验证';
                }
            } catch (error) {
                console.error('验证失败:', error);
                alert('验证过程中出现错误，请重试');
                verifyCodeButton.disabled = false;
                verifyCodeButton.textContent = '验证';
            }
        });
    }

    // 添加登出功能
    const logoutButton = document.querySelector('#logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', async function(e) {
            e.preventDefault();
            try {
                const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'same-origin'
                });
                if (response.ok) {
                    window.location.href = '/login';
                }
            } catch (error) {
                console.error('Logout failed:', error);
            }
        });
    }
}); 