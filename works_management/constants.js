/**
 * @file constants.js
 * @description API endpoints and configuration constants for works management
 */

export const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';

export const API_PATHS = {
    getWorks: '/works',
    getProjects: '/projects?view=simple',
    deleteWork: '/delete-work',
    getStats: '/works/stats'
};

export const DOUYIN_VIDEO_PREFIX = 'https://www.douyin.com/video/';

// Default query parameters
export const DEFAULT_QUERY_STATE = {
    page: 1,
    pageSize: 15,
    projectId: '',
    sourceType: '',
    search: '',
    sortBy: 't7_publishedAt',
    sortOrder: 'desc'
};

// Pagination options
export const PAGE_SIZE_OPTIONS = [15, 30, 50];