"""
Analytics and ML Recommendations tests
Tests for analytics dashboard and recommendation scoring
"""
import pytest

@pytest.mark.api
class TestAnalyticsDashboard:
    """Analytics dashboard tests"""

    def test_get_analytics_dashboard(self, authenticated_client):
        """Test retrieving analytics dashboard"""
        response = authenticated_client.get('/campaigns/analytics/dashboard')

        assert response.status_code == 200
        data = response.json()

        # Check summary metrics
        assert 'summary' in data
        summary = data['summary']
        assert 'total_campaigns' in summary
        assert 'active_campaigns' in summary
        assert 'completed_campaigns' in summary
        assert 'total_donations' in summary
        assert 'total_raised' in summary
        assert 'unique_donors' in summary
        assert 'average_donation' in summary
        assert 'completion_rate' in summary

        # Check category breakdown
        assert 'by_category' in data
        assert isinstance(data['by_category'], list)

        # Check 7-day trend
        assert 'trend_7days' in data
        assert isinstance(data['trend_7days'], list)

    def test_analytics_summary_accuracy(self, authenticated_client, test_campaign_data):
        """Test analytics summary calculations"""
        # Create campaign and donation
        campaign_response = authenticated_client.post('/campaigns', json=test_campaign_data)
        campaign_id = campaign_response.json()['id']

        # Make donation
        payment_data = {
            'campaign_id': campaign_id,
            'amount': 1000,
            'payment_method': 'upi',
            'anonymous': False,
            'message': '',
            'donor_details': {}
        }
        authenticated_client.post('/payments/process', json=payment_data)

        # Get dashboard
        response = authenticated_client.get('/campaigns/analytics/dashboard')
        data = response.json()
        summary = data['summary']

        # Verify summary is accurate
        assert summary['total_donations'] > 0
        assert summary['total_raised'] >= 1000
        assert summary['unique_donors'] > 0

@pytest.mark.api
class TestMLRecommendations:
    """ML-based recommendations tests"""

    def test_get_personalized_recommendations(self, authenticated_client):
        """Test getting personalized recommendations"""
        response = authenticated_client.get('/campaigns/analytics/recommendations/personalized?limit=6')

        assert response.status_code == 200
        data = response.json()

        assert isinstance(data, list)
        # Should have at most 6 recommendations
        assert len(data) <= 6

    def test_recommendation_scoring_factors(self, authenticated_client, test_campaign_data):
        """Test that recommendations consider multiple factors"""
        # Create campaign
        campaign_response = authenticated_client.post('/campaigns', json=test_campaign_data)

        # Get recommendations
        response = authenticated_client.get('/campaigns/analytics/recommendations/personalized')

        data = response.json()
        assert isinstance(data, list)

        if len(data) > 0:
            recommendation = data[0]
            # Check recommendation structure
            assert 'id' in recommendation
            assert 'title' in recommendation
            assert 'category' in recommendation
            assert 'city' in recommendation
            assert 'score' in recommendation
            assert 'reason' in recommendation
            assert 'progress' in recommendation

    def test_recommendation_score_range(self, authenticated_client):
        """Test that recommendation scores are in valid range"""
        response = authenticated_client.get('/campaigns/analytics/recommendations/personalized')

        data = response.json()

        for rec in data:
            # Scores should be 0-100
            assert 0 <= rec['score'] <= 100

    def test_recommendation_reasons_readable(self, authenticated_client):
        """Test that recommendation reasons are human-readable"""
        response = authenticated_client.get('/campaigns/analytics/recommendations/personalized')

        data = response.json()

        for rec in data:
            reason = rec['reason']
            # Should be a string with meaningful content
            assert isinstance(reason, str)
            assert len(reason) > 0

