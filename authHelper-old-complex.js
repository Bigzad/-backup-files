/**
 * AUTH HELPER - UUID-based Authentication
 * 
 * Provides centralized authentication helpers for the new UUID-based schema.
 * Handles both authenticated users (user_id) and anonymous users (anon_profile_id).
 */

// Auth Helper uses global Supabase client (window.supabaseClient)
// All functions are attached to window.authHelper for browser compatibility

// Session-level flags to prevent error spam
window.authTimeoutLogged = false;
window.authErrorCount = 0;

/**
 * Get current authenticated user ID
 * @returns {Promise<string|null>} User UUID or null if not authenticated
 */
async function getCurrentUserId() {
    try {
        // Check if supabase client is available
        if (!window.supabaseClient) {
            console.logWarn('Supabase client not available');
            return null;
        }

        // Enhanced authentication check with timeout and better error handling
        const authPromise = window.supabaseClient.auth.getUser();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Authentication timeout')), 5000) // Reduced timeout
        );

        try {
            const { data, error } = await Promise.race([authPromise, timeoutPromise]);
            
            if (error) {
                console.logWarn('Error getting current user:', error.message);
                
                // Log to enhanced error handler if available (but only once per session)
                if (window.errorHandler && !window.authTimeoutLogged) {
                    window.errorHandler.logError('AUTH_GET_USER', error, 'medium');
                    window.authTimeoutLogged = true; // Prevent spam
                }
                return null;
            }
            
            const user = data?.user ?? null;
            return user?.id ?? null;
        } catch (timeoutError) {
            // Handle timeout specifically without excessive logging
            if (timeoutError.message.includes('timeout')) {
                console.logDebug('Authentication timeout - using anonymous mode');
                
                // Only log timeout error once per session to prevent spam
                if (window.errorHandler && !window.authTimeoutLogged) {
                    window.errorHandler.logError('AUTH_TIMEOUT', timeoutError, 'low');
                    window.authTimeoutLogged = true;
                }
                return null;
            }
            throw timeoutError; // Re-throw non-timeout errors
        }

        const user = data?.user ?? null;
        return user?.id ?? null;
    } catch (error) {
        // Only log non-timeout errors to reduce console spam
        if (!error.message.includes('timeout')) {
            console.logError('Error in getCurrentUserId:', error);
            
            // Log to enhanced error handler if available
            if (window.errorHandler) {
                window.errorHandler.logError('AUTH_GET_USER_ID', error, 'high');
            }
        }
        return null;
    }
}

/**
 * Get current user identifier for database operations
 * Returns user_id for authenticated users or anon_profile_id for anonymous users
 * @returns {Promise<{user_id: string|null, anon_profile_id: string|null}>}
 */
async function getCurrentUserIdentifier() {
    try {
        // Simplified for invite-only system - only handle authenticated users
        const userId = await getCurrentUserId();
        
        if (userId) {
            // Authenticated user
            return {
                user_id: userId,
                is_authenticated: true
            };
        } else {
            // Not authenticated - redirect to login (invite-only system)
            console.logWarn('User not authenticated - redirecting to login');
            return {
                user_id: null,
                is_authenticated: false,
                requires_login: true
            };
        }
    } catch (error) {
        console.logError('Error in getCurrentUserIdentifier:', error);
        
        // Log to enhanced error handler if available
        if (window.errorHandler) {
            window.errorHandler.logError('AUTH_GET_IDENTIFIER', error, 'high');
        }
        
        return {
            user_id: null,
            is_authenticated: false,
            requires_login: true
        };
    }
}

/**
 * Get or create anonymous profile for guest users
 * @returns {Promise<string|null>} Anonymous profile UUID
 */
