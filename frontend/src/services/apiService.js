const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const REQUEST_TIMEOUT = 30000;
async function request(path, options = {}) {
    const { token, timeout = REQUEST_TIMEOUT, ...otherOptions } = options;
    const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }), ...otherOptions.headers };
    const controller = new AbortController(), timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const startTime = performance.now();
        const response = await fetch(`${API_BASE_URL}${path}`, { ...otherOptions, headers, signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await response.json().catch(err => {
            console.error(`Failed to parse JSON response from ${path}:`, err);
            throw new Error(`Invalid server response from ${path}`);
        });
        if (process.env.NODE_ENV === 'development') {
            console.log(`[API] ${otherOptions.method || 'GET'} ${path}`, { status: response.status, duration: `${(performance.now() - startTime).toFixed(2)}ms`, headers });
        }
        if (!response.ok) {
            let msg = data?.detail || data?.error || data?.message || `API error (${response.status})`;
            if (response.status === 422 && Array.isArray(data?.detail)) {
                msg = data.detail.map(e => `${e.loc?.join('.') || 'unknown field'}: ${e.msg || e.message || 'validation failed'}`).join('; ') || msg;
            }
            throw Object.assign(new Error(msg), { status: response.status, data });
        }
        return data;
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') throw new Error(`Request timeout: ${path} took longer than ${timeout}ms`);
        if (err instanceof TypeError && err.message.includes('fetch')) {
            throw new Error(`Network error: Unable to reach ${API_BASE_URL}. Check your connection or backend status.`);
        }
        console.error(`[API Error] ${path}:`, err);
        throw err;
    }
}
export async function checkBackendHealth() {
    try {
        const data = await request('/health', { timeout: 5000 });
        return { ok: data.status === 'Healthy' || data.status === 'Unhealthy', status: data.status, database: data.database, mlModel: data.ml_model };
    } catch (err) {
        return { ok: false, error: err.message, status: 'Unreachable' };
    }
}
export const apiService = {
    login: (email, password) => request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ username: email, password }).toString() }),
    register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
    getMe: (token) => request('/auth/me', { token }),
    updateMyProfile: (token, data) => request('/auth/profile', { method: 'PUT', token, body: JSON.stringify(data) }),
    addEmergencyContact: (token, contact) => request('/auth/emergency-contacts', { method: 'POST', token, body: JSON.stringify(contact) }),
    deleteEmergencyContact: (token, id) => request(`/auth/emergency-contacts/${id}`, { method: 'DELETE', token }),
    getUserStats: (token) => request('/users/me/stats', { token }),
    getCampaigns: (token, filters = {}) => {
        const q = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([k, v]) => ['category', 'city', 'limit', 'skip'].includes(k) && v))).toString();
        return request(`/campaigns${q ? '?' + q : ''}`, { token });
    },
    getTaxonomy: () => request('/campaigns/taxonomy'),
    analyzeCampaign: (token, campaignData) => request('/campaigns/analyze', { method: 'POST', token, body: JSON.stringify(campaignData) }),
    refineCampaignDescription: (token, description) => request('/campaigns/refine-description', { method: 'POST', token, body: JSON.stringify({ description }) }),
    reportCampaign: (token, campaignId, reason) => request(`/campaigns/${campaignId}/report`, { method: 'POST', token, body: JSON.stringify({ reason }) }),
    getPersonalizedCampaigns: (token) => request('/campaigns/recommendations', { token }),
    searchCampaigns: (token, query) => request(`/campaigns?city=${encodeURIComponent(query)}`, { token }),
    getCampaignDetails: (token, campaignId) => request(`/campaigns/${campaignId}`, { token }),
    getCampaignDonations: (token, campaignId) => request(`/campaigns/${campaignId}/donations`, { token }),
    getCampaignStats: (token, campaignId) => request(`/campaigns/${campaignId}/stats`, { token }),
    getRelatedCampaigns: (token, campaignId) => request(`/campaigns/${campaignId}/related`, { token }),
    getCampaignUpdates: (token, campaignId) => request(`/campaigns/${campaignId}/updates`, { token }),
    createCampaignUpdate: (token, campaignId, updateData) => request(`/campaigns/${campaignId}/updates`, { method: 'POST', token, body: JSON.stringify(updateData) }),
    deleteCampaignUpdate: (token, campaignId, updateId) => request(`/campaigns/${campaignId}/updates/${updateId}`, { method: 'DELETE', token }),
    likeCampaignUpdate: (token, campaignId, updateId) => request(`/campaigns/${campaignId}/updates/${updateId}/like`, { method: 'POST', token }),
    unlikeCampaignUpdate: (token, campaignId, updateId) => request(`/campaigns/${campaignId}/updates/${updateId}/unlike`, { method: 'POST', token }),
    togglePinUpdate: (token, campaignId, updateId) => request(`/campaigns/${campaignId}/updates/${updateId}/pin`, { method: 'PUT', token }),
    getUpdateComments: (token, campaignId, updateId) => request(`/campaigns/${campaignId}/updates/${updateId}/comments`, { token }),
    addUpdateComment: (token, campaignId, updateId, commentData) => request(`/campaigns/${campaignId}/updates/${updateId}/comments`, { method: 'POST', token, body: JSON.stringify(commentData) }),
    deleteUpdateComment: (token, campaignId, updateId, commentId) => request(`/campaigns/${campaignId}/updates/${updateId}/comments/${commentId}`, { method: 'DELETE', token }),
    createCampaign: (token, campaignData) => request('/campaigns', { method: 'POST', token, body: JSON.stringify(campaignData) }),
    uploadCampaignDocument: async (token, campaignId, file) => {
        const fd = new FormData(); fd.append('file', file);
        const res = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/documents`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        if (!res.ok) throw new Error(`Failed to upload document (${res.status})`);
        return res.json();
    },
    verifyCampaignDocument: async (token, campaignId, file) => {
        let body;
        if (file) {
            const fd = new FormData();
            fd.append('file', file);
            body = fd;
        }
        const res = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/verify`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || data.detail || `Verification failed (${res.status})`);
        return data;
    },
    updateCampaign: (token, campaignId, campaignData) => request(`/campaigns/${campaignId}`, { method: 'PUT', token, body: JSON.stringify(campaignData) }),
    closeCampaign: (token, campaignId) => request(`/campaigns/${campaignId}/close`, { method: 'PUT', token }),
    deleteCampaign: (token, campaignId) => request(`/campaigns/${campaignId}`, { method: 'DELETE', token }),
    donateToCampaign: (token, campaignId, amount, anonymous = false) => request(`/campaigns/${campaignId}/donate?amount=${amount}&anonymous=${anonymous}`, { method: 'POST', token }),
    getMyCreatedCampaigns: (token) => request('/campaigns/my', { token }),
    getDonationHistory: (token) => request('/campaigns/my-donations', { token }),
    getSavedCampaigns: (token, skip = 0, limit = 20) => request(`/campaigns/saved?skip=${skip}&limit=${limit}`, { token }),
    saveCampaign: (token, campaignId) => request(`/campaigns/${campaignId}/save`, { method: 'POST', token }),
    unsaveCampaign: (token, campaignId) => request(`/campaigns/${campaignId}/save`, { method: 'DELETE', token }),
    getPublicProfile: (token, userId) => request(`/users/${userId}/profile`, { token }),
    followUser: (token, userId) => request(`/users/${userId}/follow`, { method: 'POST', token }),
    unfollowUser: (token, userId) => request(`/users/${userId}/follow`, { method: 'DELETE', token }),
    getUserFollowers: (token, userId, skip = 0, limit = 20) => request(`/users/${userId}/followers?skip=${skip}&limit=${limit}`, { token }),
    getUserFollowing: (token, userId, skip = 0, limit = 20) => request(`/users/${userId}/following?skip=${skip}&limit=${limit}`, { token }),
    getUserCampaigns: (token, userId, skip = 0, limit = 20) => request(`/users/${userId}/campaigns?skip=${skip}&limit=${limit}`, { token }),
    getAdminStats: (token) => request('/admin/stats', { token }),
    getAdminUsers: (token, skip = 0, limit = 100) => request(`/admin/users?skip=${skip}&limit=${limit}`, { token }),
    getAdminCampaigns: (token, skip = 0, limit = 100) => request(`/admin/campaigns?skip=${skip}&limit=${limit}`, { token }),
    verifyCampaign: (campaign_id, token, verified = true) => request(`/admin/campaigns/${campaign_id}/verify?verified=${verified}`, { method: 'PUT', token }),
    adminDeleteCampaign: (campaign_id, token) => request(`/admin/campaigns/${campaign_id}`, { method: 'DELETE', token }),
    flagCampaign: (campaign_id, token, flagged = true) => request(`/admin/campaigns/${campaign_id}/flag?flagged=${flagged}`, { method: 'PUT', token }),
    deleteProfile: (token) => request('/auth/profile', { method: 'DELETE', token }),
    getUserTimeline: (token) => request('/users/me/timeline', { token }),
};
