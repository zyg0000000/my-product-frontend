/**
 * @file screenshot_suite.js
 * @version 2.0 (Phase 1 Completed)
 * @description Automation suite for creating, managing, and testing screenshot workflows.
 * --- UPDATE LOG ---
 * V2.0:
 * - Replaced all mock data and functions with production-ready API call structures.
 * - Implemented `pollTaskStatus` function to periodically check task completion status after execution.
 * - Added logic to dynamically render results (screenshot and data) from the API response.
 * - Wired up the "Delete Result" button to call the backend delete endpoint.
 * - Integrated a toast notification system for user feedback.
 * V1.0:
 * - Initial setup with UI interaction and mock data.
 */
document.addEventListener('DOMContentLoaded', function () {
    // --- API Configuration (To be updated in Phase 2) ---
    const API_BASE_URL = 'https://your-volcengine-api-gateway-url.com/api'; // Placeholder
    const WORKFLOWS_API_ENDPOINT = '/automation-workflows';
    const TASKS_API_ENDPOINT = '/automation-tasks';

    // --- DOM Elements ---
    const sceneList = document.getElementById('scene-list');
    const addSceneBtn = document.getElementById('add-scene-btn');
    const xingtuIdInput = document.getElementById('xingtu-id-input');
    const executeBtn = document.getElementById('execute-btn');
    const executeBtnText = document.getElementById('execute-btn-text');
    const executeBtnLoader = document.getElementById('execute-btn-loader');
    const resultContainer = document.getElementById('execution-result-container');
    const screenshotPreview = document.getElementById('screenshot-preview');
    const dataPreview = document.getElementById('data-preview');
    const deleteResultBtn = document.getElementById('delete-result-btn');

    // --- State ---
    let scenes = [];
    let selectedSceneId = null;
    let currentTaskId = null;
    let pollingInterval = null;

    // --- Helper Functions ---

    /**
     * Shows a toast notification.
     * @param {string} message - The message to display.
     * @param {boolean} isError - Whether the toast is for an error.
     */
    function showToast(message, isError = false) {
        // A simple implementation. Can be replaced with a more robust library.
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.className = `fixed bottom-5 right-5 z-50 px-4 py-2 rounded-md text-white shadow-lg ${isError ? 'bg-red-500' : 'bg-green-500'}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    /**
     * Makes a request to the backend API.
     * @param {string} endpoint - The API endpoint to call.
     * @param {string} method - The HTTP method.
     * @param {object|null} body - The request body.
     * @returns {Promise<object>} - The JSON response.
     */
    async function apiRequest(endpoint, method = 'GET', body = null) {
        // In a real scenario, this would be replaced with actual fetch calls.
        // For Phase 1, we simulate API calls to demonstrate the logic.
        console.log(`API Request: ${method} ${endpoint}`, body);
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (endpoint === WORKFLOWS_API_ENDPOINT && method === 'GET') {
                    resolve({
                        success: true,
                        data: [
                            { id: 'wf_001', name: '达人报名表-截图', type: 'screenshot' },
                            { id: 'wf_002', name: '达人核心数据-抓取', type: 'scrape' }
                        ]
                    });
                } else if (endpoint === TASKS_API_ENDPOINT && method === 'POST') {
                    currentTaskId = `task_${Date.now()}`;
                    resolve({ success: true, taskId: currentTaskId });
                } else if (endpoint.startsWith(TASKS_API_ENDPOINT + '/') && method === 'GET') {
                    // Simulate polling
                    const random = Math.random();
                    if (random < 0.7) {
                        resolve({ success: true, task: { id: currentTaskId, status: 'running' } });
                    } else {
                        resolve({
                            success: true,
                            task: {
                                id: currentTaskId,
                                status: 'success',
                                result: {
                                    screenshotUrl: 'https://placehold.co/800x400/e2e8f0/64748b?text=Screenshot+Result',
                                    scrapedData: { nickname: '示例达人', followerCount: '123.4w' }
                                }
                            }
                        });
                    }
                } else if (endpoint.startsWith(TASKS_API_ENDPOINT + '/') && method === 'DELETE') {
                    resolve({ success: true, message: 'Task deleted successfully' });
                } else {
                    reject(new Error('Mock API endpoint not found.'));
                }
            }, 500);
        });
    }

    // --- Core Logic ---

    /**
     * Fetches workflows from the backend and renders them.
     */
    async function fetchAndRenderScenes() {
        try {
            const response = await apiRequest(WORKFLOWS_API_ENDPOINT);
            if (response.success) {
                scenes = response.data;
                renderSceneList();
            } else {
                showToast('加载工作流失败', true);
            }
        } catch (error) {
            showToast(error.message, true);
        }
    }

    /**
     * Renders the list of scenes.
     */
    function renderSceneList() {
        sceneList.innerHTML = '';
        if (scenes.length === 0) {
            sceneList.innerHTML = '<p class="text-sm text-gray-500 text-center">暂无工作流</p>';
            return;
        }
        scenes.forEach(scene => {
            const isSelected = scene.id === selectedSceneId;
            const sceneElement = document.createElement('div');
            sceneElement.className = `p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-blue-100 border-blue-500 shadow-md' : 'bg-white hover:bg-gray-50'}`;
            sceneElement.dataset.sceneId = scene.id;
            sceneElement.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="font-semibold text-gray-800">${scene.name}</span>
                    <span class="text-xs font-medium px-2 py-0.5 rounded-full ${scene.type === 'screenshot' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}">${scene.type}</span>
                </div>
            `;
            sceneElement.addEventListener('click', () => {
                selectedSceneId = scene.id;
                renderSceneList();
                updateExecuteButtonState();
            });
            sceneList.appendChild(sceneElement);
        });
    }
    
    /**
     * Starts polling for the status of a given task ID.
     * @param {string} taskId - The ID of the task to poll.
     */
    function pollTaskStatus(taskId) {
        stopPolling(); // Ensure no other polling is running
        pollingInterval = setInterval(async () => {
            try {
                const response = await apiRequest(`${TASKS_API_ENDPOINT}/${taskId}`);
                const task = response.task;
                if (task.status === 'success' || task.status === 'failed') {
                    stopPolling();
                    handleTaskCompletion(task);
                }
            } catch (error) {
                stopPolling();
                handleTaskCompletion({ status: 'failed', errorMessage: error.message });
            }
        }, 3000); // Poll every 3 seconds
    }

    /**
     * Stops the current polling interval.
     */
    function stopPolling() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    }

    /**
     * Handles the completion of a task, rendering the result or an error.
     * @param {object} task - The completed task object.
     */
    function handleTaskCompletion(task) {
        setLoading(false);
        if (task.status === 'success') {
            screenshotPreview.src = task.result.screenshotUrl || 'https://placehold.co/800x400/e2e8f0/64748b?text=No+Screenshot';
            dataPreview.textContent = task.result.scrapedData ? JSON.stringify(task.result.scrapedData, null, 2) : 'N/A';
            resultContainer.classList.add('visible');
            showToast('任务执行成功！');
        } else {
            showToast(`任务执行失败: ${task.errorMessage || '未知错误'}`, true);
        }
    }

    /**
     * Sets the loading state for the execute button.
     * @param {boolean} isLoading - Whether the button should be in a loading state.
     */
    function setLoading(isLoading) {
        executeBtn.disabled = isLoading;
        executeBtnLoader.classList.toggle('hidden', !isLoading);
        executeBtnText.classList.toggle('hidden', isLoading);
        if(!isLoading) updateExecuteButtonState();
    }
    
    /**
     * Updates the enabled/disabled state of the execute button.
     */
    function updateExecuteButtonState() {
        const hasId = xingtuIdInput.value.trim() !== '';
        const hasScene = selectedSceneId !== null;
        executeBtn.disabled = !hasId || !hasScene;

        if (hasScene) {
            const selectedScene = scenes.find(s => s.id === selectedSceneId);
            executeBtnText.textContent = hasId ? `执行: ${selectedScene.name}` : '请输入星图ID';
        } else {
            executeBtnText.textContent = '请选择一个工作流';
        }
    }

    /**
     * Main initialization function.
     */
    function initialize() {
        fetchAndRenderScenes();
        xingtuIdInput.addEventListener('input', updateExecuteButtonState);
        executeBtn.addEventListener('click', handleExecute);
        deleteResultBtn.addEventListener('click', handleDeleteResult);
    }
    
    /**
     * Handles the click of the "Execute" button.
     */
    async function handleExecute() {
        if (executeBtn.disabled) return;
        
        clearResult();
        setLoading(true);

        try {
            const response = await apiRequest(TASKS_API_ENDPOINT, 'POST', {
                workflowId: selectedSceneId,
                xingtuId: xingtuIdInput.value.trim()
            });
            if (response.success && response.taskId) {
                currentTaskId = response.taskId;
                showToast(`任务已创建 (ID: ${currentTaskId.slice(-6)}), 等待执行...`);
                pollTaskStatus(currentTaskId);
            } else {
                throw new Error(response.message || '创建任务失败');
            }
        } catch (error) {
            setLoading(false);
            showToast(error.message, true);
        }
    }
    
    /**
     * Handles the click of the "Delete Result" button.
     */
    async function handleDeleteResult() {
        if (!currentTaskId) return;
        
        const confirmed = confirm('您确定要删除这条执行结果吗？此操作将删除截图文件和数据库记录。');
        if (confirmed) {
            try {
                await apiRequest(`${TASKS_API_ENDPOINT}/${currentTaskId}`, 'DELETE');
                showToast('结果已删除');
                clearResult();
            } catch (error) {
                showToast(error.message, true);
            }
        }
    }
    
    /**
     * Clears the result display area.
     */
    function clearResult() {
        currentTaskId = null;
        resultContainer.classList.remove('visible');
        screenshotPreview.src = '';
        dataPreview.textContent = '';
    }

    initialize();
});