// REMOVED: Anonymous profile functions not needed for invite-only system
// async function getOrCreateAnonymousProfile() {
    try {
        // Use enhanced localStorage if available
        const getStoredId = () => {
            return window.enhancedDB?.enhancedLocalStorage?.getItem 
                ? window.enhancedDB.enhancedLocalStorage.getItem('anon_profile_id', null, false)
                : localStorage.getItem('anon_profile_id');
        };
        
        const setStoredId = (id) => {
            return window.enhancedDB?.enhancedLocalStorage?.setItem 
                ? window.enhancedDB.enhancedLocalStorage.setItem('anon_profile_id', id, false)
                : localStorage.setItem('anon_profile_id', id);
        };
        
        const removeStoredId = () => {
            return window.enhancedDB?.enhancedLocalStorage?.removeItem 
                ? window.enhancedDB.enhancedLocalStorage.removeItem('anon_profile_id')
                : localStorage.removeItem('anon_profile_id');
        };
        
        let anonProfileId = getStoredId();
        
        if (anonProfileId) {
            // Verify the profile still exists in the database with enhanced error handling
            if (window.enhancedDB?.enhancedSupabaseOperation) {
                const result = await window.enhancedDB.enhancedSupabaseOperation(
                    () => window.supabaseClient
                        .from('anonymous_profiles')
                        .select('id')
                        .eq('id', anonProfileId)
                        .single(),
                    'verify anonymous profile',
                    { timeout: 5000, showError: false }
                );
                
                if (result.success && result.data) {
                    return anonProfileId;
                } else {
                    // Profile doesn't exist anymore, remove from localStorage
                    removeStoredId();
                }
            } else {
                // Fallback to original method
                const { data, error } = await window.supabaseClient
                    .from('anonymous_profiles')
                    .select('id')
                    .eq('id', anonProfileId)
                    .single();
                
                if (!error && data) {
                    return anonProfileId;
                } else {
                    removeStoredId();
                }
            }
        }
        
        // Create new anonymous profile with enhanced error handling
        if (window.enhancedDB?.enhancedSupabaseOperation) {
            // Try with expires_at first, then fallback to minimal profile if column missing
            let result = await window.enhancedDB.enhancedSupabaseOperation(
                () => window.supabaseClient
                    .from('anonymous_profiles')
                    .insert([{
                        display_name: 'Guest User',
                        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
                    }])
                    .select('id')
                    .single(),
                'create anonymous profile with expires_at',
                { timeout: 10000, showError: false, retryAttempts: 1 }
            );
            
            // If expires_at column doesn't exist, try minimal profile
            if (!result.success && result.error?.message?.includes('expires_at')) {
                console.logDebug('⚠️ expires_at column not found, trying minimal anonymous profile...');
                result = await window.enhancedDB.enhancedSupabaseOperation(
                    () => window.supabaseClient
                        .from('anonymous_profiles')
                        .insert([{
                            display_name: 'Guest User'
                        }])
                        .select('id')
                        .single(),
                    'create minimal anonymous profile',
                    { timeout: 10000, showError: false, retryAttempts: 2 }
                );
            }
            
            // If still failing, try with just empty object
            if (!result.success) {
                console.logDebug('⚠️ Trying empty anonymous profile...');
                result = await window.enhancedDB.enhancedSupabaseOperation(
                    () => window.supabaseClient
                        .from('anonymous_profiles')
                        .insert([{}])
                        .select('id')
                        .single(),
                    'create empty anonymous profile',
                    { timeout: 10000, showError: true, retryAttempts: 1 }
                );
            }
            
            if (result.success && result.data?.id) {
                anonProfileId = result.data.id;
                setStoredId(anonProfileId);
                
                // Log to enhanced error handler if available
                if (window.errorHandler) {
                    window.errorHandler.logInfo('AUTH_ANON_PROFILE_CREATED', `Created anonymous profile: ${anonProfileId}`);
                }
                
                console.logDebug('✅ Created new anonymous profile:', anonProfileId);
                return anonProfileId;
            } else {
                // Log the failure
                if (window.errorHandler) {
                    window.errorHandler.logError('AUTH_ANON_PROFILE_CREATE_FAILED', 
                        result.error || new Error('Failed to create anonymous profile'), 'high');
                }
                
                console.error('❌ Enhanced operation failed to create anonymous profile:', result.error);
                // Fall through to try legacy method
            }
        }
        
        // Fallback to original Supabase method with schema-aware approach
        let data, error;
        
        // Try with expires_at field first
        try {
            const result = await window.supabaseClient
                .from('anonymous_profiles')
                .insert([{
                    display_name: 'Guest User',
                    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                }])
                .select('id')
                .single();
            data = result.data;
            error = result.error;
        } catch (insertError) {
            error = insertError;
        }
        
        // If expires_at column doesn't exist, try minimal profile
        if (error?.message?.includes('expires_at')) {
            console.logDebug('⚠️ Fallback: expires_at column not found, trying minimal profile...');
            try {
                const result = await window.supabaseClient
                    .from('anonymous_profiles')
                    .insert([{
                        display_name: 'Guest User'
                    }])
                    .select('id')
                    .single();
                data = result.data;
                error = result.error;
            } catch (insertError) {
                error = insertError;
            }
        }
        
        // Last resort: try with empty object
        if (error && !data) {
            console.logDebug('⚠️ Fallback: trying empty anonymous profile...');
            try {
                const result = await window.supabaseClient
                    .from('anonymous_profiles')
                    .insert([{}])
                    .select('id')
                    .single();
                data = result.data;
                error = result.error;
            } catch (insertError) {
                error = insertError;
            }
        }
        
        if (error) {
            console.error('❌ Error creating anonymous profile:', error);
            
            // Log to enhanced error handler if available
            if (window.errorHandler) {
                window.errorHandler.logError('AUTH_ANON_PROFILE_SUPABASE_FAILED', error, 'high');
            }
            
            // Don't return null yet, let it fall through to RESTful API fallback
            throw error;
        }
        
        if (data?.id) {
            anonProfileId = data.id;
            setStoredId(anonProfileId);
            
            // Log success
            if (window.errorHandler) {
                window.errorHandler.logInfo('AUTH_ANON_PROFILE_FALLBACK_CREATED', `Created anonymous profile via fallback: ${anonProfileId}`);
            }
            
            console.logDebug('✅ Created new anonymous profile (fallback):', anonProfileId);
            return anonProfileId;
        }
        
    } catch (error) {
        console.error('❌ Supabase anonymous profile operation failed:', error);
        
        // Log to enhanced error handler
        if (window.errorHandler) {
            window.errorHandler.logError('AUTH_ANON_PROFILE_SUPABASE_OPERATION_FAILED', error, 'high');
        }
        
        // Try RESTful API fallback with enhanced error handling
        try {
            console.logDebug('🔄 Attempting RESTful API fallback for anonymous profiles...');
            
            // Check if we already have an anonymous profile stored
            let anonProfileId;
            if (window.enhancedDB?.enhancedLocalStorage?.getItem) {
                anonProfileId = window.enhancedDB.enhancedLocalStorage.getItem('anon_profile_id', null, false);
            } else {
                anonProfileId = localStorage.getItem('anon_profile_id');
            }
            
            if (anonProfileId) {
                // Use enhanced network operation if available
                if (window.enhancedDB?.enhancedNetworkOperation) {
                    const verifyResult = await window.enhancedDB.enhancedNetworkOperation(
                        () => fetch(`tables/anonymous_profiles/${anonProfileId}`),
                        'verify anonymous profile via REST API',
                        { timeout: 5000, showError: false }
                    );
                    
                    if (verifyResult.success && verifyResult.data.ok) {
                        const profileData = await window.enhancedDB.safeJSONParse(
                            await verifyResult.data.text(),
                            { fallback: null, context: 'anonymous profile verification' }
                        );
                        
                        if (profileData) {
                            console.logDebug('✅ Anonymous profile verified via enhanced RESTful API:', anonProfileId);
                            return anonProfileId;
                        }
                    } else if (verifyResult.data?.status === 404) {
                        // Profile doesn't exist anymore, remove from storage
                        if (window.enhancedDB?.enhancedLocalStorage?.removeItem) {
                            window.enhancedDB.enhancedLocalStorage.removeItem('anon_profile_id');
                        } else {
                            localStorage.removeItem('anon_profile_id');
                        }
                        console.log('⚠️ Anonymous profile not found, removed from storage');
                    }
                } else {
                    // Fallback to regular fetch
                    const checkResponse = await fetch(`tables/anonymous_profiles/${anonProfileId}`);
                    
                    if (checkResponse.ok) {
                        const profileData = await checkResponse.json();
                        if (profileData) {
                            console.log('✅ Anonymous profile verified via RESTful API:', anonProfileId);
                            return anonProfileId;
                        }
                    } else if (checkResponse.status === 404) {
                        // Profile doesn't exist anymore, remove from localStorage
                        if (window.enhancedDB?.enhancedLocalStorage?.removeItem) {
                            window.enhancedDB.enhancedLocalStorage.removeItem('anon_profile_id');
                        } else {
                            localStorage.removeItem('anon_profile_id');
                        }
                        console.log('⚠️ Anonymous profile not found, removed from storage');
                    }
                }
            }
            
            // Create new anonymous profile via RESTful API with enhanced error handling
            // Try different profile formats to handle schema differences
            const profileDataOptions = [
                {
                    display_name: 'Guest User',
                    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    display_name: 'Guest User'
                },
                {}
            ];
            
            if (window.enhancedDB?.enhancedNetworkOperation) {
                // Try each profile format until one works
                for (let i = 0; i < profileDataOptions.length; i++) {
                    const profileData = profileDataOptions[i];
                    const formatDesc = i === 0 ? 'with expires_at' : i === 1 ? 'minimal' : 'empty';
                    
                    try {
                        const createResult = await window.enhancedDB.enhancedNetworkOperation(
                            () => fetch('tables/anonymous_profiles', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(profileData)
                            }),
                            `create anonymous profile via REST API (${formatDesc})`,
                            { timeout: 10000, showError: false, retryAttempts: 1 }
                        );
                        
                        if (createResult.success && createResult.data.ok) {
                            const newProfile = await window.enhancedDB.safeJSONParse(
                                await createResult.data.text(),
                                { fallback: null, context: 'anonymous profile creation' }
                            );
                            
                            if (newProfile?.id) {
                                anonProfileId = newProfile.id;
                                if (window.enhancedDB?.enhancedLocalStorage?.setItem) {
                                    window.enhancedDB.enhancedLocalStorage.setItem('anon_profile_id', anonProfileId, false);
                                } else {
                                    localStorage.setItem('anon_profile_id', anonProfileId);
                                }
                                
                                // Log success
                                if (window.errorHandler) {
                                    window.errorHandler.logInfo('AUTH_ANON_PROFILE_REST_CREATED', `Created anonymous profile via REST API (${formatDesc}): ${anonProfileId}`);
                                }
                                
                                console.log(`✅ Created new anonymous profile via enhanced RESTful API (${formatDesc}):`, anonProfileId);
                                return anonProfileId;
                            }
                        } else if (i === profileDataOptions.length - 1) {
                            // Only throw error on the last attempt
                            throw new Error(`Enhanced RESTful API failed: ${createResult.error?.message || 'Unknown error'}`);
                        } else {
                            console.log(`⚠️ Profile format ${formatDesc} failed, trying next format...`);
                        }
                    } catch (formatError) {
                        if (i === profileDataOptions.length - 1) {
                            throw formatError;
                        }
                        console.log(`⚠️ Profile format ${formatDesc} failed, trying next format...`);
                    }
                }
            } else {
                // Fallback to regular fetch - try each format
                for (let i = 0; i < profileDataOptions.length; i++) {
                    const profileData = profileDataOptions[i];
                    const formatDesc = i === 0 ? 'with expires_at' : i === 1 ? 'minimal' : 'empty';
                    
                    try {
                        const createResponse = await fetch('tables/anonymous_profiles', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(profileData)
                        });
                        
                        if (createResponse.ok) {
                            const newProfile = await createResponse.json();
                            if (newProfile?.id) {
                                anonProfileId = newProfile.id;
                                if (window.enhancedDB?.enhancedLocalStorage?.setItem) {
                                    window.enhancedDB.enhancedLocalStorage.setItem('anon_profile_id', anonProfileId, false);
                                } else {
                                    localStorage.setItem('anon_profile_id', anonProfileId);
                                }
                                
                                // Log success
                                if (window.errorHandler) {
                                    window.errorHandler.logInfo('AUTH_ANON_PROFILE_REST_FALLBACK_CREATED', `Created anonymous profile via REST API fallback (${formatDesc}): ${anonProfileId}`);
                                }
                                
                                console.log(`✅ Created new anonymous profile via RESTful API fallback (${formatDesc}):`, anonProfileId);
                                return anonProfileId;
                            }
                        } else if (i === profileDataOptions.length - 1) {
                            throw new Error(`RESTful API failed with status ${createResponse.status}`);
                        } else {
                            console.log(`⚠️ REST API format ${formatDesc} failed with status ${createResponse.status}, trying next format...`);
                        }
                    } catch (formatError) {
                        if (i === profileDataOptions.length - 1) {
                            throw formatError;
                        }
                        console.log(`⚠️ REST API format ${formatDesc} failed, trying next format...`);
                    }
                }
            }
            
        } catch (restfulError) {
            console.error('❌ RESTful API fallback also failed:', restfulError);
            
            // Log final failure
            if (window.errorHandler) {
                window.errorHandler.logError('AUTH_ANON_PROFILE_ALL_METHODS_FAILED', restfulError, 'critical');
            }
            
            return null;
        }
    }
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>}
 */