@pytest.mark.api
class TestCampaignPerformance:
    """Campaign performance metrics tests"""

    def test_get_campaign_performance(self, authenticated_client, test_campaign_data):
        """Test retrieving campaign performance metrics"""
        # Create campaign
        campaign_response = authenticated_client.post('/campaigns', json=test_campaign_data)
        campaign_id = campaign_response.json()['id']

        # Get performance
        response = authenticated_client.get(f'/campaigns/analytics/{campaign_id}/performance')

        assert response.status_code == 200
        data = response.json()

        # Check performance metrics
        assert 'campaign_id' in data
        assert 'metrics' in data
        metrics = data['metrics']

        assert 'goal_amount' in metrics
        assert 'raised_amount' in metrics
        assert 'progress_percentage' in metrics
        assert 'total_donations' in metrics
        assert 'unique_donors' in metrics
        assert 'average_donation' in metrics
        assert 'days_active' in metrics
        assert 'donation_velocity' in metrics

    def test_performance_calculations(self, authenticated_client, test_campaign_data):
        """Test performance metric calculations"""
        campaign_data = test_campaign_data.copy()
        campaign_data['goal_amount'] = 5000

        # Create campaign
        campaign_response = authenticated_client.post('/campaigns', json=campaign_data)
        campaign_id = campaign_response.json()['id']

        # Make donations
        for i in range(3):
            payment_data = {
                'campaign_id': campaign_id,
                'amount': 500,
                'payment_method': 'upi',
                'anonymous': False,
                'message': '',
                'donor_details': {}
            }
            authenticated_client.post('/payments/process', json=payment_data)

        # Get performance
        response = authenticated_client.get(f'/campaigns/analytics/{campaign_id}/performance')
        metrics = response.json()['metrics']

        # Verify calculations
        assert metrics['raised_amount'] == 1500
        assert metrics['total_donations'] == 3
        assert metrics['average_donation'] == 500
        assert metrics['progress_percentage'] == 30.0  # 1500/5000 * 100

    def test_top_supporters_listed(self, authenticated_client, test_campaign_data):
        """Test that top supporters are listed"""
        # Create campaign
        campaign_response = authenticated_client.post('/campaigns', json=test_campaign_data)
        campaign_id = campaign_response.json()['id']

        # Make donation
        payment_data = {
            'campaign_id': campaign_id,
            'amount': 1000,
            'payment_method': 'upi',
            'anonymous': False,
            'message': '',
            'donor_details': {}
        }
        authenticated_client.post('/payments/process', json=payment_data)

        # Get performance
        response = authenticated_client.get(f'/campaigns/analytics/{campaign_id}/performance')
        data = response.json()

        # Check top supporters
        assert 'top_supporters' in data
        supporters = data['top_supporters']
        assert isinstance(supporters, list)

@pytest.mark.api
class TestSimilarCampaigns:
    """Similar campaigns recommendation tests"""

    def test_get_similar_campaigns(self, authenticated_client, test_campaign_data):
        """Test getting similar campaigns"""
        # Create campaign
        campaign_response = authenticated_client.post('/campaigns', json=test_campaign_data)
        campaign_id = campaign_response.json()['id']

        # Get similar
        response = authenticated_client.get(f'/campaigns/analytics/{campaign_id}/similar')

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_similar_campaigns_filter(self, authenticated_client, test_campaign_data):
        """Test that similar campaigns match criteria"""
        # Create multiple campaigns
        campaign_response = authenticated_client.post('/campaigns', json=test_campaign_data)
        campaign_id = campaign_response.json()['id']
        original_category = test_campaign_data['category']
        original_city = test_campaign_data['city']

        # Create another campaign with same category
        similar_data = test_campaign_data.copy()
        similar_data['title'] = 'Similar Campaign'
        authenticated_client.post('/campaigns', json=similar_data)

        # Get similar
        response = authenticated_client.get(f'/campaigns/analytics/{campaign_id}/similar')
        data = response.json()

        # All similar campaigns should match category or city
        for campaign in data:
            assert campaign['category'] == original_category or campaign['city'] == original_city

@pytest.mark.smoke
class TestAnalyticsSmoke:
    """Smoke tests for analytics"""

    def test_analytics_endpoints_all_200(self, authenticated_client):
        """Test that all analytics endpoints return 200"""
        endpoints = [
            '/campaigns/analytics/dashboard',
            '/campaigns/analytics/recommendations/personalized'
        ]

        for endpoint in endpoints:
            response = authenticated_client.get(endpoint)
            assert response.status_code == 200, f'Endpoint {endpoint} returned {response.status_code}'
