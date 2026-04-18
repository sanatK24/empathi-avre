const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * Base request function with comprehensive error handling, logging, and timeout support
 */
async function request(path, options = {}) {
    const { token, timeout = REQUEST_TIMEOUT, ...otherOptions } = options;
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...otherOptions.headers,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const startTime = performance.now();
        const response = await fetch(`${API_BASE_URL}${path}`, {
            ...otherOptions,
            headers,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const endTime = performance.now();
        const duration = endTime - startTime;

        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            console.error(`Failed to parse JSON response from ${path}:`, parseError);
            throw new Error(`Invalid server response from ${path}`);
        }

        // Log request details
        if (process.env.NODE_ENV === 'development') {
            console.log(`[API] ${otherOptions.method || 'GET'} ${path}`, {
                status: response.status,
                duration: `${duration.toFixed(2)}ms`,
                headers,
            });
        }

        if (!response.ok) {
            const errorMessage = data?.detail || data?.error || data?.message || `API error (${response.status})`;
            const error = new Error(errorMessage);
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    } catch (error) {
        clearTimeout(timeoutId);

        // Handle timeout
        if (error.name === 'AbortError') {
            throw new Error(`Request timeout: ${path} took longer than ${timeout}ms`);
        }

        // Handle network errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error(`Network error: Unable to reach ${API_BASE_URL}. Check your connection or backend status.`);
        }

        // Re-throw with context
        console.error(`[API Error] ${path}:`, error);
        throw error;
    }
}

/**
 * Health check to verify backend connectivity
 */
export async function checkBackendHealth() {
    try {
        const data = await request('/health', { timeout: 5000 });
        return {
            ok: data.status === 'Healthy' || data.status === 'Unhealthy',
            status: data.status,
            database: data.database,
            mlModel: data.ml_model,
        };
    } catch (error) {
        return {
            ok: false,
            error: error.message,
            status: 'Unreachable',
        };
    }
}

export const apiService = {
    // Auth
    login: (email, password) => {
        const formData = new URLSearchParams();
        formData.append('username', email); // FastAPI OAuth2 expects 'username'
        formData.append('password', password);
        
        return request('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });
    },
    register: (userData) => request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
    }),
    getMe: (token) => request('/auth/me', { token }),

    // Vendor
    getInventory: (token) => request('/vendor/inventory', { token }),
    addInventory: (token, item) => request('/vendor/inventory', {
        method: 'POST',
        token,
        body: JSON.stringify(item)
    }),
    getVendorMatches: (token) => request('/match/vendor', { token }),
    getVendorAnalytics: (token) => request('/vendor/analytics', { token }),
    acceptMatch: (token, requestId, vendorId) => request(`/match/${requestId}/accept/${vendorId}`, {
        method: 'POST',
        token
    }),
    getVendorProfile: (token) => request('/vendor/profile', { token }),
    getVendorStats: (token) => request('/vendor/stats', { token }),

    // Requester
    createRequest: (token, requestData) => request('/requests/', {
        method: 'POST',
        token,
        body: JSON.stringify(requestData)
    }),
    getRequestHistory: (token) => request('/requests/my', { token }),
    getRequesterStats: (token) => request('/requests/stats', { token }),
    getRequestDetails: (token, requestId) => request(`/requests/${requestId}`, { token }),
    completeRequest: (token, requestId) => request(`/match/${requestId}/complete`, {
        method: 'POST',
        token
    }),

    // Matching
    getMatches: (token, requestId) => request(`/match/${requestId}`, { token }),

    // Admin
    getAdminStats: (token) => request('/admin/stats', { token }),
    getUsers: (token) => request('/admin/users', { token }),
    getVendors: (token) => request('/admin/vendors', { token }),
    deleteProfile: (token) => request('/auth/profile', {
        method: 'DELETE',
        token
    }),

    // Campaigns
    getCampaigns: (token, filters = {}) => {
        const queryParams = new URLSearchParams();
        if (filters.category) queryParams.append('category', filters.category);
        if (filters.city) queryParams.append('city', filters.city);
        if (filters.urgency) queryParams.append('urgency', filters.urgency);
        if (filters.status) queryParams.append('status', filters.status);
        if (filters.verified_only) queryParams.append('verified_only', true);
        if (filters.sort_by) queryParams.append('sort_by', filters.sort_by);
        if (filters.limit) queryParams.append('limit', filters.limit);
        if (filters.offset) queryParams.append('offset', filters.offset);
        const queryString = queryParams.toString();
        return request(`/campaigns/${queryString ? '?' + queryString : ''}`, { token });
    },
    searchCampaigns: (token, query, limit = 20) => request(`/campaigns/search?q=${encodeURIComponent(query)}&limit=${limit}`, { token }),
    getCampaignDetail: (token, campaignId) => request(`/campaigns/${campaignId}`, { token }),
    createCampaign: (token, campaignData) => request('/campaigns/', {
        method: 'POST',
        token,
        body: JSON.stringify(campaignData)
    }),
    updateCampaign: (token, campaignId, campaignData) => request(`/campaigns/${campaignId}`, {
        method: 'PUT',
        token,
        body: JSON.stringify(campaignData)
    }),
    deleteCampaign: (token, campaignId) => request(`/campaigns/${campaignId}`, {
        method: 'DELETE',
        token
    }),
    getMyCampaigns: (token, limit = 20, offset = 0) => request(`/campaigns/user/my-campaigns?limit=${limit}&offset=${offset}`, { token }),
    getCampaignDonations: (token, campaignId, limit = 20, offset = 0) => request(`/campaigns/${campaignId}/donations?limit=${limit}&offset=${offset}`, { token }),

    // Donations
    createDonation: (token, campaignId, donationData) => request(`/donations/?campaign_id=${campaignId}`, {
        method: 'POST',
        token,
        body: JSON.stringify(donationData)
    }),
    getMyDonations: (token, limit = 20, offset = 0) => request(`/donations/me?limit=${limit}&offset=${offset}`, { token }),
    getDonationStats: (token, campaignId) => request(`/donations/campaign/${campaignId}/stats`, { token }),
    cancelDonation: (token, donationId) => request(`/donations/${donationId}/cancel`, {
        method: 'POST',
        token
    }),

    // Payments (Simulated)
    processPayment: (token, paymentData) => request('/payments/process', {
        method: 'POST',
        token,
        body: JSON.stringify(paymentData)
    }),
    getPaymentMethods: (token) => request('/payments/methods', { token }),
    getPaymentHistory: (token, limit = 20, offset = 0) => request(`/payments/history?limit=${limit}&offset=${offset}`, { token }),
    verifyPayment: (token, transactionId) => request(`/payments/verify/${transactionId}`, { token }),
};