async function isAuthenticated() {
    const userId = await getCurrentUserId();
    return userId !== null;
}

/**
 * Get user authentication state
 * @returns {Promise<{isAuthenticated: boolean, isAnonymous: boolean, userId: string|null, anonProfileId: string|null}>}
 */
async function getAuthState() {
    try {
        const userId = await getCurrentUserId();
        const isAuth = userId !== null;
        
        let anonProfileId = null;
        if (!isAuth) {
            // Use enhanced localStorage if available
            if (window.enhancedDB?.enhancedLocalStorage?.getItem) {
                anonProfileId = window.enhancedDB.enhancedLocalStorage.getItem('anon_profile_id', null, false);
            } else {
                anonProfileId = localStorage.getItem('anon_profile_id');
            }
        }
        
        return {
            isAuthenticated: isAuth,
            isAnonymous: !isAuth,
            userId: userId,
            anonProfileId: anonProfileId
        };
    } catch (error) {
        console.error('Error in getAuthState:', error);
        
        // Log to enhanced error handler if available
        if (window.errorHandler) {
            window.errorHandler.logError('AUTH_GET_STATE', error, 'medium');
        }
        
        // Return safe defaults
        return {
            isAuthenticated: false,
            isAnonymous: true,
            userId: null,
            anonProfileId: null
        };
    }
}

