"""
Donation and Payment flow tests
Tests for complete donation and payment processing
"""
import pytest

@pytest.mark.api
class TestDonationFlow:
    """Donation processing tests"""

    def test_create_donation(self, authenticated_client, test_campaign_data, test_donation_data):
        """Test creating a donation"""
        # Create campaign first
        campaign_response = authenticated_client.post('/campaigns', json=test_campaign_data)
        campaign_id = campaign_response.json()['id']

        # Create donation via payment endpoint
        payment_data = {
            'campaign_id': campaign_id,
            'amount': test_donation_data['amount'],
            'payment_method': 'upi',
            'anonymous': test_donation_data['anonymous'],
            'message': test_donation_data['message'],
            'donor_details': {
                'full_name': 'Test Donor',
                'email': 'donor@test.com'
            }
        }

        response = authenticated_client.post('/payments/process', json=payment_data)

        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'success'
        assert 'transaction_id' in data
        assert 'donation_id' in data

    def test_get_my_donations(self, authenticated_client, test_campaign_data, test_donation_data):
        """Test retrieving user's donations"""
        # Create campaign
        campaign_response = authenticated_client.post('/campaigns', json=test_campaign_data)
        campaign_id = campaign_response.json()['id']

        # Make donation
        payment_data = {
            'campaign_id': campaign_id,
            'amount': test_donation_data['amount'],
            'payment_method': 'upi',
            'anonymous': False,
            'message': 'Test',
            'donor_details': {}
        }
        authenticated_client.post('/payments/process', json=payment_data)

        # Get my donations
        response = authenticated_client.get('/donations/me')

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_donation_updates_campaign_total(self, authenticated_client, test_campaign_data, test_donation_data):
        """Test that donation updates campaign raised amount"""
        # Create campaign
        campaign_response = authenticated_client.post('/campaigns', json=test_campaign_data)
        campaign_id = campaign_response.json()['id']
        initial_raised = campaign_response.json()['raised_amount']

        # Make donation
        payment_data = {
            'campaign_id': campaign_id,
            'amount': test_donation_data['amount'],
            'payment_method': 'upi',
            'anonymous': False,
            'message': '',
            'donor_details': {}
        }
        authenticated_client.post('/payments/process', json=payment_data)

        # Check campaign totals
        get_response = authenticated_client.get(f'/campaigns/{campaign_id}')
        updated_raised = get_response.json()['raised_amount']

        assert updated_raised == initial_raised + test_donation_data['amount']

    def test_campaign_auto_completion_on_donation(self, authenticated_client, test_campaign_data):
        """Test campaign auto-completes when goal reached via donation"""
        campaign_data = test_campaign_data.copy()
        campaign_data['goal_amount'] = 100

        # Create campaign
        campaign_response = authenticated_client.post('/campaigns', json=campaign_data)
        campaign_id = campaign_response.json()['id']

        # Make donation that reaches goal
        payment_data = {
            'campaign_id': campaign_id,
            'amount': 100,
            'payment_method': 'upi',
            'anonymous': False,
            'message': '',
            'donor_details': {}
        }
        authenticated_client.post('/payments/process', json=payment_data)

        # Check campaign status
        get_response = authenticated_client.get(f'/campaigns/{campaign_id}')
        status = get_response.json()['status']

        assert status == 'completed'

    def test_get_campaign_donations(self, authenticated_client, test_campaign_data, test_donation_data):
        """Test retrieving public donors list"""
        # Create campaign
        campaign_response = authenticated_client.post('/campaigns', json=test_campaign_data)
        campaign_id = campaign_response.json()['id']

        # Make public donation
        payment_data = {
            'campaign_id': campaign_id,
            'amount': test_donation_data['amount'],
            'payment_method': 'upi',
            'anonymous': False,
            'message': 'Great cause!',
            'donor_details': {}
        }
        authenticated_client.post('/payments/process', json=payment_data)

        # Get campaign donations
        response = authenticated_client.get(f'/campaigns/{campaign_id}/donations')

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_anonymous_donation_privacy(self, authenticated_client, test_campaign_data):
        """Test that anonymous donations don't show donor name"""
        # Create campaign
        campaign_response = authenticated_client.post('/campaigns', json=test_campaign_data)
        campaign_id = campaign_response.json()['id']

        # Make anonymous donation
        payment_data = {
            'campaign_id': campaign_id,
            'amount': 500,
            'payment_method': 'upi',
            'anonymous': True,
            'message': 'Secret support',
            'donor_details': {}
        }
        authenticated_client.post('/payments/process', json=payment_data)

        # Get donations (anonymous should not appear)
        response = authenticated_client.get(f'/campaigns/{campaign_id}/donations')

        data = response.json()
        # Anonymous donations should not be in public list
        assert len(data) == 0

    def test_get_donation_stats(self, authenticated_client, test_campaign_data):
        """Test getting campaign donation statistics"""
        # Create campaign
        campaign_response = authenticated_client.post('/campaigns', json=test_campaign_data)
        campaign_id = campaign_response.json()['id']

        # Make multiple donations
        for i in range(3):
            payment_data = {
                'campaign_id': campaign_id,
                'amount': 100 * (i + 1),
                'payment_method': 'upi',
                'anonymous': False,
                'message': f'Donation {i+1}',
                'donor_details': {}
            }
            authenticated_client.post('/payments/process', json=payment_data)

        # Get stats
        response = authenticated_client.get(f'/donations/campaign/{campaign_id}/stats')

        assert response.status_code == 200
        data = response.json()
        assert data['total_donations'] == 3
        assert data['total_raised'] == 600  # 100 + 200 + 300
        assert data['average_donation'] == 200

