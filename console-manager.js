/**
 * CENTRALIZED CONSOLE MANAGER
 * 
 * Provides centralized control over console logging with configurable log levels
 * Reduces console noise while preserving important debugging information
 * 
 * Log Levels:
 * - SILENT: No logs (production mode)
 * - ERROR: Only errors and critical failures
 * - WARN: Warnings and errors
 * - INFO: General information, warnings, and errors
 * - DEBUG: All logs including debug information
 */

class ConsoleManager {
    constructor() {
        // Set default log level (can be overridden)
        this.logLevel = this.getLogLevelFromEnv() || 'ERROR';
        
        // Store original console methods
        this.originalConsole = {
            log: console.log.bind(console),
            info: console.info.bind(console),
            warn: console.warn.bind(console),
            error: console.error.bind(console),
            debug: console.debug.bind(console)
        };
        
        // Define log level hierarchy
        this.logLevels = {
            SILENT: 0,
            ERROR: 1,
            WARN: 2,
            INFO: 3,
            DEBUG: 4
        };
        
        // Initialize the system
        this.init();
    }
    
    /**
     * Determine log level from environment or URL parameters
     */
    getLogLevelFromEnv() {
        // Check URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        const urlLogLevel = urlParams.get('loglevel') || urlParams.get('debug');
        if (urlLogLevel) {
            return urlLogLevel.toUpperCase();
        }
        
        // Check if it's a development environment
        const isDev = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.search.includes('debug=true');
        
        // Default to ERROR for production, INFO for development
        return isDev ? 'INFO' : 'ERROR';
    }
    
    /**
     * Initialize the console management system
     */
    init() {
        // Create controlled logging methods
        this.setupControlledLogging();
        
        // Store reference globally
        window.consoleManager = this;
        
        // Log initialization (only if logging is enabled)
        if (this.shouldLog('INFO')) {
            this.originalConsole.info(`🎛️ Console Manager initialized (Level: ${this.logLevel})`);
        }
    }
    
    /**
     * Setup controlled logging methods
     */
    setupControlledLogging() {
        // Override console methods with controlled versions
        const originalConsole = this.originalConsole;
        
        console.log = (...args) => this.log('INFO', ...args);
        console.info = (...args) => this.log('INFO', ...args);
        console.warn = (...args) => this.log('WARN', ...args);
        console.error = (...args) => this.log('ERROR', ...args);
        console.debug = (...args) => this.log('DEBUG', ...args);
        
        // Add custom methods for explicit level logging with fallbacks
        console.logError = (...args) => {
            try {
                this.log('ERROR', ...args);
            } catch (e) {
                originalConsole.error(...args);
            }
        };
        console.logWarn = (...args) => {
            try {
                this.log('WARN', ...args);
            } catch (e) {
                originalConsole.warn(...args);
            }
        };
        console.logInfo = (...args) => {
            try {
                this.log('INFO', ...args);
            } catch (e) {
                originalConsole.log(...args);
            }
        };
        console.logDebug = (...args) => {
            try {
                this.log('DEBUG', ...args);
            } catch (e) {
                // Only output debug in development
                if (this.getLogLevelFromEnv() === 'DEBUG') {
                    originalConsole.log(...args);
                }
            }
        };
    }
    
    /**
     * Check if a log level should be output
     */
    shouldLog(level) {
        const currentLevel = this.logLevels[this.logLevel] || 1;
        const messageLevel = this.logLevels[level] || 1;
        return messageLevel <= currentLevel;
    }
    
    /**
     * Controlled logging method
     */
    log(level, ...args) {
        if (!this.shouldLog(level)) {
            return;
        }
        
        // Use original console method based on level
        switch (level) {
            case 'ERROR':
                this.originalConsole.error(...args);
                break;
            case 'WARN':
                this.originalConsole.warn(...args);
                break;
            case 'DEBUG':
                this.originalConsole.debug(...args);
                break;
            default:
                this.originalConsole.log(...args);
        }
    }
    
    /**
     * Set log level dynamically
     */
    setLogLevel(level) {
        const upperLevel = level.toUpperCase();
        if (this.logLevels.hasOwnProperty(upperLevel)) {
            this.logLevel = upperLevel;
            if (this.shouldLog('INFO')) {
                this.originalConsole.info(`🎛️ Log level changed to: ${this.logLevel}`);
            }
        } else {
            this.originalConsole.warn(`❌ Invalid log level: ${level}. Valid levels:`, Object.keys(this.logLevels));
        }
    }
    
    /**
     * Get current log level
     */
    getLogLevel() {
        return this.logLevel;
    }
    
    /**
     * Enable production mode (silent logging)
     */
    enableProductionMode() {
        this.setLogLevel('SILENT');
    }
    
    /**
     * Enable development mode (verbose logging)
     */
    enableDevelopmentMode() {
        this.setLogLevel('DEBUG');
    }
    
    /**
     * Restore original console methods
     */
    restore() {
        Object.assign(console, this.originalConsole);
        if (this.shouldLog('INFO')) {
            console.info('🎛️ Console Manager restored original console methods');
        }
    }
    
    /**
     * Create a namespaced logger for specific modules
     */
    createNamespacedLogger(namespace) {
        return {
            error: (...args) => this.log('ERROR', `[${namespace}]`, ...args),
            warn: (...args) => this.log('WARN', `[${namespace}]`, ...args),
            info: (...args) => this.log('INFO', `[${namespace}]`, ...args),
            debug: (...args) => this.log('DEBUG', `[${namespace}]`, ...args),
            log: (...args) => this.log('INFO', `[${namespace}]`, ...args)
        };
    }
}

// Initialize immediately with error handling
try {
    new ConsoleManager();
} catch (error) {
    console.error('Failed to initialize ConsoleManager:', error);
}

// Provide fallback methods if ConsoleManager fails
if (!console.logError) {
    console.logError = console.error.bind(console);
    console.logWarn = console.warn.bind(console);
    console.logInfo = console.log.bind(console);
    console.logDebug = () => {}; // Silent in production
}

// Expose utility functions globally
window.setLogLevel = (level) => window.consoleManager?.setLogLevel(level);
window.getLogLevel = () => window.consoleManager?.getLogLevel();
window.enableProductionMode = () => window.consoleManager?.enableProductionMode();
window.enableDevelopmentMode = () => window.consoleManager?.enableDevelopmentMode();

// Add URL parameter instructions to help
if (window.consoleManager?.shouldLog('INFO')) {
    console.info('💡 Log Level Control:');
    console.info('   - Add ?loglevel=DEBUG to URL for verbose logging');
    console.info('   - Add ?loglevel=ERROR to URL for minimal logging');
    console.info('   - Add ?loglevel=SILENT to URL for no logging');
    console.info('   - Use setLogLevel("LEVEL") in console to change dynamically');
}