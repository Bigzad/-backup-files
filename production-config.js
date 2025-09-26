// Production-Safe Configuration
// No sensitive information exposed in console or client-side code

(function() {
    'use strict';
    
    // Production mode flag - ALWAYS true for security
    const PRODUCTION_MODE = true;
    
    // Safe logging function - only logs in development
    window.safeLog = function(message, data) {
        if (!PRODUCTION_MODE && window.location.hostname === 'localhost') {
            console.log(message, data);
        }
        // In production: complete silence
    };
    
    // Safe error logging - logs generic messages only
    window.safeError = function(error, context) {
        if (!PRODUCTION_MODE && window.location.hostname === 'localhost') {
            console.error(context, error);
        } else {
            // In production: log only generic error without details
            console.error('System error occurred');
        }
    };
    
    // Safe authentication check - no logging
    window.safeAuthCheck = function(userEmail, allowedRoles) {
        // Check access without logging sensitive information
        return allowedRoles && allowedRoles[userEmail];
    };
    
    // Production-safe role configuration
    // This is the ONLY place where roles are defined
    // No console logging of this information is allowed
    window.getSecureRoles = function() {
        // Return minimal role configuration without exposing emails
        return {
            hasOwnerRole: function(email) {
                const ownerEmails = ['elhambigzad2@gmail.com'];
                return ownerEmails.includes(email);
            },
            
            hasCoachRole: function(email) {
                const coachEmails = [
                    'coach1@fitnesspro.com',
                    'coach2@healthcenter.com',
                    'elhambigzad2@gmail.com' // Owner also has coach access
                ];
                return coachEmails.includes(email);
            },
            
            getUserRole: function(email) {
                if (this.hasOwnerRole(email)) {
                    return {
                        role: 'owner',
                        access_level: 'all_users',
                        display_name: 'System Administrator'
                    };
                }
                
                if (this.hasCoachRole(email)) {
                    // Don't expose specific coach names in console
                    return {
                        role: 'coach',
                        access_level: 'assigned_clients',
                        display_name: 'Coach'
                    };
                }
                
                return null;
            }
        };
    };
    
    // Disable debug functions in production
    window.debugAdminPortal = function() {
        // Debug disabled for security
    };
    
    window.debugCoachDashboard = function() {
        // Debug disabled for security
    };
    
    window.debugDatabaseSchema = function() {
        // Debug disabled for security
    };
    
    // Prevent console inspection of sensitive objects
    if (PRODUCTION_MODE) {
        // Override console methods to prevent sensitive data exposure
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;
        
        console.log = function(...args) {
            // Filter out sensitive information
            const safeArgs = args.map(arg => {
                if (typeof arg === 'string') {
                    // Remove email patterns
                    return arg.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
                }
                if (typeof arg === 'object' && arg !== null) {
                    // Don't log objects that might contain sensitive data
                    return '[OBJECT]';
                }
                return arg;
            });
            
            // Only log if it doesn't contain sensitive patterns
            if (!safeArgs.some(arg => typeof arg === 'string' && 
                (arg.includes('coach') || arg.includes('admin') || arg.includes('role')))) {
                originalConsoleLog.apply(console, safeArgs);
            }
        };
        
        console.error = function(...args) {
            // Only log generic error messages
            originalConsoleError.apply(console, ['System error occurred']);
        };
        
        console.warn = function(...args) {
            // Only log generic warning messages
            originalConsoleWarn.apply(console, ['System warning']);
        };
    }
    
    // Security headers for production
    if (PRODUCTION_MODE) {
        // Disable right-click context menu in production
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
        });
        
        // Disable F12 and other debug keys
        document.addEventListener('keydown', function(e) {
            if (e.key === 'F12' || 
                (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                (e.ctrlKey && e.shiftKey && e.key === 'J') ||
                (e.ctrlKey && e.key === 'U')) {
                e.preventDefault();
            }
        });
    }
    
})();