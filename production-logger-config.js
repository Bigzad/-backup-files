/**
 * PRODUCTION LOGGING CONFIGURATION
 * 
 * Provides ultra-minimal logging for production environments
 * Include this script in production builds for minimal console noise
 * 
 * Usage: Add this script tag in production HTML files:
 * <script src="production-logger-config.js"></script>
 */

(function() {
    'use strict';
    
    // Force production logging level
    const PRODUCTION_LOG_LEVEL = 'ERROR'; // Change to 'SILENT' for zero logs
    
    const LOG_LEVELS = {
        SILENT: 0,
        ERROR: 1,
        WARN: 2,
        INFO: 3,
        DEBUG: 4
    };
    
    const currentLogLevel = LOG_LEVELS[PRODUCTION_LOG_LEVEL] || LOG_LEVELS.ERROR;
    
    // Helper function to check if should log
    function shouldLog(level) {
        return LOG_LEVELS[level] <= currentLogLevel;
    }
    
    // Store original console methods for critical errors only
    const originalConsole = {
        error: console.error.bind(console),
        warn: console.warn.bind(console),
        log: console.log.bind(console),
        info: console.info.bind(console),
        debug: console.debug.bind(console)
    };
    
    // Create production-optimized logging methods
    console.logError = function(...args) {
        if (shouldLog('ERROR')) {
            originalConsole.error(...args);
        }
    };
    
    console.logWarn = function(...args) {
        if (shouldLog('WARN')) {
            originalConsole.warn(...args);
        }
    };
    
    console.logInfo = function(...args) {
        if (shouldLog('INFO')) {
            originalConsole.log(...args);
        }
    };
    
    console.logDebug = function(...args) {
        // Debug logs are completely disabled in production
        return;
    };
    
    // Override default console methods for production
    if (PRODUCTION_LOG_LEVEL === 'SILENT') {
        // Completely silent mode - no logs at all
        console.log = () => {};
        console.info = () => {};
        console.warn = () => {};
        console.debug = () => {};
        // Keep console.error for critical issues only
    } else if (PRODUCTION_LOG_LEVEL === 'ERROR') {
        // Error-only mode
        console.log = () => {};
        console.info = () => {};
        console.debug = () => {};
        // Keep console.warn and console.error
    }
    
    // Store configuration globally
    window.currentLogLevel = PRODUCTION_LOG_LEVEL;
    window.shouldLog = shouldLog;
    window.isProductionLogging = true;
    
    // Utility functions for runtime control
    window.enableSilentMode = function() {
        console.log('Production logging is controlled by production-logger-config.js');
        console.log('Edit PRODUCTION_LOG_LEVEL in the script to change logging behavior');
    };
    
    window.setLogLevel = function(level) {
        console.log('Production logging level is fixed. Edit production-logger-config.js to change.');
    };
    
    // Silent initialization (no log message in production)
    if (shouldLog('ERROR')) {
        console.error('🏭 Production Logger active (Level: ' + PRODUCTION_LOG_LEVEL + ')');
    }
    
})();