/**
 * @file puppeteer-executor.js
 * @version 2.9 - Intelligent Data Extraction Engine
 * @description 封装了所有与 Puppeteer 相关的操作。
 * - [v2.9] [核心 Bug 修复] 完整地从旧版 `本地测试服务器.js` 移植了强大的 `extractSingleData` 函数。
 * 这个函数包含了向上遍历查找等多种高级策略，能够正确处理复杂的 `text=...` 选择器，
 * 彻底解决了当前版本数据提取大量失败的根本问题。
 * - [v2.8] 实现了智能截图模式。
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const sharp = require('sharp');

// --- 全局浏览器实例与配置 ---
let browser = null;
const userDataDir = path.join(__dirname, 'user_data_agent');
const SCREENSHOTS_BASE_DIR = path.join(__dirname, 'xingtu-screenshots');

// --- 辅助函数：创建目录 ---
function ensureDirExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// --- 辅助函数：终极智能靶向滚动 (基于鼠标滚轮) ---
async function autoScroll(page, scrollableElementSelector = null) {
    console.log(`[EXECUTOR] 开始滚动流程，目标区域: ${scrollableElementSelector || '整个页面'}`);

    if (scrollableElementSelector) {
        const element = await page.$(scrollableElementSelector);
        if (!element) {
            console.warn(`[EXECUTOR] 未找到用于滚动的元素: ${scrollableElementSelector}, 将尝试滚动整个页面。`);
        } else {
            console.log(`[EXECUTOR] 已定位到滚动区域: ${scrollableElementSelector}`);
            const boundingBox = await element.boundingBox();
            if (boundingBox) {
                await page.mouse.move(
                    boundingBox.x + boundingBox.width / 2,
                    boundingBox.y + boundingBox.height / 2
                );
            }
        }
    }

    let retries = 0;
    const maxRetries = 5;
    let lastImageBuffer = null;

    while (retries < maxRetries) {
        const currentImageBuffer = await page.screenshot();
        
        if (lastImageBuffer && currentImageBuffer.equals(lastImageBuffer)) {
            retries++;
            console.log(`[EXECUTOR] 页面视觉内容未变，尝试次数: ${retries}`);
        } else {
            retries = 0;
        }

        if (retries >= maxRetries) {
            console.log('[EXECUTOR] 页面内容连续未变，判定已到达底部。');
            break;
        }

        lastImageBuffer = currentImageBuffer;
        
        await page.mouse.wheel({ deltaY: 800 });
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    console.log('[EXECUTOR] 滚动完成。');
}


// [v2.9] --- 辅助函数：移植自旧版的智能数据提取引擎 ---
async function extractSingleData(page, selector) {
    let textContent = '';
    
    // 策略一: text=... >> next >> ... (查找兄弟元素)
    if (selector.startsWith('text=') && selector.includes('>> next >>')) {
        const parts = selector.split('>> next >>');
        const textToFind = parts[0].trim().substring(5);
        const childSelector = parts[1].trim();
        textContent = await page.evaluate((text, nextSiblingSelector) => {
            const xpathResult = document.evaluate(`//*[contains(normalize-space(.), "${text}")]`, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            if (xpathResult.snapshotLength === 0) return `Error: 找不到锚点文本 "${text}"`;
            const textElement = xpathResult.snapshotItem(xpathResult.snapshotLength - 1);
            if (!textElement) return `Error: XPath 找到了结果但无法获取锚点元素`;
            let potentialMatch = textElement.nextElementSibling;
            // Sometimes the direct sibling is not the container, check parent's sibling
            if(!potentialMatch) potentialMatch = textElement.parentElement.nextElementSibling;
            if (!potentialMatch) return `Error: 锚点 "${text}" 没有下一个兄弟元素`;
            const finalElement = potentialMatch.querySelector(nextSiblingSelector) || potentialMatch;
            return finalElement.textContent.trim();
        }, textToFind, childSelector);
    
    // 策略二: text=... >> ... (向上遍历查找子元素)
    } else if (selector.startsWith('text=') && selector.includes('>>')) {
        const parts = selector.split('>>');
        const textToFind = parts[0].trim().substring(5);
        const childSelector = parts[1].trim();
        textContent = await page.evaluate((text, childSel) => {
            const xpath = `//*[contains(normalize-space(.), "${text}")]`;
            const textResult = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

            if (textResult.snapshotLength === 0) return `Error: 找不到包含文本 "${text}" 的元素。`;

            for (let i = textResult.snapshotLength - 1; i >= 0; i--) {
                const textElement = textResult.snapshotItem(i);
                if (!textElement) continue;

                let currentParent = textElement.parentElement;
                while (currentParent && currentParent !== document.body) {
                    const childElement = currentParent.querySelector(childSel);
                    if (childElement) {
                        return childElement.textContent.trim();
                    }
                    currentParent = currentParent.parentElement;
                }
            }
            return `Error: 所有策略均失败。找到了文本 "${text}", 但无法定位到对应的子元素 "${childSel}"。`;
        }, textToFind, childSelector);
    
    // 策略三: 标准 CSS 选择器
    } else {
        await page.waitForSelector(selector, { timeout: 15000, visible: true });
        textContent = await page.$eval(selector, el => el.textContent.trim());
    }

    if (typeof textContent === 'string' && textContent.startsWith('Error:')) {
        throw new Error(textContent);
    }
    return textContent;
}


// --- 核心函数：获取浏览器实例 ---
async function getBrowser(isLoginFlow = false) {
    if (browser && browser.isConnected()) {
        return browser;
    }
    
    const launchOptions = {
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: false,
        userDataDir: userDataDir,
        defaultViewport: null,
        args: [
            '--start-maximized',
            '--window-size=2560,1440'
        ]
    };
    
    if (isLoginFlow) {
         console.log('[EXECUTOR] 启动一个新的浏览器实例 (用于登录)...');
    } else {
         console.log('[EXECUTOR] 启动一个新的浏览器实例 (用于执行任务)...');
    }

    browser = await puppeteer.launch(launchOptions);

    browser.on('disconnected', () => {
        console.log('[EXECUTOR] 浏览器已关闭。');
        browser = null;
    });

    return browser;
}


// --- 核心函数：处理登录流程 ---
async function handleLogin() {
    console.log('[EXECUTOR] 启动登录流程...');
    if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
    }

    const loginBrowser = await getBrowser(true);
    const page = await loginBrowser.newPage();
    await page.goto('https://www.xingtu.cn/login', { waitUntil: 'networkidle2' });

    console.log('[AGENT] 请在弹出的浏览器窗口中手动完成扫码登录。');
    console.log('[AGENT] 登录成功并跳转到星图首页后，请回到本终端，按 Enter 键开始执行任务...');

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await new Promise(resolve => rl.question('', resolve));
    rl.close();

    console.log('[AGENT] 确认登录。浏览器将保持在线以执行任务。');
    return browser;
}

// --- 核心函数：分段截图并拼接 ---
async function takeStitchedScreenshot(page, selector, filePath) {
    const element = await page.waitForSelector(selector, { visible: true });
    if (!element) throw new Error(`找不到用于截图的元素: ${selector}`);

    await page.evaluate(el => el.scrollTop = 0, element);
    await new Promise(r => setTimeout(r, 500));

    const screenshotBuffers = [];
    let isEnd = false;
    
    while (!isEnd) {
        const buffer = await element.screenshot();
        screenshotBuffers.push(buffer);

        isEnd = await page.evaluate(async el => {
            const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
            if (!isAtBottom) {
                el.scrollTop += el.clientHeight;
            }
            return isAtBottom;
        }, element);
        
        await new Promise(r => setTimeout(r, 500));
    }
    
    if (screenshotBuffers.length === 0) {
        throw new Error('未能捕获任何截图分片。');
    }
    
    const imageMetadatas = await Promise.all(screenshotBuffers.map(b => sharp(b).metadata()));
    const totalHeight = imageMetadatas.reduce((sum, meta) => sum + meta.height, 0);
    const maxWidth = Math.max(...imageMetadatas.map(m => m.width));

    const compositeParts = screenshotBuffers.map((buffer, i) => {
        const top = imageMetadatas.slice(0, i).reduce((sum, meta) => sum + meta.height, 0);
        return { input: buffer, top: top, left: 0 };
    });

    await sharp({
        create: {
            width: maxWidth,
            height: totalHeight,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
    })
    .composite(compositeParts)
    .toFile(filePath);

    console.log(`[EXECUTOR] 已成功拼接并保存长截图至: ${filePath}`);
}


// --- 核心函数：执行工作流 ---
async function executeActions(steps, xingtuId) {
    const br = await getBrowser();
    const page = await br.newPage();
    const results = { screenshots: [], data: {} };
    const userScreenshotsDir = path.join(SCREENSHOTS_BASE_DIR, xingtuId);
    ensureDirExists(userScreenshotsDir);

    try {
        const url = `https://www.xingtu.cn/ad/creator/author-homepage/douyin-video/${xingtuId}`;
        console.log(`[EXECUTOR] 导航至: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        
        for (const step of steps) {
            console.log(`[EXECUTOR] 执行动作: ${step.action}`, step.description || '');
            
            switch (step.action) {
                case 'wait':
                    await new Promise(resolve => setTimeout(resolve, step.milliseconds || 1000));
                    break;
                case 'waitForSelector':
                    await page.waitForSelector(step.selector, { timeout: 15000, visible: true });
                    break;
                case 'click':
                    await page.waitForSelector(step.selector, { timeout: 15000, visible: true });
                    await page.click(step.selector);
                    break;
                case 'screenshot':
                    const fileName = `${Date.now()}_${step.saveAs || 'screenshot.png'}`;
                    const filePath = path.join(userScreenshotsDir, fileName);
                    
                    if (step.stitched === true) {
                        console.log('[EXECUTOR] 执行“长截图”模式...');
                        await takeStitchedScreenshot(page, step.selector, filePath);
                    } else {
                        console.log('[EXECUTOR] 执行“普通截图”模式...');
                        const elementShot = await page.waitForSelector(step.selector, { visible: true });
                        if (!elementShot) throw new Error(`找不到用于截图的元素: ${step.selector}`);
                        await elementShot.screenshot({ path: filePath });
                    }
                    results.screenshots.push({ name: step.saveAs, path: filePath });
                    break;
                case 'scrollPage':
                    await autoScroll(page, step.selector || null);
                    break;
                case 'waitForNetworkIdle':
                    await page.waitForNetworkIdle({ idleTime: 1000, timeout: 60000 });
                    break;
                case 'extractData':
                    try {
                        const textContent = await extractSingleData(page, step.selector);
                        results.data[step.dataName] = textContent;
                        console.log(`[EXECUTOR] 成功提取数据 '${step.dataName}': ${textContent}`);
                    } catch (e) {
                        console.warn(`[EXECUTOR] 提取数据 '${step.dataName}' 失败: ${e.message}`);
                        results.data[step.dataName] = '提取失败';
                    }
                    break;
                case 'compositeExtract':
                    let template = step.template;
                    for (const source of step.sources) {
                        try {
                            const value = await extractSingleData(page, source.selector);
                            template = template.replace(new RegExp(`\\$\\{${source.name}\\}`, 'g'), value);
                        } catch (e) {
                             console.warn(`[EXECUTOR] 组合数据源 '${source.name}' 提取失败: ${e.message}`);
                             template = template.replace(new RegExp(`\\$\\{${source.name}\\}`, 'g'), '未找到');
                        }
                    }
                    results.data[step.dataName] = template;
                    console.log(`[EXECUTOR] 成功组合数据 '${step.dataName}': ${template.replace(/\n/g, '\\n')}`);
                    break;
            }
        }

        return {
            status: 'completed',
            result: {
                screenshots: results.screenshots.map(s => ({...s, url: `file://${s.path}`})),
                data: results.data
            },
            completedAt: new Date()
        };

    } catch (error) {
        console.error(`[EXECUTOR] 执行动作时发生错误:`, error);
        return {
            status: 'failed',
            errorMessage: error.stack,
            failedAt: new Date()
        };
    } finally {
        if (page) await page.close();
    }
}

module.exports = { handleLogin, executeActions };
