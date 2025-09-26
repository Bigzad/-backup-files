// Enhanced Supabase Invitation Handler - Supports both Supabase invites and custom coach codes
// Add this script BEFORE supabase-auth-wrapper.js

class EnhancedInvitationHandler {
    constructor() {
        this.init();
    }

    init() {
        // Check if page was loaded with invitation parameters (both types)
        this.checkForInvitation();
        
        // Set up auth state listener for invitation flow
        this.setupInvitationFlow();
    }

    checkForInvitation() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlHash = new URLSearchParams(window.location.hash.substring(1));
        
        // Check for custom coach invitation code
        const coachCode = urlParams.get('code') || urlParams.get('invitation_code');
        
        // Check for Supabase invitation parameters
        const invitationToken = urlParams.get('token') || urlHash.get('access_token');
        const type = urlParams.get('type') || urlHash.get('type');
        const email = urlParams.get('email') || urlHash.get('email');
        
        console.log('Checking for invitations:', { coachCode, invitationToken, type, email });
        
        if (coachCode) {
            console.log('Coach invitation code detected:', coachCode);
            this.handleCoachInvitation(coachCode);
        } else if (invitationToken && (type === 'invite' || type === 'signup')) {
            console.log('Supabase invitation detected! Showing signup form...');
            this.handleSupabaseInvitation(invitationToken, email);
        }
    }

    async handleCoachInvitation(code) {
        try {
            // Show loading state
            this.showCoachInvitationModal(code);
            
            // Validate the coach invitation code
            const validation = await this.validateCoachInvitationCode(code);
            
            if (!validation.valid) {
                this.showInvitationError(validation.message);
                return;
            }
            
            console.log('Coach invitation code validated:', validation);
            
            // Show registration form for coach invitation
            this.showCoachRegistrationForm(code, validation.coach_name, validation.coach_email);
            
        } catch (error) {
            console.error('Error handling coach invitation:', error);
            this.showInvitationError('Failed to process invitation code. Please try again.');
        }
    }

    async handleSupabaseInvitation(token, email) {
        try {
            // Show loading state
            this.showSupabaseInvitationModal(email);
            
            // Verify the invitation token with Supabase
            const { data, error } = await window.supabaseClient.auth.verifyOtp({
                token_hash: token,
                type: 'invite'
            });
            
            if (error) {
                console.error('Supabase invitation verification error:', error);
                this.showInvitationError('Invalid or expired invitation link.');
                return;
            }
            
            console.log('Supabase invitation verified successfully:', data);
            
            // Show password setup form
            this.showPasswordSetupForm(email, token);
            
        } catch (error) {
            console.error('Error handling Supabase invitation:', error);
            this.showInvitationError('Failed to process invitation. Please try again.');
        }
    }

    async validateCoachInvitationCode(code) {
        try {
            // Use secure validation function instead of direct table access
            const { data, error } = await window.supabaseClient
                .rpc('validate_invitation_code', { input_code: code });

            if (error) {
                console.error('Error validating invitation code:', error);
                return { valid: false, message: 'Error validating invitation code' };
            }

            if (!data || data.length === 0) {
                return { valid: false, message: 'Invalid or expired invitation code' };
            }

            const result = data[0];
            
            if (!result.is_valid) {
                return { valid: false, message: 'Invalid or expired invitation code' };
            }

            return { 
                valid: true, 
                coach_email: result.coach_email,
                coach_name: result.coach_name,
                code_id: result.code_id
            };

        } catch (error) {
            console.error('Error validating invitation code:', error);
            return { valid: false, message: 'Error validating invitation code' };
        }
    }

    showCoachInvitationModal(code) {
        // Hide the main content
        this.hideMainContent();

        // Create invitation modal
        const modalHTML = `
            <div id="invitation-modal" class="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
                    <div class="text-center mb-6">
                        <div class="inline-block p-3 bg-blue-100 rounded-full mb-4">
                            <i class="fas fa-user-friends text-2xl text-blue-600"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-900 mb-2">Coach Invitation</h2>
                        <p class="text-gray-600">You've been invited to join as a client</p>
                        <p class="text-sm text-blue-600 mt-2 font-mono font-bold">${code}</p>
                    </div>
                    <div id="invitation-content" class="text-center">
                        <div class="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-blue-600 rounded-full mb-4" role="status"></div>
                        <p class="text-gray-600">Validating invitation code...</p>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    showSupabaseInvitationModal(email) {
        // Hide the main content
        this.hideMainContent();

        // Create invitation modal
        const modalHTML = `
            <div id="invitation-modal" class="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
                    <div class="text-center mb-6">
                        <div class="inline-block p-3 bg-blue-100 rounded-full mb-4">
                            <i class="fas fa-envelope text-2xl text-blue-600"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-900 mb-2">Complete Your Registration</h2>
                        <p class="text-gray-600">You've been invited to join AI-Powered Macro Calculator</p>
                        ${email ? `<p class="text-sm text-blue-600 mt-2">${email}</p>` : ''}
                    </div>
                    <div id="invitation-content" class="text-center">
                        <div class="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-blue-600 rounded-full mb-4" role="status"></div>
                        <p class="text-gray-600">Verifying your invitation...</p>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    showCoachRegistrationForm(code, coachName, coachEmail) {
        const content = document.getElementById('invitation-content');
        if (!content) return;

        content.innerHTML = `
            <div class="text-left">
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <div class="flex items-center">
                        <i class="fas fa-info-circle text-blue-600 mr-2"></i>
                        <span class="text-sm text-blue-800">You'll be assigned to coach: <strong>${coachName}</strong></span>
                    </div>
                </div>
                
                <form id="coach-registration-form" class="space-y-4">
                    <div>
                        <label for="full-name" class="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                        <input 
                            type="text" 
                            id="full-name" 
                            name="fullName"
                            required
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter your full name"
                        >
                    </div>
                    <div>
                        <label for="email" class="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                        <input 
                            type="email" 
                            id="email" 
                            name="email"
                            required
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter your email address"
                        >
                    </div>
                    <div>
                        <label for="password" class="block text-sm font-medium text-gray-700 mb-2">Create Password</label>
                        <input 
                            type="password" 
                            id="password" 
                            name="password"
                            required
                            minlength="8"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Create a secure password (min 8 chars)"
                        >
                    </div>
                    <div>
                        <label for="confirm-password" class="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                        <input 
                            type="password" 
                            id="confirm-password" 
                            name="confirmPassword"
                            required
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Confirm your password"
                        >
                    </div>
                    <button 
                        type="submit" 
                        class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        Create Account & Join Coach
                    </button>
                    <div id="form-error" class="text-red-600 text-sm hidden"></div>
                </form>
            </div>
        `;

        // Handle form submission
        document.getElementById('coach-registration-form').onsubmit = async (e) => {
            e.preventDefault();
            await this.completeCoachRegistration(code, coachEmail);
        };
    }

    showPasswordSetupForm(email, token) {
        const content = document.getElementById('invitation-content');
        if (!content) return;

        content.innerHTML = `
            <form id="password-setup-form" class="space-y-4">
                <div class="text-left">
                    <label for="full-name" class="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input 
                        type="text" 
                        id="full-name" 
                        name="fullName"
                        required
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your full name"
                    >
                </div>
                <div class="text-left">
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-2">Create Password</label>
                    <input 
                        type="password" 
                        id="password" 
                        name="password"
                        required
                        minlength="8"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Create a secure password (min 8 chars)"
                    >
                </div>
                <div class="text-left">
                    <label for="confirm-password" class="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                    <input 
                        type="password" 
                        id="confirm-password" 
                        name="confirmPassword"
                        required
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Confirm your password"
                    >
                </div>
                <button 
                    type="submit" 
                    class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                    Complete Registration
                </button>
                <div id="form-error" class="text-red-600 text-sm hidden"></div>
            </form>
        `;

        // Handle form submission
        document.getElementById('password-setup-form').onsubmit = async (e) => {
            e.preventDefault();
            await this.completeSupabaseRegistration(email, token);
        };
    }

    async completeCoachRegistration(invitationCode, coachEmail) {
        const fullName = document.getElementById('full-name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const errorDiv = document.getElementById('form-error');

        // Reset error state
        errorDiv.classList.add('hidden');

        // Validation
        if (password !== confirmPassword) {
            errorDiv.textContent = 'Passwords do not match';
            errorDiv.classList.remove('hidden');
            return;
        }

        if (password.length < 8) {
            errorDiv.textContent = 'Password must be at least 8 characters long';
            errorDiv.classList.remove('hidden');
            return;
        }

        try {
            // Show loading state
            const submitBtn = document.querySelector('#coach-registration-form button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Creating Account...';
            submitBtn.disabled = true;

            // Step 1: Create Supabase user account
            const { data: authData, error: authError } = await window.supabaseClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: fullName,
                        name: fullName,
                        invitation_code: invitationCode
                    }
                }
            });

            if (authError) {
                throw authError;
            }

            console.log('User account created:', authData.user?.email);

            // Step 2: Create user profile with coach assignment
            if (authData.user) {
                const userProfileData = {
                    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
                    user_id: authData.user.id,
                    user_email: authData.user.email,
                    user_name: fullName,
                    user_role: 'client', // Proper role assignment
                    assignment_status: 'assigned',
                    assigned_coach: coachEmail, // AUTO-ASSIGN TO COACH!
                    coach_invite_code: invitationCode,
                    coach_assignment_date: new Date().toISOString(),
                    role_assigned_at: new Date().toISOString(),
                    role_assigned_by: 'invitation_code_' + invitationCode,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const { error: profileError } = await window.supabaseClient
                    .from('user_profiles')
                    .insert([userProfileData]);

                if (profileError) {
                    console.error('Error creating user profile:', profileError);
                    // Continue anyway, profile might be created by trigger
                }

                // Step 3: Update invitation code usage
                await this.incrementInvitationCodeUsage(invitationCode);
            }

            // Show success message
            this.showCoachRegistrationSuccess(coachEmail);

            // Redirect after a short delay
            setTimeout(() => {
                window.location.href = 'app.html';
            }, 3000);

        } catch (error) {
            console.error('Coach registration error:', error);
            errorDiv.textContent = error.message || 'Failed to complete registration. Please try again.';
            errorDiv.classList.remove('hidden');

            // Reset button
            const submitBtn = document.querySelector('#coach-registration-form button[type="submit"]');
            submitBtn.textContent = 'Create Account & Join Coach';
            submitBtn.disabled = false;
        }
    }

    async completeSupabaseRegistration(email, token) {
        const fullName = document.getElementById('full-name').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const errorDiv = document.getElementById('form-error');

        // Reset error state
        errorDiv.classList.add('hidden');

        // Validation
        if (password !== confirmPassword) {
            errorDiv.textContent = 'Passwords do not match';
            errorDiv.classList.remove('hidden');
            return;
        }

        if (password.length < 8) {
            errorDiv.textContent = 'Password must be at least 8 characters long';
            errorDiv.classList.remove('hidden');
            return;
        }

        try {
            // Show loading state
            const submitBtn = document.querySelector('#password-setup-form button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Creating Account...';
            submitBtn.disabled = true;

            // Complete the signup with Supabase
            const { data, error } = await window.supabaseClient.auth.updateUser({
                email: email,
                password: password,
                data: {
                    full_name: fullName,
                    name: fullName,
                    role: 'user'
                }
            });

            if (error) {
                throw error;
            }

            console.log('Registration completed successfully:', data);

            // Show success message
            this.showSuccessMessage();

            // Redirect after a short delay
            setTimeout(() => {
                window.location.href = 'app.html';
            }, 2000);

        } catch (error) {
            console.error('Registration error:', error);
            errorDiv.textContent = error.message || 'Failed to complete registration. Please try again.';
            errorDiv.classList.remove('hidden');

            // Reset button
            const submitBtn = document.querySelector('#password-setup-form button[type="submit"]');
            submitBtn.textContent = 'Complete Registration';
            submitBtn.disabled = false;
        }
    }

    async incrementInvitationCodeUsage(code) {
        try {
            // Use secure increment function instead of direct table access
            const { data, error } = await window.supabaseClient
                .rpc('increment_invitation_code_usage', { input_code: code });

            if (error) {
                console.error('Error updating invitation code usage:', error);
            } else if (data) {
                console.log('Invitation code usage incremented for:', code);
            } else {
                console.warn('Invitation code not found for increment:', code);
            }
        } catch (error) {
            console.error('Error incrementing invitation code usage:', error);
        }
    }

    showCoachRegistrationSuccess(coachEmail) {
        const content = document.getElementById('invitation-content');
        if (!content) return;

        content.innerHTML = `
            <div class="text-center">
                <div class="inline-block p-3 bg-green-100 rounded-full mb-4">
                    <i class="fas fa-check text-2xl text-green-600"></i>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-2">Welcome to the Team!</h3>
                <p class="text-gray-600 mb-2">Your account has been created successfully.</p>
                <p class="text-sm text-blue-600 mb-4">✅ You've been automatically assigned to your coach</p>
                <p class="text-sm text-gray-500">Redirecting to the application...</p>
            </div>
        `;
    }

    showSuccessMessage() {
        const content = document.getElementById('invitation-content');
        if (!content) return;

        content.innerHTML = `
            <div class="text-center">
                <div class="inline-block p-3 bg-green-100 rounded-full mb-4">
                    <i class="fas fa-check text-2xl text-green-600"></i>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-2">Registration Complete!</h3>
                <p class="text-gray-600 mb-4">Your account has been created successfully.</p>
                <p class="text-sm text-gray-500">Redirecting to the application...</p>
            </div>
        `;
    }

    showInvitationError(message) {
        const content = document.getElementById('invitation-content');
        if (!content) return;

        content.innerHTML = `
            <div class="text-center">
                <div class="inline-block p-3 bg-red-100 rounded-full mb-4">
                    <i class="fas fa-exclamation-triangle text-2xl text-red-600"></i>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-2">Invitation Error</h3>
                <p class="text-gray-600 mb-4">${message}</p>
                <button 
                    onclick="window.location.href = window.location.pathname" 
                    class="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Continue to App
                </button>
            </div>
        `;
    }

    hideMainContent() {
        // Hide the main login screen or content
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) {
            loginScreen.style.display = 'none';
        }

        // Hide main app content
        const mainContent = document.querySelector('main') || document.querySelector('.main-content') || document.getElementById('app');
        if (mainContent) {
            mainContent.style.display = 'none';
        }
    }

    setupInvitationFlow() {
        // Listen for auth state changes during invitation flow
        if (window.supabaseClient) {
            window.supabaseClient.auth.onAuthStateChange((event, session) => {
                console.log('Enhanced invitation flow auth state change:', event, session?.user?.email);
                
                if (event === 'SIGNED_IN' && session?.user) {
                    console.log('User signed in after invitation:', session.user.email);
                }
            });
        }
    }
}

// Initialize enhanced invitation handler when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if Supabase is available
    if (window.supabaseClient) {
        window.enhancedInvitationHandler = new EnhancedInvitationHandler();
    } else {
        // Wait for Supabase to be ready
        const checkSupabase = () => {
            if (window.supabaseClient) {
                window.enhancedInvitationHandler = new EnhancedInvitationHandler();
            } else {
                setTimeout(checkSupabase, 100);
            }
        };
        checkSupabase();
    }
});