/**
 * Require authentication - throws error if not authenticated
 * @returns {Promise<string>} User ID
 * @throws {Error} If user is not authenticated
 */
async function requireAuthentication() {
    const userId = await getCurrentUserId();
    if (!userId) {
        throw new Error('User not authenticated');
    }
    return userId;
}

/**
 * Get user identifier with validation
 * Ensures we have either user_id or anon_profile_id
 * @returns {Promise<{user_id: string|null, anon_profile_id: string|null}>}
 * @throws {Error} If no valid identifier is available
 */
async function requireUserIdentifier() {
    const identifier = await getCurrentUserIdentifier();
    
    if (!identifier.user_id && !identifier.anon_profile_id) {
        throw new Error('No valid user identifier available');
    }
    
    return identifier;
}

/**
 * Add user identifier to data object for database operations
 * @param {Object} data - Data object to enhance
 * @returns {Promise<Object>} Enhanced data object with user_id/anon_profile_id
 */
async function addUserIdentifierToData(data) {
    const identifier = await getCurrentUserIdentifier();
    
    return {
        ...data,
        user_id: identifier.user_id,
        anon_profile_id: identifier.anon_profile_id
    };
}

/**
 * Create a database insert payload with user identifier
 * @param {Object} data - Data to insert
 * @param {boolean} requireAuth - Whether to require authentication (default: false)
 * @returns {Promise<Object>} Insert payload with user identifiers
 */
