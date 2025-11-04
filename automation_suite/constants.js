/**
 * @file constants.js
 * @description Automation Suite 常量配置
 */

// API 配置
export const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';

export const API_ENDPOINTS = {
    workflows: `${API_BASE_URL}/automation-workflows`,
    tasks: `${API_BASE_URL}/automation-tasks`,
    projects: `${API_BASE_URL}/projects?view=simple`,
    jobs: `${API_BASE_URL}/automation-jobs-get`,
    jobsManage: `${API_BASE_URL}/automation-jobs`
};

// 分页配置
export const CONFIG = {
    JOBS_PER_PAGE: 4,
    TASKS_PER_LOAD: 10
};

// 视图模式
export const VIEW_MODES = {
    WORKFLOW: 'workflow',
    PROJECT: 'project',
    TEST: 'test'
};

// 状态配置
export const STATUS_CONFIG = {
    processing: { text: '执行中', color: 'blue' },
    awaiting_review: { text: '待审查', color: 'yellow' },
    completed: { text: '已完成', color: 'green' },
    failed: { text: '失败', color: 'red' }
};

// 任务状态配置
export const TASK_STATUS_CONFIG = {
    pending: { text: '等待中', color: 'gray' },
    processing: { text: '处理中', color: 'blue' },
    completed: { text: '成功', color: 'green' },
    failed: { text: '失败', color: 'red' }
};

// 动作定义
export const ACTION_DEFINITIONS = {
    'Go to URL': {
        title: '导航到页面',
        color: 'cyan',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.536a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>`,
        fields: [
            { name: 'description', label: '步骤描述', type: 'text', placeholder: '例如：打开达人主页' },
            { name: 'url', label: '页面URL *', type: 'text', placeholder: 'https://example.com/{{placeholder}}', required: true }
        ]
    },
    waitForSelector: {
        title: '等待元素出现',
        color: 'sky',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg>`,
        fields: [
            { name: 'description', label: '步骤描述', type: 'text', placeholder: '例如：等待价格模块加载' },
            { name: 'selector', label: 'CSS 选择器 *', type: 'text', placeholder: '.price-container .final-price', required: true }
        ]
    },
    click: {
        title: '点击元素',
        color: 'indigo',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path></svg>`,
        fields: [
            { name: 'description', label: '步骤描述', type: 'text', placeholder: '例如：点击"下一页"按钮' },
            { name: 'selector', label: 'CSS 选择器 *', type: 'text', placeholder: '#some-button-id', required: true }
        ]
    },
    screenshot: {
        title: '截取区域',
        color: 'teal',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>`,
        fields: [
            { name: 'description', label: '步骤描述', type: 'text', placeholder: '例如：截取价格区域' },
            { name: 'selector', label: 'CSS 选择器 *', type: 'text', placeholder: '.price-container', required: true },
            { name: 'saveAs', label: '保存为 *', type: 'text', placeholder: '价格截图.png', required: true },
            { name: 'stitched', label: '长截图模式', type: 'checkbox' }
        ]
    },
    wait: {
        title: '等待',
        color: 'orange',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
        fields: [
            { name: 'description', label: '步骤描述', type: 'text', placeholder: '例如：等待动画加载' },
            { name: 'milliseconds', label: '等待时长 (毫秒) *', type: 'number', placeholder: '2000', required: true }
        ]
    },
    scrollPage: {
        title: '滚动页面',
        color: 'purple',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 17l-4 4m0 0l-4-4m4 4V3"></path></svg>`,
        fields: [
            { name: 'description', label: '步骤描述', type: 'text', placeholder: '滚动页面以加载更多内容' },
            { name: 'selector', label: '滚动区域 (可选)', type: 'text', placeholder: '默认为整个页面, 可指定如 .scroll-div' }
        ]
    },
    waitForNetworkIdle: {
        title: '等待加载',
        color: 'gray',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h5M5 5a7 7 0 0012 5l-2.5-2.5M19 19v-5h-5M18 18a7 7 0 00-12-5l2.5 2.5"></path></svg>`,
        fields: [
            { name: 'description', label: '步骤描述', type: 'text', placeholder: '等待所有网络请求完成' }
        ]
    },
    extractData: {
        title: '提取数据',
        color: 'amber',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14v6m-3-3v3m-3-3v3m-3-3v3M3 17l6-6 4 4 6-6"></path></svg>`,
        fields: [
            { name: 'description', label: '步骤描述', type: 'text', placeholder: '例如：提取预期CPM' },
            { name: 'dataName', label: '数据名称 *', type: 'text', placeholder: '预期CPM', required: true },
            { name: 'selector', label: 'CSS 选择器 *', type: 'text', placeholder: 'text=预期CPM >> span.value', required: true }
        ]
    },
    compositeExtract: {
        title: '组合数据',
        color: 'rose',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>`,
        fields: [
            { name: 'description', label: '步骤描述', type: 'text', placeholder: '例如：拼接用户画像总结' },
            { name: 'dataName', label: '最终数据名称 *', type: 'text', placeholder: '用户画像总结', required: true },
            { name: 'template', label: '组合模板 *', type: 'textarea', placeholder: '触达用户 ${age_gender}\\n集中 ${city_tier}', required: true }
        ],
        isComplex: true
    }
};
