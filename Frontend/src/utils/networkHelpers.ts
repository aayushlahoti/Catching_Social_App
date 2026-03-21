/**
 * Network Helper Utilities for Cross-Network Development
 * Helps detect local IP and construct appropriate URLs for network access
 */

/**
 * Detects if the app is running on localhost or a network device
 * @returns {boolean} True if running on localhost
 */
export const isLocalhost = (): boolean => {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

/**
 * Gets the current hostname/IP from the browser
 * @returns {string} The hostname or IP the browser is accessing from
 */
export const getCurrentHost = (): string => {
  return window.location.hostname;
};

/**
 * Gets the port from the browser's current URL
 * @returns {string} The port number
 */
export const getCurrentPort = (): string => {
  return window.location.port;
};

/**
 * Constructs the server URL based on current host
 * If running from network IP, replaces frontend port with backend port
 * @param {number} backendPort - The backend server port (default: 8000)
 * @returns {string} The backend server URL
 */
export const getServerUrl = (backendPort: number = 8000): string => {
  const host = getCurrentHost();
  const protocol = window.location.protocol;
  
  // If we're on a local network IP or localhost, construct URL with backend port
  const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  if (isLocalhost() || ipRegex.test(host)) {
    return `${protocol}//${host}:${backendPort}`;
  }
  
  // For production domains (like onrender.com), skip the host/port to use relative paths
  // This is safer and avoids CORS/mixed-content issues
  return '';
};

/**
 * Constructs the socket URL for real-time connections
 * Socket connections need the full server URL without /api paths
 * @param {number} backendPort - The backend server port (default: 8000)
 * @returns {string} The socket server URL
 */
export const getSocketUrl = (backendPort: number = 8000): string => {
  const host = getCurrentHost();
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  // If we're on a local network IP or localhost, append the port
  const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  if (isLocalhost() || ipRegex.test(host)) {
    return `${protocol.replace(':', '')}//${host}:${backendPort}`;
  }

  // For production domains, use the current host relative to the browser
  return ''; 
};

/**
 * Logs network configuration for debugging
 */
export const logNetworkConfig = (): void => {
  console.log('🌐 Network Configuration:');
  console.log(`   Current Host: ${getCurrentHost()}`);
  console.log(`   Current Port: ${getCurrentPort()}`);
  console.log(`   Is Localhost: ${isLocalhost()}`);
  console.log(`   Server URL: ${getServerUrl()}`);
  console.log(`   Socket URL: ${getSocketUrl()}`);
};

/**
 * Gets API base URL for axios requests
 * @returns {string} The API base URL
 */
export const getApiBaseUrl = (): string => {
  const serverUrl = getServerUrl();
  return `${serverUrl}/api`;
};
