/**
 * @file dashboard.js
 * @description 仪表盘模块 - 渲染统计信息
 */

import { displayedTasks } from './state-manager.js';

/**
 * 渲染仪表盘统计信息
 */
export function renderDashboard() {
    const statsReceivable = document.getElementById('stats-receivable');
    const statsRecovered = document.getElementById('stats-recovered');
    const statsRecoveryRate = document.getElementById('stats-recovery-rate');
    const statsTodoCount = document.getElementById('stats-todo-count');

    const stats = displayedTasks.reduce((acc, task) => {
        acc.totalReceivable += task.receivable || 0;
        const recovered = parseFloat(task.recoveredAmount);
        if (recovered !== null && !isNaN(recovered)) {
            acc.totalRecovered += recovered;
        }
        if (task.recoveredAmount === null || isNaN(parseFloat(task.recoveredAmount))) {
            acc.todoCount++;
        }
        return acc;
    }, {
        totalReceivable: 0,
        totalRecovered: 0,
        todoCount: 0
    });

    statsReceivable.textContent = `¥ ${stats.totalReceivable.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;

    statsRecovered.textContent = `¥ ${stats.totalRecovered.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;

    statsRecoveryRate.textContent = stats.totalReceivable > 0
        ? `${((stats.totalRecovered / stats.totalReceivable) * 100).toFixed(2)}%`
        : '0.00%';

    statsTodoCount.textContent = stats.todoCount;
}