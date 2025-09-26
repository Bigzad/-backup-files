/**
 * SIMPLE LOGGING SYSTEM
 * 
 * Provides controlled console logging without overriding native console methods
 * Reduces noise while preserving essential logging functionality
 */

(function() {
    // Determine log level from environment
    function getLogLevel() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlLogLevel = urlParams.get('loglevel') || urlParams.get('debug');
        if (urlLogLevel) {
            return urlLogLevel.toUpperCase();
        }
        
        // Check if it's a development environment
        const isDev = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.search.includes('debug=true');
        
        return isDev ? 'INFO' : 'ERROR';
    }
    
    const LOG_LEVELS = {
        SILENT: 0,
        ERROR: 1,
        WARN: 2,
        INFO: 3,
        DEBUG: 4
    };
    
    const currentLogLevel = LOG_LEVELS[getLogLevel()] || LOG_LEVELS.ERROR;
    
    // Helper function to check if should log
    function shouldLog(level) {
        return LOG_LEVELS[level] <= currentLogLevel;
    }
    
    // Create logging methods
    console.logError = function(...args) {
        if (shouldLog('ERROR')) {
            console.error(...args);
        }
    };
    
    console.logWarn = function(...args) {
        if (shouldLog('WARN')) {
            console.warn(...args);
        }
    };
    
    console.logInfo = function(...args) {
        if (shouldLog('INFO')) {
            console.log(...args);
        }
    };
    
    console.logDebug = function(...args) {
        if (shouldLog('DEBUG')) {
            console.log(...args);
        }
    };
    
    // Store current log level globally for other scripts to check
    window.currentLogLevel = getLogLevel();
    window.shouldLog = shouldLog;
    
    // Initialize message (only if INFO level or higher)
    if (shouldLog('INFO')) {
        console.log(`🎛️ Simple Logger initialized (Level: ${getLogLevel()})`);
    }
    
    // Utility functions
    window.setLogLevel = function(level) {
        // This is read-only in this implementation
        console.warn('Log level is determined by URL parameters or environment. Use ?loglevel=DEBUG in URL to change.');
    };
    
    window.enableDebugMode = function() {
        console.warn('Add ?loglevel=DEBUG to URL to enable debug mode');
    };
    
    window.enableSilentMode = function() {
        console.warn('Add ?loglevel=SILENT to URL to enable silent mode');
    };
    
    // Create a logger object for consistency
    window.logger = {
        error: function(...args) {
            if (shouldLog('ERROR')) {
                console.error(...args);
            }
        },
        warn: function(...args) {
            if (shouldLog('WARN')) {
                console.warn(...args);
            }
        },
        info: function(...args) {
            if (shouldLog('INFO')) {
                console.log(...args);
            }
        },
        debug: function(...args) {
            if (shouldLog('DEBUG')) {
                console.log(...args);
            }
        }
    };
})();