/**
 * @module constants
 * @description API configuration and application constants
 */

/**
 * Base URL for API requests
 * @constant {string}
 */
export const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';

/**
 * API endpoints
 * @constant {Object}
 */
export const API_ENDPOINTS = {
  PROJECTS: '/projects'
};

/**
 * Time dimension options
 * @constant {Object}
 */
export const TIME_DIMENSIONS = {
  FINANCIAL: 'financial',
  NATURAL: 'natural'
};

/**
 * Default filter values
 * @constant {Object}
 */
export const DEFAULT_FILTERS = {
  timeDimension: TIME_DIMENSIONS.FINANCIAL,
  year: '',
  month: '',
  projectType: ''
};

/**
 * Chart configuration constants
 * @constant {Object}
 */
export const CHART_CONFIG = {
  COLORS: {
    INCOME_BAR: 'rgba(59, 130, 246, 0.5)',
    INCOME_BORDER: 'rgba(59, 130, 246, 1)',
    MARGIN_LINE: 'rgba(139, 92, 246, 1)',
    MARGIN_FILL: 'rgba(139, 92, 246, 0.2)'
  },
  LINE_TENSION: 0.4
};