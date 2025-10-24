/**
 * @file statusCapsule.js
 * @description Generates HTML for displaying status capsules.
 */

/**
 * Generates the HTML string for a status capsule.
 * Includes unified width (w-36).
 * @param {string} status - The status text.
 * @returns {string} HTML string for the status capsule.
 */
export function getStatusCapsuleHtml(status) {
    let bgColor, textColor;
    switch (status) {
        case '待提报工作台':
            bgColor = 'bg-gray-100'; textColor = 'text-gray-700'; break;
        case '工作台已提交':
            bgColor = 'bg-yellow-100'; textColor = 'text-yellow-800'; break;
        case '客户已定档':
            bgColor = 'bg-blue-100'; textColor = 'text-blue-800'; break;
        case '视频已发布':
            bgColor = 'bg-green-100'; textColor = 'text-green-800'; break;
        default:
            bgColor = 'bg-gray-200'; textColor = 'text-gray-800';
    }
    // Added w-36 and justify-center
    return `<span class="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold ${bgColor} ${textColor} w-36 text-center">${status || '未知状态'}</span>`;
}
