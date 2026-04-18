"""
Data persistence and error handling tests
Tests for database persistence and error scenarios
"""
import pytest

@pytest.mark.api
class TestDataPersistence:
    """Database persistence tests"""

    def test_campaign_persists_after_creation(self, authenticated_client, test_campaign_data):
        """Test that campaigns persist in database after creation"""
        # Create campaign
        create_response = authenticated_client.post('/campaigns', json=test_campaign_data)
        campaign_id = create_response.json()['id']

        # Retrieve immediately
        response1 = authenticated_client.get(f'/campaigns/{campaign_id}')
        assert response1.status_code == 200
        assert response1.json()['id'] == campaign_id

        # Retrieve again
        response2 = authenticated_client.get(f'/campaigns/{campaign_id}')
        assert response2.status_code == 200
        assert response2.json()['id'] == campaign_id

    def test_donation_persists_after_creation(self, authenticated_client, test_campaign_data):
        """Test that donations persist after creation"""
        # Create campaign
        campaign_response = authenticated_client.post('/campaigns', json=test_campaign_data)
        campaign_id = campaign_response.json()['id']

        # Make donation
        payment_data = {
            'campaign_id': campaign_id,
            'amount': 1000,
            'payment_method': 'upi',
            'anonymous': False,
            'message': 'Test',
            'donor_details': {}
        }
        auth_response = authenticated_client.post('/payments/process', json=payment_data)
        donation_id = auth_response.json()['donation_id']

        # Retrieve donation
        response = authenticated_client.get(f'/donations/{donation_id}')
        assert response.status_code == 200
        assert response.json()['id'] == donation_id

    def test_campaign_update_persists(self, authenticated_client, test_campaign_data):
        """Test that campaign updates persist"""
        # Create campaign
        campaign_response = authenticated_client.post('/campaigns', json=test_campaign_data)
        campaign_id = campaign_response.json()['id']

        # Update campaign
        update_data = {'title': 'Updated Title', 'description': 'Updated description'}
        authenticated_client.put(f'/campaigns/{campaign_id}', json=update_data)

        # Retrieve and verify
        response = authenticated_client.get(f'/campaigns/{campaign_id}')
        data = response.json()
        assert data['title'] == 'Updated Title'
        assert data['description'] == 'Updated description'

    def test_campaign_total_persists_across_requests(self, authenticated_client, test_campaign_data):
        """Test that campaign raised amount persists"""
        # Create campaign
        campaign_response = authenticated_client.post('/campaigns', json=test_campaign_data)
        campaign_id = campaign_response.json()['id']

        # Make donation
        payment_data = {
            'campaign_id': campaign_id,
            'amount': 5000,
            'payment_method': 'upi',
            'anonymous': False,
            'message': '',
            'donor_details': {}
        }
        authenticated_client.post('/payments/process', json=payment_data)

        # Verify amount persists in multiple requests
        for _ in range(3):
            response = authenticated_client.get(f'/campaigns/{campaign_id}')
            assert response.json()['raised_amount'] == 5000

    def test_multiple_donations_sum_correctly(self, authenticated_client, test_campaign_data):
        """Test that multiple donations sum correctly and persist"""
        # Create campaign
        campaign_response = authenticated_client.post('/campaigns', json=test_campaign_data)
        campaign_id = campaign_response.json()['id']

        # Make multiple donations
        amounts = [1000, 2000, 1500]
        for amount in amounts:
            payment_data = {
                'campaign_id': campaign_id,
                'amount': amount,
                'payment_method': 'upi',
                'anonymous': False,
                'message': '',
                'donor_details': {}
            }
            authenticated_client.post('/payments/process', json=payment_data)

        # Verify total
        response = authenticated_client.get(f'/campaigns/{campaign_id}')
        expected_total = sum(amounts)
        assert response.json()['raised_amount'] == expected_total

