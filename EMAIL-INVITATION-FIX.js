// EMAIL INVITATION FIX - Ensures email invites create user profiles
// Handles users who are invited via email (not invite codes)

// Enhanced email invitation handler
function handleEmailInvitationSignup(user) {
    console.log('Processing email invitation signup for:', user.email);
    
    // Check if this user already has a profile
    checkAndCreateUserProfile(user);
}

// Check and create user profile for email invitations
async function checkAndCreateUserProfile(user) {
    try {
        // Check if user profile already exists
        const { data: existingProfile, error: checkError } = await window.supabaseClient
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();
            
        if (existingProfile) {
            console.log('User profile already exists for email invite user');
            return;
        }
        
        // Create user profile for email invitation user
        const userProfileData = {
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
            user_id: user.id,
            user_email: user.email,
            user_name: user.user_metadata?.full_name || user.email,
            role: 'client', // Default role for email invites
            assignment_status: 'unassigned', // Email invites don't auto-assign to coach
            role_assigned_at: new Date().toISOString(),
            role_assigned_by: 'email_invitation',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { error: profileError } = await window.supabaseClient
            .from('user_profiles')
            .insert([userProfileData]);

        if (profileError) {
            console.error('Error creating user profile for email invite:', profileError);
        } else {
            console.log('User profile created successfully for email invitation');
            
            // Assign default client role in user_roles table
            // First check if roles table exists, otherwise use string-based role assignment
            try {
                const { data: clientRole, error: roleError } = await window.supabaseClient
                    .from('roles')
                    .select('id')
                    .eq('name', 'client')
                    .single();
                    
                if (clientRole && !roleError) {
                    await window.supabaseClient
                        .from('user_roles')
                        .insert([{
                            user_id: user.id,
                            role_id: clientRole.id
                        }]);
                } else {
                    // Fallback: use string-based role assignment if roles table doesn't exist
                    await window.supabaseClient
                        .from('user_roles')
                        .insert([{
                            user_id: user.id,
                            role: 'client'
                        }]);
                }
            } catch (error) {
                console.warn('Role assignment failed, using fallback method:', error);
                // Fallback: use string-based role assignment
                await window.supabaseClient
                    .from('user_roles')
                    .insert([{
                        user_id: user.id,
                        role: 'client'
                    }]);
            }
        }
        
    } catch (error) {
        console.error('Error in checkAndCreateUserProfile:', error);
    }
}

// Enhanced auth wrapper login handler
// Enhance the existing login logic to handle email invitations
function setupEnhancedEmailInvitationHandler() {
    // Wait for authWrapper to be available
    if (typeof authWrapper === 'undefined') {
        setTimeout(setupEnhancedEmailInvitationHandler, 100);
        return;
    }
    
    console.log('Setting up enhanced email invitation handler');
    
    // Backup original login handlers
    const originalLoginHandlers = [...authWrapper.listeners.login];
    
    // Add enhanced login handler at the beginning
    authWrapper.listeners.login.unshift(user => {
        console.log('Enhanced login handler triggered for:', user.email);
        
        // Determine invitation type
        const isInviteCodeFlow = window.validInviteCode;
        const urlParams = new URLSearchParams(window.location.search);
        const urlHash = window.location.hash;
        const isEmailInvitation = !isInviteCodeFlow && (
            urlHash.includes('access_token') || 
            urlHash.includes('confirmation') ||
            !user.email_confirmed_at
        );
        
        if (isInviteCodeFlow) {
            console.log('Invite code flow detected - using existing logic');
            // Let existing handlers process invite codes
        } else if (isEmailInvitation) {
            console.log('Email invitation flow detected - creating user profile');
            // Handle email invitation
            handleEmailInvitationSignup(user);
        } else {
            console.log('Regular login flow detected');
            // Regular existing user login
        }
        
        // Continue with original login handlers
        originalLoginHandlers.forEach(handler => {
            try {
                handler(user);
            } catch (error) {
                console.error('Error in original login handler:', error);
            }
        });
    });
}

// Function to send email invitations (for admin/owner use)
async function sendEmailInvitation(email, inviterName = 'Administrator') {
    try {
        // Send Supabase email invitation
        const { data, error } = await window.supabaseClient.auth.admin.inviteUserByEmail(email, {
            data: {
                invited_by: inviterName,
                invitation_type: 'email',
                invited_at: new Date().toISOString()
            }
        });
        
        if (error) {
            console.error('Error sending email invitation:', error);
            return { success: false, error: error.message };
        }
        
        console.log('Email invitation sent successfully to:', email);
        return { success: true, data };
        
    } catch (error) {
        console.error('Failed to send email invitation:', error);
        return { success: false, error: error.message };
    }
}

// Initialize enhanced email invitation handler when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('EMAIL-INVITATION-FIX loaded');
    
    // Set up enhanced handler after a brief delay to ensure authWrapper is ready
    setTimeout(setupEnhancedEmailInvitationHandler, 1500);
});

// Export functions for use in other parts of the app
window.EmailInvitationHandler = {
    sendInvitation: sendEmailInvitation,
    handleSignup: handleEmailInvitationSignup,
    createUserProfile: checkAndCreateUserProfile
};

console.log('EMAIL-INVITATION-FIX.js loaded successfully');