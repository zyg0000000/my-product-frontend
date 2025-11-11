/**
 * @module api
 * @description API request wrapper with error handling
 */

import { API_BASE_URL } from './constants.js';

/**
 * Makes an API request with error handling
 * @param {string} endpoint - API endpoint path
 * @param {Object} options - Request options
 * @param {string} [options.method='GET'] - HTTP method
 * @param {Object} [options.body=null] - Request body for POST/PUT requests
 * @returns {Promise<Object>} API response data
 * @throws {Error} If the request fails
 */
export async function apiRequest(endpoint, options = {}) {
  const {
    method = 'GET',
    body = null
  } = options;

  const url = `${API_BASE_URL}${endpoint}`;
  const requestOptions = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    requestOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: response.statusText
      }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : {};
  } catch (error) {
    console.error(`API request failed: ${method} ${endpoint}`, error);
    throw error;
  }
}