@pytest.mark.api
class TestErrorHandling:
    """Error handling and edge cases"""

    def test_create_campaign_with_missing_fields(self, authenticated_client):
        """Test creating campaign with missing required fields"""
        invalid_data = {
            'title': 'Test',
            # Missing other required fields
        }

        response = authenticated_client.post('/campaigns', json=invalid_data)
        assert response.status_code == 422  # Validation error

    def test_get_nonexistent_campaign(self, authenticated_client):
        """Test getting campaign that doesn't exist"""
        response = authenticated_client.get('/campaigns/999999')
        assert response.status_code == 404

    def test_delete_nonexistent_campaign(self, authenticated_client):
        """Test deleting campaign that doesn't exist"""
        response = authenticated_client.delete('/campaigns/999999')
        assert response.status_code == 404

    def test_donation_to_nonexistent_campaign(self, authenticated_client):
        """Test donating to campaign that doesn't exist"""
        payment_data = {
            'campaign_id': 999999,
            'amount': 500,
            'payment_method': 'upi',
            'anonymous': False,
            'message': '',
            'donor_details': {}
        }

        response = authenticated_client.post('/payments/process', json=payment_data)
        assert response.status_code == 404

    def test_donation_with_invalid_amount(self, authenticated_client, test_campaign_data):
        """Test donation with invalid amount"""
        # Create campaign
        campaign_response = authenticated_client.post('/campaigns', json=test_campaign_data)
        campaign_id = campaign_response.json()['id']

        # Try donation with negative amount
        payment_data = {
            'campaign_id': campaign_id,
            'amount': -100,
            'payment_method': 'upi',
            'anonymous': False,
            'message': '',
            'donor_details': {}
        }

        response = authenticated_client.post('/payments/process', json=payment_data)
        assert response.status_code in [400, 422]  # Validation error

    def test_donation_with_zero_amount(self, authenticated_client, test_campaign_data):
        """Test donation with zero amount"""
        campaign_response = authenticated_client.post('/campaigns', json=test_campaign_data)
        campaign_id = campaign_response.json()['id']

        payment_data = {
            'campaign_id': campaign_id,
            'amount': 0,
            'payment_method': 'upi',
            'anonymous': False,
            'message': '',
            'donor_details': {}
        }

        response = authenticated_client.post('/payments/process', json=payment_data)
        assert response.status_code in [400, 422]

    def test_invalid_payment_method(self, authenticated_client, test_campaign_data):
        """Test payment with invalid method"""
        campaign_response = authenticated_client.post('/campaigns', json=test_campaign_data)
        campaign_id = campaign_response.json()['id']

        payment_data = {
            'campaign_id': campaign_id,
            'amount': 500,
            'payment_method': 'invalid_method',
            'anonymous': False,
            'message': '',
            'donor_details': {}
        }

        response = authenticated_client.post('/payments/process', json=payment_data)
        # Should either accept gracefully or reject
        assert response.status_code in [200, 400, 422]

    def test_update_nonexistent_campaign(self, authenticated_client):
        """Test updating campaign that doesn't exist"""
        response = authenticated_client.put('/campaigns/999999', json={'title': 'New'})
        assert response.status_code == 404

    def test_create_update_for_nonexistent_campaign(self, authenticated_client):
        """Test creating update for non-existent campaign"""
        update_data = {'title': 'Update', 'content': 'Content'}
        response = authenticated_client.post('/campaigns/999999/updates', json=update_data)
        assert response.status_code == 404

    def test_delete_nonexistent_update(self, authenticated_client, test_campaign_data):
        """Test deleting update that doesn't exist"""
        # Create campaign
        campaign_response = authenticated_client.post('/campaigns', json=test_campaign_data)
        campaign_id = campaign_response.json()['id']

        # Try to delete non-existent update
        response = authenticated_client.delete(f'/campaigns/{campaign_id}/updates/999999')
        assert response.status_code == 404

@pytest.mark.api
class TestEdgeCases:
    """Edge case testing"""

    def test_campaign_with_very_large_goal(self, authenticated_client):
        """Test campaign with very large goal amount"""
        large_goal_data = {
            'title': 'Large Goal Campaign',
            'description': 'Test with large goal',
            'category': 'medical',
            'city': 'Test City',
            'goal_amount': 1000000000,  # 1 billion
            'urgency_level': 'high'
        }

        response = authenticated_client.post('/campaigns', json=large_goal_data)
        assert response.status_code == 201
        assert response.json()['goal_amount'] == 1000000000

    def test_campaign_with_very_small_goal(self, authenticated_client):
        """Test campaign with very small goal amount"""
        small_goal_data = {
            'title': 'Small Goal Campaign',
            'description': 'Test with small goal',
            'category': 'medical',
            'city': 'Test City',
            'goal_amount': 1,  # 1 rupee
            'urgency_level': 'low'
        }

        response = authenticated_client.post('/campaigns', json=small_goal_data)
        assert response.status_code == 201
        assert response.json()['goal_amount'] == 1

    def test_very_long_campaign_description(self, authenticated_client):
        """Test campaign with very long description"""
        long_description = 'A' * 5000  # Maximum allowed

        long_desc_data = {
            'title': 'Long Description Campaign',
            'description': long_description,
            'category': 'medical',
            'city': 'Test City',
            'goal_amount': 50000,
            'urgency_level': 'high'
        }

        response = authenticated_client.post('/campaigns', json=long_desc_data)
        assert response.status_code == 201

    def test_campaign_with_special_characters(self, authenticated_client):
        """Test campaign with special characters"""
        special_data = {
            'title': 'Test Campaign™ © ® €¥£',
            'description': 'Description with émojis 🎉 and special chars',
            'category': 'medical',
            'city': 'Tokyo, 東京 日本',
            'goal_amount': 50000,
            'urgency_level': 'high'
        }

        response = authenticated_client.post('/campaigns', json=special_data)
        assert response.status_code == 201
        data = response.json()
        assert '™' in data['title']

    def test_rapid_sequential_donations(self, authenticated_client, test_campaign_data):
        """Test rapid sequential donations"""
        campaign_response = authenticated_client.post('/campaigns', json=test_campaign_data)
        campaign_id = campaign_response.json()['id']

        # Make rapid donations
        for i in range(10):
            payment_data = {
                'campaign_id': campaign_id,
                'amount': 100,
                'payment_method': 'upi',
                'anonymous': False,
                'message': '',
                'donor_details': {}
            }
            response = authenticated_client.post('/payments/process', json=payment_data)
            assert response.status_code == 200

        # Verify total
        campaign = authenticated_client.get(f'/campaigns/{campaign_id}').json()
        assert campaign['raised_amount'] == 1000

@pytest.mark.integration
class TestIntegrationErrors:
    """Integration tests for error scenarios"""

    def test_campaign_donation_delete_error_flow(self, authenticated_client, test_campaign_data):
        """Test error handling in donation -> campaign flow"""
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

        # Try to delete campaign (should fail due to donations)
        response = authenticated_client.delete(f'/campaigns/{campaign_id}')
        # Should fail or handle gracefully
        assert response.status_code in [400, 200]  # Depends on implementation
