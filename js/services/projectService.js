/**
 * @file projectService.js
 * @description Handles API interactions related to projects.
 */
import { apiRequest } from './api.js';
import { API_PATHS } from '../utils/constants.js';

/**
 * Loads details for a specific project.
 * @param {string} projectId - The ID of the project to load.
 * @returns {Promise<object>} The project data.
 */
export async function loadProjectDetails(projectId) {
    if (!projectId) throw new Error("Project ID is required.");
    // The API request function now returns the data directly if wrapped in {success, data}
    return await apiRequest(API_PATHS.PROJECTS, 'GET', { projectId: projectId });
}

/**
 * Loads configuration data (e.g., discounts, adjustment types).
 * @param {string} configType - The type of configuration to load (e.g., 'FRAMEWORK_DISCOUNTS').
 * @returns {Promise<Array>} The configuration values.
 */
export async function loadConfiguration(configType) {
     try {
        const response = await apiRequest(API_PATHS.CONFIGURATIONS, 'GET', { type: configType });
        // The GET /configurations endpoint might return an array of config objects
        const config = Array.isArray(response) ? response.find(c => c.type === configType) : null;
        return config?.values || config?.settings || []; // Return values array or settings object
     } catch (error) {
         console.error(`Failed to load configuration for ${configType}:`, error);
         return []; // Return empty array on error
     }
}

/**
 * Handles uploading project files.
 * @param {string} projectId - The ID of the project.
 * @param {FileList} files - The files to upload.
 * @param {Array} currentFiles - The current list of files for the project.
 * @returns {Promise<Array>} The updated list of project files.
 */
export async function uploadProjectFiles(projectId, files, currentFiles) {
    if (currentFiles.length + files.length > 5) {
        throw new Error('最多只能上传5个文件。');
    }

    const uploadPromises = Array.from(files).map(file => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    // API request returns the uploaded file info { name, url } directly
                    const uploadedFileInfo = await apiRequest(API_PATHS.UPLOAD_FILE, 'POST', {
                         fileName: file.name,
                         fileData: e.target.result // base64 data URL
                    });
                    resolve(uploadedFileInfo); // Resolve with { name, url }
                } catch (err) { reject(err); }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file); // Read as data URL for base64
        });
    });

    const newFiles = await Promise.all(uploadPromises);
    const updatedFileList = [...currentFiles, ...newFiles];

    // Update the project document with the new file list
    await apiRequest(API_PATHS.UPDATE_PROJECT, 'PUT', { id: projectId, projectFiles: updatedFileList });
    return updatedFileList; // Return the combined list
}

/**
 * Handles deleting a project file.
 * @param {string} projectId - The ID of the project.
 * @param {string} fileUrl - The URL of the file to delete.
 * @param {Array} currentFiles - The current list of files for the project.
 * @returns {Promise<Array>} The updated list of project files.
 */
export async function deleteProjectFile(projectId, fileUrl, currentFiles) {
    // API request might return null on success (204)
    await apiRequest(API_PATHS.DELETE_FILE, 'POST', { projectId: projectId, fileUrl: fileUrl });
    // Return the list excluding the deleted file
    return currentFiles.filter(file => file.url !== fileUrl);
}

/**
 * Handles submitting project adjustments (add or edit).
 * @param {string} projectId - The ID of the project.
 * @param {Array} currentAdjustments - The current list of adjustments.
 * @param {object} adjustmentData - Data for the new/edited adjustment.
 * @param {string|null} editingId - The ID of the adjustment being edited, or null for new.
 * @returns {Promise<Array>} The updated list of adjustments.
 */
export async function saveAdjustment(projectId, currentAdjustments, adjustmentData, editingId) {
    let updatedAdjustments;
    if (editingId) {
        updatedAdjustments = currentAdjustments.map(adj =>
            adj.id === editingId ? { ...adj, ...adjustmentData } : adj
        );
    } else {
        const newAdjustment = {
            id: `adj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            ...adjustmentData
        };
        updatedAdjustments = [...currentAdjustments, newAdjustment];
    }
    // API request might return null on success
    await apiRequest(API_PATHS.UPDATE_PROJECT, 'PUT', { id: projectId, adjustments: updatedAdjustments });
    return updatedAdjustments; // Return the updated array
}

/**
 * Handles deleting a project adjustment.
 * @param {string} projectId - The ID of the project.
 * @param {Array} currentAdjustments - The current list of adjustments.
 * @param {string} adjustmentId - The ID of the adjustment to delete.
 * @returns {Promise<Array>} The updated list of adjustments.
 */
export async function deleteAdjustment(projectId, currentAdjustments, adjustmentId) {
    const updatedAdjustments = currentAdjustments.filter(adj => adj.id !== adjustmentId);
    // API request might return null on success
    await apiRequest(API_PATHS.UPDATE_PROJECT, 'PUT', { id: projectId, adjustments: updatedAdjustments });
    return updatedAdjustments; // Return the updated array
}

/**
 * Updates the status of a project.
 * @param {string} projectId - The ID of the project.
 * @param {string} newStatus - The new status to set.
 * @returns {Promise<void>}
 */
export async function updateProjectStatus(projectId, newStatus) {
    // API request might return null on success
    await apiRequest(API_PATHS.UPDATE_PROJECT, 'PUT', { id: projectId, status: newStatus });
    // No return needed, caller should reload project data
}

/**
 * Loads data for the effect dashboard.
 * @param {string} projectId - The ID of the project.
 * @returns {Promise<object>} The effect dashboard data.
 */
export async function loadEffectDashboardData(projectId) {
     // API returns { overall: {...}, talents: [...] } directly
    return await apiRequest(API_PATHS.PERFORMANCE_DASHBOARD, 'POST', { projectId: projectId });
}
