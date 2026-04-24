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
            // Handle validation errors (422) with detailed field info
            let errorMessage = data?.detail || data?.error || data?.message || `API error (${response.status})`;
            
            if (response.status === 422 && data?.detail && Array.isArray(data.detail)) {
                // Pydantic validation error format
                const fieldErrors = data.detail.map(err => {
                    const field = err.loc?.join('.') || 'unknown field';
                    const msg = err.msg || err.message || 'validation failed';
                    return `${field}: ${msg}`;
                }).join('; ');
                errorMessage = fieldErrors || errorMessage;
            }
            
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
    socialLogin: (token, provider, role = 'requester') => request('/auth/social', {
        method: 'POST',
        body: JSON.stringify({ token, provider, role })
    }),
    getMe: (token) => request('/auth/me', { token }),

    // Vendor Management
    getInventory: (token) => request('/inventory', { token }),
    addInventory: (token, item) => request('/inventory', {
        method: 'POST',
        token,
        body: JSON.stringify(item)
    }),
    updateInventory: (token, itemId, updateData) => request(`/inventory/${itemId}`, {
        method: 'PUT',
        token,
        body: JSON.stringify(updateData)
    }),
    getVendorMatches: (token) => request('/matches/incoming', { token }),
    vendorAcceptMatch: (token, matchId) => request(`/matches/${matchId}/vendor-accept`, {
        method: 'POST',
        token
    }),
    getVendorProfile: (token) => request('/vendor/profile', { token }),
    updateMyProfile: (token, data) => request('/auth/profile', {
        method: 'PUT',
        token,
        body: JSON.stringify(data)
    }),
    addEmergencyContact: (token, contact) => request('/auth/emergency-contacts', {
        method: 'POST',
        token,
        body: JSON.stringify(contact)
    }),
    deleteEmergencyContact: (token, id) => request(`/auth/emergency-contacts/${id}`, {
        method: 'DELETE',
        token
    }),
    updateVendorProfile: (token, profileData) => request('/vendor/profile', {
        method: 'POST',
        token,
        body: JSON.stringify(profileData)
    }),
    getVendorStats: (token) => request('/vendor/stats', { token }),
    getVendorAnalytics: (token) => request('/vendor/analytics', { token }),

    // Requester flow
    createRequest: (token, requestData) => request('/requests', {
        method: 'POST',
        token,
        body: JSON.stringify(requestData)
    }),
    getRequestHistory: (token) => request('/requests/my', { token }),
    getRequesterStats: (token) => request('/requests/stats', { token }),
    getRequestDetails: (token, requestId) => request(`/requests/${requestId}`, { token }),
    getRequestMatches: (token, requestId) => request(`/requests/${requestId}/matches`, { token }),
    acceptVendorForRequest: (token, requestId, vendorId) => request(`/requests/${requestId}/accept/${vendorId}`, {
        method: 'POST',
        token
    }),
    cancelRequest: (token, requestId) => request(`/requests/${requestId}/cancel`, {
        method: 'POST',
        token
    }),

    // Campaigns
    getCampaigns: (token, filters = {}) => {
        const queryParams = new URLSearchParams();
        if (filters.category) queryParams.append('category', filters.category);
        if (filters.city) queryParams.append('city', filters.city);
        if (filters.limit) queryParams.append('limit', filters.limit);
        if (filters.skip) queryParams.append('skip', filters.skip);
        const queryString = queryParams.toString();
        return request(`/campaigns${queryString ? '?' + queryString : ''}`, { token });
    },
    getPersonalizedCampaigns: (token) => request('/campaigns/recommendations', { token }),
    getCampaignDetails: (token, campaignId) => request(`/campaigns/${campaignId}`, { token }),
    createCampaign: (token, campaignData) => request('/campaigns', {
        method: 'POST',
        token,
        body: JSON.stringify(campaignData)
    }),
    donateToCampaign: (token, campaignId, amount, anonymous = false) => request(`/campaigns/${campaignId}/donate?amount=${amount}&anonymous=${anonymous}`, {
        method: 'POST',
        token
    }),
    getMyCreatedCampaigns: (token) => request('/campaigns/my', { token }),
    getDonationHistory: (token) => request('/campaigns/my-donations', { token }),

    // Emergency Flow
    getActiveEmergencies: () => request('/emergency/active'),
    reportEmergency: (token, data) => request('/emergency/request', {
        method: 'POST',
        token,
        body: JSON.stringify(data)
    }),
    getHelplines: (token, city) => request(`/emergency/helplines${city ? '?city=' + city : ''}`, { token }),
    getFacilities: (token, { city, lat, lng, type }) => {
        const queryParams = new URLSearchParams();
        if (city) queryParams.append('city', city);
        if (lat) queryParams.append('lat', lat);
        if (lng) queryParams.append('lng', lng);
        if (type) queryParams.append('type', type);
        return request(`/emergency/facilities?${queryParams.toString()}`, { token });
    },

    // Admin
    getAdminStats: (token) => request('/admin/stats', { token }),
    getAdminUsers: (token, skip = 0, limit = 100) => request(`/admin/users?skip=${skip}&limit=${limit}`, { token }),
    getAdminVendors: (token, skip = 0, limit = 100) => request(`/admin/vendors?skip=${skip}&limit=${limit}`, { token }),
    getAdminCampaigns: (token, skip = 0, limit = 100) => request(`/admin/campaigns?skip=${skip}&limit=${limit}`, { token }),
    verifyCampaign: (campaign_id, token, verified = true) => request(`/admin/campaigns/${campaign_id}/verify?verified=${verified}`, {
        method: 'PUT',
        token
    }),
    deleteCampaign: (campaign_id, token) => request(`/admin/campaigns/${campaign_id}`, {
        method: 'DELETE',
        token
    }),
    flagCampaign: (campaign_id, token, flagged = true) => request(`/admin/campaigns/${campaign_id}/flag?flagged=${flagged}`, {
        method: 'PUT',
        token
    }),
    verifyVendor: (token, vendorId, status) => request(`/admin/vendors/${vendorId}/verification?status=${status}`, {
        method: 'PUT',
        token
    }),
    deleteProfile: (token) => request('/auth/profile', {
        method: 'DELETE',
        token
    }),
};
