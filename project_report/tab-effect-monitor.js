/**
 * @file tab-effect-monitor.js
 * @description 效果监测 Tab 模块
 * @version 1.0.0
 *
 * 职责:
 * - 占位页面（当前功能未实现）
 * - 未来可扩展数据可视化功能
 */

export class EffectMonitorTab {
    constructor(app, projectId, project) {
        this.app = app;
        this.projectId = projectId;
        this.project = project;
    }

    /**
     * 加载Tab数据
     */
    async load() {
        // 当前为占位Tab，无需加载数据
        console.log('[EffectMonitorTab] 效果监测功能正在开发中...');
    }

    /**
     * 更新数据（用于主控制器刷新）
     * @param {object} project - 项目数据
     */
    updateData(project) {
        this.project = project;
    }

    /**
     * 销毁Tab，清理资源
     */
    destroy() {
        // 当前无资源需要清理
    }
}
