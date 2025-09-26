// Simple Authentication Modal for Admin/Coach Dashboards
// Direct Supabase integration without complex wrappers

class SimpleAuthModal {
    constructor() {
        this.isOpen = false;
        this.callbacks = [];
        this.createModal();
    }

    createModal() {
        // Create modal HTML
        const modalHTML = `
            <div id="simple-auth-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-xl font-bold text-gray-900">Authentication Required</h2>
                        <button id="close-auth-modal" class="text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div id="auth-error" class="hidden bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    </div>
                    
                    <form id="auth-form" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input type="email" id="auth-email" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input type="password" id="auth-password" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <button type="submit" id="auth-submit" 
                                class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                            <span id="auth-submit-text">Sign In</span>
                            <div id="auth-loading" class="hidden">
                                <i class="fas fa-spinner fa-spin mr-2"></i>
                                Signing in...
                            </div>
                        </button>
                    </form>
                    
                    <div class="mt-4 text-center">
                        <p class="text-sm text-gray-600">
                            Admin or Coach access required
                        </p>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        const modal = document.getElementById('simple-auth-modal');
        const closeBtn = document.getElementById('close-auth-modal');
        const form = document.getElementById('auth-form');

        // Close modal events
        closeBtn.addEventListener('click', () => this.close());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.close();
        });

        // Form submission
        form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;
        
        if (!email || !password) {
            this.showError('Please enter both email and password');
            return;
        }

        this.setLoading(true);
        this.hideError();

        try {
            // Direct Supabase authentication
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                throw error;
            }

            if (data.user) {
                // Call success callbacks
                this.callbacks.forEach(callback => {
                    try {
                        callback(data.user);
                    } catch (callbackError) {
                        // Silently handle callback errors
                    }
                });

                this.close();
            } else {
                throw new Error('Authentication failed - no user returned');
            }

        } catch (error) {
            this.showError(this.getErrorMessage(error));
        } finally {
            this.setLoading(false);
        }
    }

    getErrorMessage(error) {
        if (error.message) {
            // Common Supabase error messages
            if (error.message.includes('Invalid login credentials')) {
                return 'Invalid email or password';
            }
            if (error.message.includes('Email not confirmed')) {
                return 'Please check your email and confirm your account';
            }
            if (error.message.includes('Too many requests')) {
                return 'Too many login attempts. Please wait a moment and try again';
            }
            return error.message;
        }
        return 'Authentication failed. Please try again.';
    }

    showError(message) {
        const errorDiv = document.getElementById('auth-error');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }

    hideError() {
        const errorDiv = document.getElementById('auth-error');
        errorDiv.classList.add('hidden');
    }

    setLoading(isLoading) {
        const submitBtn = document.getElementById('auth-submit');
        const submitText = document.getElementById('auth-submit-text');
        const loadingDiv = document.getElementById('auth-loading');

        if (isLoading) {
            submitBtn.disabled = true;
            submitText.classList.add('hidden');
            loadingDiv.classList.remove('hidden');
        } else {
            submitBtn.disabled = false;
            submitText.classList.remove('hidden');
            loadingDiv.classList.add('hidden');
        }
    }

    open(successCallback) {
        if (successCallback && typeof successCallback === 'function') {
            this.callbacks.push(successCallback);
        }

        const modal = document.getElementById('simple-auth-modal');
        modal.classList.remove('hidden');
        this.isOpen = true;

        // Focus email input
        setTimeout(() => {
            document.getElementById('auth-email').focus();
        }, 100);
    }

    close() {
        const modal = document.getElementById('simple-auth-modal');
        modal.classList.add('hidden');
        this.isOpen = false;
        
        // Clear form
        document.getElementById('auth-form').reset();
        this.hideError();
        this.setLoading(false);
        
        // Clear callbacks
        this.callbacks = [];
    }

    // Compatibility method for existing code
    on(event, callback) {
        if (event === 'login') {
            this.callbacks.push(callback);
        }
    }
}

// Initialize simple auth modal when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Supabase to be ready
    function initSimpleAuth() {
        if (window.supabaseClient) {
            window.simpleAuth = new SimpleAuthModal();
        } else {
            setTimeout(initSimpleAuth, 100);
        }
    }
    
    initSimpleAuth();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimpleAuthModal;
}