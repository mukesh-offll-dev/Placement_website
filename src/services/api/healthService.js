import axiosClient from './axiosClient.js';

/**
 * Health API Service
 * Maps to backend HealthController (/api/health)
 */

/**
 * Check backend service health status.
 * GET /api/health
 */
export const checkHealth = async () => {
  const response = await axiosClient.get('/health');
  return response.data;
};

const healthService = {
  checkHealth,
};

export default healthService;
