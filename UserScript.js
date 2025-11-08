// ==UserScript==
// @name         Pixiv Novel Tag Filter
// @namespace    https://github.com/PRHyzzza/Pixiv-Novel-Tag-Filter
// @version      1.3
// @description  过滤Pixiv小说标签页面中的屏蔽标签（完全匹配）
// @author       PRHyzzza
// @match        https://www.pixiv.net/tags/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 从本地存储获取屏蔽的标签列表
    function getBlockedTags() {
        const blockedTags = localStorage.getItem('pixiv_blocked_tags');
        return blockedTags ? JSON.parse(blockedTags) : [];
    }

    // 查找小说项的LI元素
    function findNovelItems() {
        const items = [];

        // 方法1: 直接查找包含特定结构的LI元素
        const allListItems = document.querySelectorAll('li');

        allListItems.forEach(li => {
            // 检查这个LI是否包含小说特征
            const hasNovelLink = li.querySelector('a[href*="/novel/show.php?id="]');
            const hasTagLink = li.querySelector('a[href*="/tags/"][href*="/novels"]');
            const hasNovelContent = li.textContent && (
                li.textContent.includes('字') ||
                li.textContent.includes('分钟') ||
                li.querySelector('img[alt*="小説"]') ||
                li.querySelector('img[alt*="novel"]')
            );

            if (hasNovelLink && hasTagLink && hasNovelContent) {
                items.push(li);
            }
        });

        // 方法2: 从标签链接向上找到LI元素
        if (items.length === 0) {
            const tagLinks = document.querySelectorAll('a[href*="/tags/"][href*="/novels"]');

            tagLinks.forEach(tagLink => {
                let element = tagLink;
                // 向上查找直到找到LI元素
                while (element && element !== document.body) {
                    if (element.tagName === 'LI') {
                        if (!items.includes(element)) {
                            items.push(element);
                        }
                        break;
                    }
                    element = element.parentElement;
                }
            });
        }

        console.log(`找到 ${items.length} 个小说LI元素`);
        return items;
    }

    // 检查小说是否包含屏蔽标签（完全匹配）
    function hasBlockedTags(novelItem, blockedTags) {
        if (blockedTags.length === 0) return false;

        // 查找所有标签链接
        const tagLinks = novelItem.querySelectorAll('a[href*="/tags/"][href*="/novels"]');

        for (const tagLink of tagLinks) {
            const tagText = tagLink.textContent.trim();

            // 完全匹配检查
            for (const blockedTag of blockedTags) {
                if (tagText === blockedTag) {
                    console.log(`找到匹配标签: "${tagText}" === "${blockedTag}"`);
                    return true;
                }
            }
        }

        return false;
    }

    // 过滤小说列表
    function filterNovels() {
        const blockedTags = getBlockedTags();
        if (blockedTags.length === 0) {
            console.log('未设置屏蔽标签');
            return;
        }

        const novelItems = findNovelItems();
        let filteredCount = 0;

        console.log(`检查 ${novelItems.length} 个小说项目，屏蔽标签: ${blockedTags.join(', ')}`);

        novelItems.forEach((novelItem, index) => {
            const novelTitle = novelItem.querySelector('a[href*="/novel/show.php?id="]')?.textContent || `小说${index + 1}`;

            if (hasBlockedTags(novelItem, blockedTags)) {
                novelItem.style.display = 'none';
                filteredCount++;
                console.log(`隐藏: ${novelTitle}`);
            }
        });

        if (filteredCount > 0) {
            console.log(`✅ 已过滤 ${filteredCount} 个包含屏蔽标签的小说`);
            showFilterNotification(filteredCount, blockedTags);
        }
    }

    // 显示过滤结果通知
    function showFilterNotification(filteredCount, blockedTags) {
        const existingNotification = document.querySelector('#pixiv-filter-notification');
        if (existingNotification) existingNotification.remove();

        const notification = document.createElement('div');
        notification.id = 'pixiv-filter-notification';
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 120px;
                right: 20px;
                background: #4CAF50;
                color: white;
                padding: 12px 16px;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 9999;
                max-width: 300px;
                font-size: 14px;
                line-height: 1.4;
            ">
                <strong>🎯 标签过滤完成</strong><br>
                已隐藏 <strong>${filteredCount}</strong> 个小说<br>
                <small>屏蔽标签: ${blockedTags.slice(0, 2).join(', ')}${blockedTags.length > 2 ? '...' : ''}</small>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    // 添加设置界面
    function addSettingsPanel() {
        const existingBtn = document.querySelector('#pixiv-tag-filter-settings');
        if (existingBtn) existingBtn.remove();

        const settingsBtn = document.createElement('button');
        settingsBtn.id = 'pixiv-tag-filter-settings';
        settingsBtn.innerHTML = '📝 标签屏蔽';
        settingsBtn.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10000;
            padding: 10px 15px;
            background: #0096fa;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
        `;

        settingsBtn.addEventListener('mouseenter', () => {
            settingsBtn.style.background = '#007acc';
            settingsBtn.style.transform = 'scale(1.05)';
        });

        settingsBtn.addEventListener('mouseleave', () => {
            settingsBtn.style.background = '#0096fa';
            settingsBtn.style.transform = 'scale(1)';
        });

        settingsBtn.addEventListener('click', showSettingsModal);
        document.body.appendChild(settingsBtn);
    }

    // 显示设置模态框
    function showSettingsModal() {
        const blockedTags = getBlockedTags();

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            z-index: 10001;
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
        `;

        const title = document.createElement('h3');
        title.textContent = '📚 Pixiv小说标签屏蔽';
        title.style.cssText = 'margin: 0 0 20px 0; color: #333;';

        const description = document.createElement('div');
        description.innerHTML = `
            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                <strong>完全匹配模式：</strong>输入要屏蔽的完整标签
            </p>
            <p style="margin: 0 0 15px 0; color: #888; font-size: 12px;">
                💡 复制页面中显示的完整标签，每行一个
            </p>
        `;

        const textarea = document.createElement('textarea');
        textarea.value = blockedTags.join('\n');
        textarea.placeholder = `例如：
绿帽/NTR/NTL/媚黑/bbc/黑人/夫目前犯/隐奸
肉便器/凌辱/调教/强奸/恶堕/春药/气味/抖m/抖s
后宫/女儿/爆乳/母亲/妈妈/御姐/萝莉/妹妹/姐姐/老师`;
        textarea.style.cssText = `
            width: 100%;
            height: 200px;
            padding: 12px;
            border: 2px solid #e1e1e1;
            border-radius: 6px;
            resize: vertical;
            font-size: 14px;
            box-sizing: border-box;
            font-family: inherit;
            line-height: 1.4;
        `;

        const stats = document.createElement('div');
        stats.style.cssText = 'margin: 10px 0; color: #666; font-size: 12px;';
        updateStats();

        function updateStats() {
            const tags = textarea.value.split('\n')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);
            stats.textContent = `当前设置 ${tags.length} 个屏蔽标签`;
        }

        textarea.addEventListener('input', updateStats);

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            margin-top: 20px;
            text-align: right;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        `;

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.cssText = `
            padding: 10px 20px;
            background: #f0f0f0;
            color: #333;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
        `;

        const saveBtn = document.createElement('button');
        saveBtn.textContent = '💾 保存并刷新';
        saveBtn.style.cssText = `
            padding: 10px 20px;
            background: #0096fa;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
        `;

        saveBtn.addEventListener('click', () => {
            const tags = textarea.value.split('\n')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);

            localStorage.setItem('pixiv_blocked_tags', JSON.stringify(tags));
            overlay.remove();
            location.reload();
        });

        cancelBtn.addEventListener('click', () => {
            overlay.remove();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });

        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(saveBtn);

        modal.appendChild(title);
        modal.appendChild(description);
        modal.appendChild(textarea);
        modal.appendChild(stats);
        modal.appendChild(buttonContainer);
        overlay.appendChild(modal);

        document.body.appendChild(overlay);
        textarea.focus();
    }

    // 初始化
    function init() {
        console.log('Pixiv小说标签过滤器已启动');

        // 主要过滤
        setTimeout(() => {
            filterNovels();
            addSettingsPanel();
        }, 2000);

        // 监听动态内容加载
        const observer = new MutationObserver((mutations) => {
            let shouldFilter = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1 && (
                            node.querySelector('li') ||
                            node.querySelector('a[href*="/tags/"][href*="/novels"]')
                        )) {
                            shouldFilter = true;
                            break;
                        }
                    }
                }
                if (shouldFilter) break;
            }

            if (shouldFilter) {
                setTimeout(filterNovels, 500);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // 防抖滚动监听
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(filterNovels, 1000);
        });
    }

    // 启动脚本
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
