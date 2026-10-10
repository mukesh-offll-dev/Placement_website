export { default as axiosClient, API_BASE_URL, TOKEN_KEY, USER_KEY } from './axiosClient.js';
export { default as authService } from './authService.js';
export { default as studentService } from './studentService.js';
export { default as projectService } from './projectService.js';
export { default as adminService } from './adminService.js';
export { default as healthService } from './healthService.js';
export { default as fileService } from './fileService.js';
export { default as notificationService } from './notificationService.js';

// Re-export named methods for direct imports
export * from './authService.js';
export * from './studentService.js';
export * from './projectService.js';
export * from './adminService.js';
export * from './healthService.js';
export * from './fileService.js';
export * from './notificationService.js';