async function createInsertPayload(data, requireAuth = false) {
    if (requireAuth) {
        const userId = await requireAuthentication();
        return {
            ...data,
            user_id: userId,
            anon_profile_id: null
        };
    } else {
        return await addUserIdentifierToData(data);
    }
}

/**
 * Get WHERE clause for user-specific queries
 * @param {boolean} allowAnonymous - Whether to include anonymous users (default: true)
 * @returns {Promise<Object>} Query filter object
 */
async function getUserQueryFilter(allowAnonymous = true) {
    const userId = await getCurrentUserId();
    
    if (userId) {
        // Authenticated user
        return { user_id: userId };
    } else if (allowAnonymous) {
        // Anonymous user
        const anonProfileId = await getOrCreateAnonymousProfile();
        if (anonProfileId) {
            return { anon_profile_id: anonProfileId };
        }
    }
    
    // No valid identifier - return filter that matches nothing
    return { user_id: 'no-user', anon_profile_id: 'no-user' };
}

/**
 * Clear anonymous profile (for cleanup) with enhanced error handling
 */
function clearAnonymousProfile() {
    try {
        // Use enhanced localStorage if available
        if (window.enhancedDB?.enhancedLocalStorage?.removeItem) {
            window.enhancedDB.enhancedLocalStorage.removeItem('anon_profile_id');
        } else {
            localStorage.removeItem('anon_profile_id');
        }
        
        console.log('✅ Anonymous profile cleared');
        
        // Log to enhanced error handler if available
        if (window.errorHandler) {
            window.errorHandler.logInfo('AUTH_ANON_PROFILE_CLEARED', 'Anonymous profile cleared from storage');
        }
        
    } catch (error) {
        console.error('Error clearing anonymous profile:', error);
        
        // Log to enhanced error handler if available
        if (window.errorHandler) {
            window.errorHandler.logError('AUTH_CLEAR_ANON_PROFILE_ERROR', error, 'low');
        }
    }
}

