// Supabase Invitation Handler - Add this to handle invitation links
// Add this script BEFORE supabase-auth-wrapper.js

class SupabaseInvitationHandler {
    constructor() {
        this.init();
    }

    init() {
        // Check if page was loaded with invitation parameters
        this.checkForInvitation();
        
        // Set up auth state listener for invitation flow
        this.setupInvitationFlow();
    }

    checkForInvitation() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlHash = new URLSearchParams(window.location.hash.substring(1));
        
        // Check for Supabase invitation parameters
        const invitationToken = urlParams.get('token') || urlHash.get('access_token');
        const type = urlParams.get('type') || urlHash.get('type');
        const email = urlParams.get('email') || urlHash.get('email');
        
        console.log('Checking for invitation:', { invitationToken, type, email });
        
        if (invitationToken && (type === 'invite' || type === 'signup')) {
            console.log('Invitation detected! Showing signup form...');
            this.handleInvitation(invitationToken, email);
        }
    }

    async handleInvitation(token, email) {
        try {
            // Show loading state
            this.showInvitationModal(email);
            
            // Verify the invitation token with Supabase
            const { data, error } = await window.supabaseClient.auth.verifyOtp({
                token_hash: token,
                type: 'invite'
            });
            
            if (error) {
                console.error('Invitation verification error:', error);
                this.showInvitationError('Invalid or expired invitation link.');
                return;
            }
            
            console.log('Invitation verified successfully:', data);
            
            // Show password setup form
            this.showPasswordSetupForm(email, token);
            
        } catch (error) {
            console.error('Error handling invitation:', error);
            this.showInvitationError('Failed to process invitation. Please try again.');
        }
    }

    showInvitationModal(email) {
        // Hide the main login screen
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) {
            loginScreen.style.display = 'none';
        }

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
            await this.completeRegistration(email, token);
        };
    }

    async completeRegistration(email, token) {
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
                    role: 'user' // Default role for new users
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
                    onclick="window.location.reload()" 
                    class="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Try Again
                </button>
            </div>
        `;
    }

    setupInvitationFlow() {
        // Listen for auth state changes during invitation flow
        if (window.supabaseClient) {
            window.supabaseClient.auth.onAuthStateChange((event, session) => {
                console.log('Invitation flow auth state change:', event, session?.user?.email);
                
                if (event === 'SIGNED_IN' && session?.user) {
                    // User successfully signed in after invitation
                    console.log('User signed in after invitation:', session.user.email);
                }
            });
        }
    }
}

// Initialize invitation handler when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if Supabase is available
    if (window.supabaseClient) {
        window.invitationHandler = new SupabaseInvitationHandler();
    } else {
        // Wait for Supabase to be ready
        window.addEventListener('supabaseReady', () => {
            window.invitationHandler = new SupabaseInvitationHandler();
        });
    }
});