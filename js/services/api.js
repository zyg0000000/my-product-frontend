/**
 * @file api.js
 * @description Provides a centralized function for making API requests.
 */

import { showCustomAlert } from '../components/modal.js';
import { API_BASE_URL } from '../utils/constants.js';

/**
 * Makes an API request.
 * @param {string} endpoint - The API endpoint path (e.g., '/projects').
 * @param {string} [method='GET'] - The HTTP method.
 * @param {object|null} [body=null] - The request body for POST/PUT/DELETE. For GET, used for query params.
 * @returns {Promise<object|Blob|null>} The parsed JSON response, Blob for PDF, or null for 204.
 * @throws {Error} If the API request fails.
 */
export async function apiRequest(endpoint, method = 'GET', body = null) {
    const url = new URL(`${API_BASE_URL}${endpoint}`);

    // Handle GET request parameters
    if (method === 'GET' && body) {
        Object.keys(body).forEach(key => {
            if (body[key] !== undefined && body[key] !== null && body[key] !== '') {
                // Handle array parameters (like statuses)
                if (Array.isArray(body[key])) {
                     body[key].forEach(value => url.searchParams.append(key, value));
                } else {
                    url.searchParams.append(key, body[key]);
                }
            }
        });
    }

    const options = {
        method,
        headers: {
            // Include Content-Type only for methods that typically have a body
            ...( (method === 'POST' || method === 'PUT' || method === 'DELETE') && body ? { 'Content-Type': 'application/json' } : {} ),
            'Cache-Control': 'no-cache' // Ensure fresh data
        }
    };

    // Add body for relevant methods
    if (body && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url.toString(), options);

        // Handle No Content response
        if (response.status === 204) {
            return null;
        }

        // Check for PDF response
        const contentType = response.headers.get('Content-Type');
        if (contentType?.includes('application/pdf')) {
            if (!response.ok) throw new Error(`PDF request failed! status: ${response.status}`);
            return response.blob();
        }

        // For other responses, try to parse JSON
        const text = await response.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch (e) {
            // Handle cases where backend might return non-JSON success message (e.g., plain text "OK")
            if (response.ok && text) {
                console.warn(`API endpoint ${endpoint} returned non-JSON text: ${text}`);
                return { success: true, message: text }; // Treat as success but maybe log/handle differently
            }
            throw new Error(`Failed to parse JSON response: ${e.message}`);
        }


        if (!response.ok) {
            // Use message from parsed JSON error body if available
            throw new Error(data.message || data.error || `HTTP error! status: ${response.status}`);
        }

        // For consistency, some backends might wrap data in { success: true, data: ... }
        // Return the core data directly if wrapped, otherwise return the whole object
        // Adjust this based on your backend's common response structure
        return data.success === true && data.data !== undefined ? data.data : data;

    } catch (error) {
        console.error(`API request failed: ${method} ${url.pathname}`, error);
        // Show user-friendly alert, but still throw for calling code to handle
        showCustomAlert(`操作失败: ${error.message}`);
        throw error;
    }
}