@pytest.mark.api
class TestPaymentProcessing:
    """Payment method testing"""

    @pytest.mark.parametrize('payment_method', ['upi', 'card', 'wallet', 'bank'])
    def test_all_payment_methods(self, authenticated_client, test_campaign_data, test_payment_data, payment_method):
        """Test all payment methods"""
        # Create campaign
        campaign_response = authenticated_client.post('/campaigns', json=test_campaign_data)
        campaign_id = campaign_response.json()['id']

        # Get payment details for method
        payment_details = test_payment_data[payment_method]

        # Make payment
        payment_data = {
            'campaign_id': campaign_id,
            'amount': 500,
            'payment_method': payment_method,
            'anonymous': False,
            'message': f'Test {payment_method}',
            'donor_details': payment_details
        }

        response = authenticated_client.post('/payments/process', json=payment_data)

        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'success'
        assert data['payment_method'] == payment_method

    def test_get_payment_methods(self, authenticated_client):
        """Test retrieving available payment methods"""
        response = authenticated_client.get('/payments/methods')

        assert response.status_code == 200
        data = response.json()
        assert 'methods' in data
        methods = data['methods']
        assert len(methods) == 4
        method_ids = [m['id'] for m in methods]
        assert 'upi' in method_ids
        assert 'card' in method_ids
        assert 'wallet' in method_ids
        assert 'bank' in method_ids

    def test_get_payment_history(self, authenticated_client, test_campaign_data):
        """Test retrieving payment history"""
        # Make some payments
        for i in range(2):
            campaign_response = authenticated_client.post('/campaigns', json=test_campaign_data)
            campaign_id = campaign_response.json()['id']

            payment_data = {
                'campaign_id': campaign_id,
                'amount': 100,
                'payment_method': 'upi',
                'anonymous': False,
                'message': '',
                'donor_details': {}
            }
            authenticated_client.post('/payments/process', json=payment_data)

        # Get history
        response = authenticated_client.get('/payments/history')

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2

    def test_payment_failure_simulation(self, authenticated_client, test_campaign_data):
        """Test simulated payment failures (5% of time)"""
        # Create campaign
        campaign_response = authenticated_client.post('/campaigns', json=test_campaign_data)
        campaign_id = campaign_response.json()['id']

        # Try multiple payments to potentially hit the 5% failure
        failures = 0
        successes = 0

        for i in range(20):
            payment_data = {
                'campaign_id': campaign_id,
                'amount': 100,
                'payment_method': 'upi',
                'anonymous': False,
                'message': '',
                'donor_details': {}
            }
            response = authenticated_client.post('/payments/process', json=payment_data)
            data = response.json()

            if data.get('status') == 'success':
                successes += 1
            else:
                failures += 1

        # Should have mostly successes (95%) but some failures possible
        assert successes >= 15  # At least 75% success rate in 20 tries

@pytest.mark.integration
class TestDonationIntegration:
    """Integration tests for full donation flow"""

    def test_end_to_end_donation_flow(self, authenticated_client, test_campaign_data, test_donation_data):
        """Test complete donation flow from campaign creation to payment"""
        # 1. Create campaign
        campaign_response = authenticated_client.post('/campaigns', json=test_campaign_data)
        assert campaign_response.status_code == 201
        campaign_id = campaign_response.json()['id']

        # 2. Verify campaign exists
        get_response = authenticated_client.get(f'/campaigns/{campaign_id}')
        assert get_response.status_code == 200
        assert get_response.json()['raised_amount'] == 0

        # 3. Make donation
        payment_data = {
            'campaign_id': campaign_id,
            'amount': test_donation_data['amount'],
            'payment_method': 'upi',
            'anonymous': test_donation_data['anonymous'],
            'message': test_donation_data['message'],
            'donor_details': {}
        }
        payment_response = authenticated_client.post('/payments/process', json=payment_data)
        assert payment_response.status_code == 200
        assert payment_response.json()['status'] == 'success'

        # 4. Verify campaign updated
        updated_campaign = authenticated_client.get(f'/campaigns/{campaign_id}')
        assert updated_campaign.json()['raised_amount'] == test_donation_data['amount']

        # 5. Verify donation in history
        history_response = authenticated_client.get('/donations/me')
        assert len(history_response.json()) > 0

        # 6. Verify in campaign donations
        campaign_donations = authenticated_client.get(f'/campaigns/{campaign_id}/donations')
        assert len(campaign_donations.json()) > 0
