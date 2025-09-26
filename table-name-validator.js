/**
 * Table Name Validator - Prevents "relation does not exist" errors
 * 
 * This helper validates table names against the actual schema to prevent
 * PGRST116 "relation does not exist" errors.
 */

class TableNameValidator {
    constructor() {
        // Define the correct table names as per the database schema
        this.validTables = {
            // Core user and profile tables
            'user_profiles': true,
            // 'anonymous_profiles': true, // Removed - not needed for invite-only system
            'user_preferences': true,
            'user_roles': true,
            
            // Invitation and code tables  
            'invite_codes': true,           // CORRECT - not 'invitation_codes'
            'invite_code_redemptions': true,
            
            // Nutrition and meal tables
            'daily_meals': true,
            'daily_targets': true,
            'meal_plans': true,
            'custom_recipes': true,
            
            // Progress and tracking tables
            'progress_entries': true,
            'progress_goals': true,
            'macro_history': true,
            'macro_calculations': true,
            
            // Role management (optional - may not exist)
            'roles': false  // Mark as optional since it may not exist
        };
        
        // Common incorrect names and their correct replacements
        this.corrections = {
            'invitation_codes': 'invite_codes',
            'users': 'user_profiles',
            'coaching_sessions': null, // No equivalent - needs to be created or removed
            'sessions': null          // No equivalent - needs to be created or removed
        };
    }
    
    /**
     * Validate and correct table name
     * @param {string} tableName - Table name to validate
     * @returns {Object} {valid: boolean, correctedName: string|null, suggestion: string}
     */
    validateTableName(tableName) {
        if (!tableName) {
            return { valid: false, correctedName: null, suggestion: 'Table name cannot be empty' };
        }
        
        // Check if table name is directly valid
        if (this.validTables[tableName] === true) {
            return { valid: true, correctedName: tableName, suggestion: null };
        }
        
        // Check if table name is optional (may not exist)
        if (this.validTables[tableName] === false) {
            return { valid: false, correctedName: tableName, suggestion: `Table '${tableName}' is optional and may not exist. Consider adding error handling.` };
        }
        
        // Check if there's a known correction
        if (this.corrections[tableName]) {
            return { 
                valid: false, 
                correctedName: this.corrections[tableName], 
                suggestion: `Replace '${tableName}' with '${this.corrections[tableName]}'` 
            };
        }
        
        // Check if it needs to be removed
        if (this.corrections[tableName] === null) {
            return { 
                valid: false, 
                correctedName: null, 
                suggestion: `Table '${tableName}' does not exist in schema. Consider removing this reference or creating the table.` 
            };
        }
        
        // Unknown table name
        return { 
            valid: false, 
            correctedName: null, 
            suggestion: `Unknown table '${tableName}'. Check schema or add to validator.` 
        };
    }
    
    /**
     * Safe Supabase query wrapper that validates table names
     * @param {string} tableName - Table name to query
     * @returns {Object} Supabase query object or error info
     */
    safeFrom(tableName) {
        const validation = this.validateTableName(tableName);
        
        if (validation.valid) {
            return window.supabaseClient.from(tableName);
        } else if (validation.correctedName && validation.correctedName !== tableName) {
            console.logWarn(`⚠️ Table name corrected: '${tableName}' → '${validation.correctedName}'`);
            return window.supabaseClient.from(validation.correctedName);
        } else {
            console.error(`❌ Invalid table name: ${validation.suggestion}`);
            throw new Error(`Invalid table name '${tableName}': ${validation.suggestion}`);
        }
    }
    
    /**
     * Get all valid table names
     * @returns {Array} List of valid table names
     */
    getValidTables() {
        return Object.keys(this.validTables).filter(table => this.validTables[table] === true);
    }
    
    /**
     * Get all optional table names
     * @returns {Array} List of optional table names
     */
    getOptionalTables() {
        return Object.keys(this.validTables).filter(table => this.validTables[table] === false);
    }
    
    /**
     * Validate multiple table names in a query
     * @param {Array} tableNames - Array of table names to validate
     * @returns {Object} Validation results
     */
    validateMultiple(tableNames) {
        const results = {
            valid: [],
            invalid: [],
            corrections: []
        };
        
        tableNames.forEach(tableName => {
            const validation = this.validateTableName(tableName);
            if (validation.valid) {
                results.valid.push(tableName);
            } else {
                results.invalid.push({
                    original: tableName,
                    suggestion: validation.suggestion,
                    corrected: validation.correctedName
                });
                
                if (validation.correctedName && validation.correctedName !== tableName) {
                    results.corrections.push({
                        from: tableName,
                        to: validation.correctedName
                    });
                }
            }
        });
        
        return results;
    }
}

// Create global instance
window.tableValidator = new TableNameValidator();

// Add convenience function to window
window.safeFrom = function(tableName) {
    return window.tableValidator.safeFrom(tableName);
};

// Register with initialization manager if available
if (window.initializationManager) {
    window.initializationManager.registerComponent('TableNameValidator', true);
}

console.logInfo('✅ Table Name Validator loaded');
if (window.shouldLog && window.shouldLog('DEBUG')) {
    console.logDebug('📋 Valid tables:', window.tableValidator.getValidTables());
    console.logDebug('⚠️ Optional tables:', window.tableValidator.getOptionalTables());
}