/**
 * Sign out and cleanup with enhanced error handling
 */
async function signOut() {
    try {
        // Enhanced sign out with timeout if available
        if (window.supabaseClient) {
            if (window.enhancedDB?.enhancedSupabaseOperation) {
                const result = await window.enhancedDB.enhancedSupabaseOperation(
                    () => window.supabaseClient.auth.signOut(),
                    'sign out user',
                    { timeout: 5000, showError: false }
                );
                
                if (!result.success) {
                    console.warn('Enhanced sign out failed, but continuing with cleanup:', result.error);
                }
            } else {
                // Fallback to regular sign out with timeout
                const signOutPromise = window.supabaseClient.auth.signOut();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Sign out timeout')), 5000)
                );
                
                await Promise.race([signOutPromise, timeoutPromise]);
            }
        }
        
        clearAnonymousProfile();
        
        // Log successful sign out
        if (window.errorHandler) {
            window.errorHandler.logInfo('AUTH_SIGN_OUT_SUCCESS', 'User successfully signed out');
        }
        
        console.log('✅ User signed out successfully');
        
    } catch (error) {
        console.error('Error during sign out:', error);
        
        // Log to enhanced error handler if available
        if (window.errorHandler) {
            window.errorHandler.logError('AUTH_SIGN_OUT_ERROR', error, 'medium');
        }
        
        // Still attempt cleanup even if sign out failed
        try {
            clearAnonymousProfile();
        } catch (cleanupError) {
            console.error('Error during cleanup after failed sign out:', cleanupError);
        }
    }
}

/**
 * Upgrade anonymous user to authenticated user with enhanced error handling
 * Migrates anonymous profile data to authenticated user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<boolean>} Success status
 */
