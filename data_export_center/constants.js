/**
 * @module constants
 * @description API配置和常量定义
 */

// API基础URL
export const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';

// API端点配置
export const API_ENDPOINTS = {
    export: `${API_BASE_URL}/export-comprehensive-data`,
    filters: `${API_BASE_URL}/talents/filter-options`,
    projects: `${API_BASE_URL}/projects?view=simple`
};

// 导出实体类型
export const EXPORT_ENTITIES = {
    TALENT: 'talent',
    COLLABORATION: 'collaboration',
    PROJECT: 'project'
};

// 筛选器类型
export const FILTER_TYPES = {
    TEXT: 'text',
    SELECT: 'select',
    MULTISELECT: 'multiselect',
    CHECKBOX: 'checkbox',
    DATERANGE: 'daterange'
};