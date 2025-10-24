/**
 * @file collaborationService.js
 * @description Handles API interactions related to collaborations.
 */
import { apiRequest } from './api.js';
import { API_PATHS } from '../utils/constants.js';

/**
 * Loads a paginated list of collaborators for a project, with optional status filtering.
 * @param {string} projectId - The ID of the project.
 * @param {number} page - The current page number.
 * @param {number} itemsPerPage - Number of items per page.
 * @param {string} [statuses=''] - Comma-separated string of statuses to filter by.
 * @param {string} [sortBy='createdAt'] - Field to sort by.
 * @param {string} [order='desc'] - Sort order ('asc' or 'desc').
 * @returns {Promise<{data: Array, total: number}>} Object containing collaborators list and total count.
 */
export async function loadCollaborators(projectId, page, itemsPerPage, statuses = '', sortBy = 'createdAt', order = 'desc') {
    const params = {
        projectId,
        page,
        limit: itemsPerPage,
        sortBy,
        order
    };
    if (statuses) {
        params.statuses = statuses;
    }
    // API returns { success, total, page, limit, data } structure
    const response = await apiRequest(API_PATHS.COLLABORATIONS, 'GET', params);
    return {
        data: response.data || [],
        total: response.total || 0
    };
}

/**
 * Deletes a collaboration record.
 * @param {string} collaborationId - The ID of the collaboration to delete.
 * @returns {Promise<void>}
 */
export async function deleteCollaboration(collaborationId) {
    // API request might return null on success (204)
    await apiRequest(API_PATHS.DELETE_COLLABORATION, 'DELETE', { collaborationId: collaborationId });
    // No return needed, caller should reload data
}

/**
 * Updates the status of a collaboration.
 * @param {string} collaborationId - The ID of the collaboration.
 * @param {string} newStatus - The new status.
 * @returns {Promise<void>}
 */
export async function updateCollaborationStatus(collaborationId, newStatus) {
    // API request might return null on success
    await apiRequest(API_PATHS.UPDATE_COLLABORATION, 'PUT', { id: collaborationId, status: newStatus });
    // No return needed, caller should reload data
}

/**
 * Updates the planned release date of a collaboration.
 * @param {string} collaborationId - The ID of the collaboration.
 * @param {string|null} newDate - The new planned release date (YYYY-MM-DD) or null.
 * @returns {Promise<void>}
 */
export async function savePlannedDate(collaborationId, newDate) {
    // API request might return null on success
    await apiRequest(API_PATHS.UPDATE_COLLABORATION, 'PUT', {
        id: collaborationId,
        plannedReleaseDate: newDate || null // Ensure null is sent if date is cleared
    });
     // No return needed, caller should reload data or update UI directly
}

/**
 * Saves performance data (dates, IDs, file link) for a collaboration.
 * Also handles status updates based on publishDate.
 * @param {string} collaborationId - The ID of the collaboration.
 * @param {object} performanceData - Object containing { publishDate, contentFile, taskId, videoId }.
 * @param {string} currentStatus - The current status of the collaboration.
 * @returns {Promise<void>}
 */
export async function savePerformanceData(collaborationId, performanceData, currentStatus) {
    const payload = { id: collaborationId, ...performanceData };

    // Auto-update status based on publishDate
    if (payload.publishDate && currentStatus !== '视频已发布') {
        payload.status = '视频已发布';
    } else if (!payload.publishDate && currentStatus === '视频已发布') {
        payload.status = '客户已定档'; // Revert status if date is cleared
    }
    // API request might return null on success
    await apiRequest(API_PATHS.UPDATE_COLLABORATION, 'PUT', payload);
     // No return needed, caller should reload data
}

/**
 * Saves financial dates (orderDate, paymentDate) and potentially orderType for a collaboration.
 * @param {string} collaborationId - The ID of the collaboration.
 * @param {object} dataToSave - Object possibly containing { orderDate, paymentDate, orderType }.
 * @returns {Promise<void>}
 */
export async function saveFinancialDatesAndType(collaborationId, dataToSave) {
    const payload = { id: collaborationId, ...dataToSave };
    // API request might return null on success
    await apiRequest(API_PATHS.UPDATE_COLLABORATION, 'PUT', payload);
     // No return needed, caller should reload data
}

/**
 * Executes a batch update for financial dates.
 * @param {Array<string>} selectedIds - Array of collaboration IDs to update.
 * @param {string} actionType - 'setOrderDate' or 'setPaymentDate'.
 * @param {string} dateValue - The date value to set (YYYY-MM-DD).
 * @returns {Promise<void>}
 */
export async function executeBatchDateUpdate(selectedIds, actionType, dateValue) {
    const fieldToUpdate = actionType === 'setOrderDate' ? 'orderDate' : 'paymentDate';
    const updatePromises = selectedIds.map(id => {
        const payload = { id: id, [fieldToUpdate]: dateValue };
        // We don't need the return value here, just wait for completion or error
        return apiRequest(API_PATHS.UPDATE_COLLABORATION, 'PUT', payload);
    });
    // Wait for all individual updates to complete
    await Promise.all(updatePromises);
     // No return needed, caller should reload data
}

/**
 * Fetches collaboration history for a specific talent, excluding the current project.
 * NOTE: Backend endpoint /getTalentHistory needs implementation.
 * @param {string} talentId - The ID of the talent.
 * @param {string} excludeProjectId - The ID of the project to exclude.
 * @returns {Promise<Array>} List of historical collaboration items.
 */
export async function getTalentHistory(talentId, excludeProjectId) {
    // API returns { success: true, data: [...] } structure
    const response = await apiRequest(API_PATHS.GET_TALENT_HISTORY, 'GET', {
        talentId: talentId,
        excludeProjectId: excludeProjectId
    });
    // Ensure data is always an array, even if backend returns null/undefined
    return response.data || [];
}