async function upgradeAnonymousUser(email, password) {
    try {
        // Validate inputs
        if (window.enhancedDB?.validateInput) {
            const emailValidation = window.enhancedDB.validateInput(email, 'email', 'user email');
            if (!emailValidation.isValid) {
                throw new Error(`Invalid email: ${emailValidation.error}`);
            }
            
            const passwordValidation = window.enhancedDB.validateInput(password, 'string', 'password', { minLength: 6 });
            if (!passwordValidation.isValid) {
                throw new Error(`Invalid password: ${passwordValidation.error}`);
            }
        }
        
        // Get current anonymous profile ID with enhanced storage
        let currentAnonId;
        if (window.enhancedDB?.enhancedLocalStorage?.getItem) {
            currentAnonId = window.enhancedDB.enhancedLocalStorage.getItem('anon_profile_id', null, false);
        } else {
            currentAnonId = localStorage.getItem('anon_profile_id');
        }
        
        // Sign up the user with enhanced error handling
        let signUpResult;
        if (window.enhancedDB?.enhancedSupabaseOperation) {
            signUpResult = await window.enhancedDB.enhancedSupabaseOperation(
                () => window.supabaseClient.auth.signUp({
                    email: email,
                    password: password
                }),
                'upgrade anonymous user to authenticated',
                { timeout: 15000, showError: true, retryAttempts: 2 }
            );
            
            if (!signUpResult.success) {
                throw signUpResult.error || new Error('Sign up operation failed');
            }
        } else {
            // Fallback to regular signup
            const { data, error } = await window.supabaseClient.auth.signUp({
                email: email,
                password: password
            });
            
            if (error) {
                throw error;
            }
            
            signUpResult = { success: true, data: data };
        }
        
        const newUserId = signUpResult.data?.user?.id;
        if (!newUserId) {
            throw new Error('Failed to get new user ID from signup response');
        }
        
        // TODO: Migrate anonymous data to authenticated user
        // This would involve updating all records with anon_profile_id = currentAnonId
        // to have user_id = newUserId instead
        // For now, we'll log the migration that would need to happen
        if (currentAnonId) {
            console.log(`📝 Migration needed: Update all records with anon_profile_id='${currentAnonId}' to user_id='${newUserId}'`);
            
            if (window.errorHandler) {
                window.errorHandler.logInfo('AUTH_UPGRADE_MIGRATION_NEEDED', 
                    `Anonymous user upgraded. Migration needed from anon_profile_id='${currentAnonId}' to user_id='${newUserId}'`);
            }
        }
        
        // Clear anonymous profile
        clearAnonymousProfile();
        
        // Log success
        if (window.errorHandler) {
            window.errorHandler.logInfo('AUTH_UPGRADE_SUCCESS', `Successfully upgraded anonymous user to authenticated user: ${newUserId}`);
        }
        
        console.log('✅ Successfully upgraded anonymous user to authenticated user');
        return true;
        
    } catch (error) {
        console.error('❌ Error upgrading anonymous user:', error);
        
        // Log to enhanced error handler if available
        if (window.errorHandler) {
            window.errorHandler.logError('AUTH_UPGRADE_ERROR', error, 'high');
        }
        
        return false;
    }
}

/**
 * Debug helper to log current auth state
 */
async function debugAuthState() {
    try {
        const state = await getAuthState();
        console.log('🔍 Auth State Debug:', {
            isAuthenticated: state.isAuthenticated,
            isAnonymous: state.isAnonymous,
            userId: state.userId,
            anonProfileId: state.anonProfileId,
            supabaseAvailable: !!window.supabaseClient
        });
        return state;
    } catch (error) {
        console.error('Error in debugAuthState:', error);
        return null;
    }
}

// Make functions available globally for backward compatibility
if (typeof window !== 'undefined') {
    window.authHelper = {
        getCurrentUserId,
        getCurrentUserIdentifier,
        getOrCreateAnonymousProfile,
        isAuthenticated,
        getAuthState,
        requireAuthentication,
        requireUserIdentifier,
        addUserIdentifierToData,
        createInsertPayload,
        getUserQueryFilter,
        clearAnonymousProfile,
        signOut,
        upgradeAnonymousUser,
        debugAuthState
    };
}

console.log('✅ Auth Helper loaded with UUID-based authentication support');