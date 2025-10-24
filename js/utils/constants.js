/**
 * @file constants.js
 * @description Defines shared constants for the application.
 */

// Status options that are manually editable in the UI (in execution phase)
export const MANUAL_STATUS_OPTIONS = ['待提报工作台', '工作台已提交', '客户已定档'];

// Add other constants as needed, e.g., API endpoints if not hardcoded in services
export const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';
export const ITEMS_PER_PAGE_DEFAULT = 10;
export const ITEMS_PER_PAGE_KEY = 'orderListItemsPerPage'; // Example key

// You might want to centralize API paths here too
export const API_PATHS = {
    PROJECTS: '/projects',
    CONFIGURATIONS: '/configurations',
    COLLABORATIONS: '/collaborations',
    UPLOAD_FILE: '/upload-file',
    DELETE_FILE: '/delete-file',
    UPDATE_COLLABORATION: '/update-collaboration',
    DELETE_COLLABORATION: '/delete-collaboration',
    UPDATE_PROJECT: '/update-project',
    GET_TALENT_HISTORY: '/getTalentHistory', // Placeholder - needs backend implementation
    PERFORMANCE_DASHBOARD: '/project-performance'
};
