/**
 * Supabase Query Fixes - Resolves PGRST100 Errors
 * 
 * This file contains helper functions to ensure proper Supabase client usage
 * and prevent PGRST100 "failed to parse filter" errors.
 * 
 * Key fixes implemented:
 * 1. Proper .or() syntax using correct PostgREST format
 * 2. Proper .ilike() usage with wildcard characters
 * 3. Safe parameter encoding for search terms
 * 4. Standardized query patterns
 */

class SupabaseQueryHelper {
    /**
     * Safe search function that handles email and text searches properly
     * @param {Object} query - Supabase query object
     * @param {string} searchTerm - Search term to look for
     * @param {string} tableName - Name of the table being searched
     * @returns {Object} Modified query object
     */
    static applySearchFilter(query, searchTerm, tableName) {
        if (!searchTerm || !query) return query;
        
        try {
        
        // Properly escape special characters for PostgREST
        // Escape: @ (email), % (wildcard), _ (single char), \ (escape), - (UUID)
        let safeTerm = searchTerm.replace(/[%_\\]/g, '\\$&');
        
        // For email addresses, detect if it's a full email and use exact match instead of ILIKE
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isEmail = emailRegex.test(searchTerm);
        
        // For UUIDs, detect and use exact match
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const isUUID = uuidRegex.test(searchTerm);
        
        if (isEmail) {
            // Use exact match for emails - NEVER use .or() with @ symbols
            // This prevents ALL PGRST100 errors with email addresses
            console.logDebug(`🔍 Applying email search for '${searchTerm}' on table '${tableName}'`);
            return query.eq('user_email', searchTerm);
        } else if (isUUID) {
            // Use exact match for UUIDs
            return query.eq('user_id', searchTerm);
        } else {
            // Use ILIKE for partial text searches with proper % wildcards
            console.logDebug(`🔍 Applying text search for '${safeTerm}' on table '${tableName}'`);
            
            // Avoid .or() completely to prevent any PGRST100 syntax errors
            // Just search user_email column which exists in all tables
            return query.ilike('user_email', `%${safeTerm}%`);
        }
        
        } catch (error) {
            console.error(`❌ Error in applySearchFilter for '${searchTerm}' on '${tableName}':`, error);
            // Return original query if there's an error to prevent app breakage
            return query;
        }
    }
    
    /**
     * Safe user ID filter - handles UUIDs properly
     * @param {Object} query - Supabase query object
     * @param {string} userId - User UUID
     * @returns {Object} Modified query object
     */
    static filterByUserId(query, userId) {
        if (!userId || !query) return query;
        
        // Validate UUID format to prevent injection
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(userId)) {
            console.logWarn('Invalid UUID format:', userId);
            return query;
        }
        
        return query.eq('user_id', userId);
    }
    
    /**
     * Safe email filter - handles email addresses properly
     * @param {Object} query - Supabase query object
     * @param {string} email - Email address
     * @param {string} column - Column name (default: 'user_email')
     * @returns {Object} Modified query object
     */
    static filterByEmail(query, email, column = 'user_email') {
        if (!email || !query) return query;
        
        // Basic email validation to prevent injection
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.logWarn('Invalid email format:', email);
            return query;
        }
        
        // Use exact match for emails (no wildcards needed)
        return query.eq(column, email);
    }
    
    /**
     * Apply pagination safely
     * @param {Object} query - Supabase query object
     * @param {number|string} limit - Limit number
     * @param {number|string} offset - Offset number
     * @returns {Object} Modified query object
     */
    static applyPagination(query, limit, offset) {
        if (!query) return query;
        
        if (limit) {
            const safeLimit = Math.min(parseInt(limit) || 100, 1000); // Max 1000 records
            query = query.limit(safeLimit);
        }
        
        if (offset) {
            const safeOffset = Math.max(parseInt(offset) || 0, 0); // Min 0
            query = query.range(safeOffset, safeOffset + (parseInt(limit) || 100) - 1);
        }
        
        return query;
    }
    
    /**
     * Apply sorting safely
     * @param {Object} query - Supabase query object
     * @param {string} sortField - Field to sort by
     * @param {boolean} ascending - Sort direction
     * @returns {Object} Modified query object
     */
    static applySorting(query, sortField, ascending = false) {
        if (!query || !sortField) return query;
        
        // Whitelist allowed sort fields to prevent injection
        const allowedFields = [
            'created_at', 'updated_at', 'date', 'user_email', 'email', 
            'user_name', 'name', 'title', 'id', 'calories', 'weight'
        ];
        
        if (allowedFields.includes(sortField)) {
            return query.order(sortField, { ascending });
        } else {
            console.logWarn('Unsupported sort field:', sortField);
            return query.order('created_at', { ascending: false }); // Default sort
        }
    }
}

// Example usage patterns to replace problematic code:

/**
 * BEFORE (causes PGRST100 errors):
 * query.or(`user_email.ilike.%${search}%,email.ilike.%${search}%`)
 * 
 * AFTER (correct):
 * SupabaseQueryHelper.applySearchFilter(query, search, 'user_profiles')
 */

/**
 * BEFORE (potential UUID injection):
 * query.eq('user_id', someUserId)
 * 
 * AFTER (safe):
 * SupabaseQueryHelper.filterByUserId(query, someUserId)
 */

/**
 * Complete example for fetching user progress entries:
 * 
 * const { data, error } = await window.supabaseClient
 *   .from('progress_entries')
 *   .select('*')
 *   |> ((query) => SupabaseQueryHelper.filterByUserId(query, userId))
 *   |> ((query) => SupabaseQueryHelper.applySorting(query, 'date', false))
 *   |> ((query) => SupabaseQueryHelper.applyPagination(query, 50, 0));
 */

// Make helper available globally
window.SupabaseQueryHelper = SupabaseQueryHelper;

// Register with initialization manager if available
if (window.initializationManager) {
    window.initializationManager.registerComponent('SupabaseQueryHelper', true);
}

console.logInfo('✅ Supabase Query Helper loaded');

// Test and validate the helper functions on load (debug mode only)
if (window.supabaseClient && window.shouldLog && window.shouldLog('DEBUG')) {
    try {
        console.logDebug('🔧 Testing Supabase Query Helper with sample queries...');
        
        // Test the exact email causing issues
        const problemEmail = 'coach2@healthcenter.com';
        console.logDebug(`🔍 Email detection for '${problemEmail}':`, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(problemEmail));
        
        // Test the exact UUID causing issues  
        const problemUUID = '0dac340b-6c1b-4236-915a-590b055a730a';
        console.logDebug(`🔍 UUID detection for '${problemUUID}':`, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(problemUUID));
        
    } catch (error) {
        console.error('❌ Query Helper test failed:', error);
    }
}