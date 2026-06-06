import os
import sys
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from database import SessionLocal
from models import User, EmergencyContact, AuditLog, Campaign, Donation, CampaignUpdate, UpdateComment, UpdateLike, Follow, SavedCampaign, CampaignCreatorTrust, CampaignReport, VerificationReport
def delete_test_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        test_user_ids = []
        for u in users:
            email_lower = u.email.lower() if u.email else ''
            name_lower = u.name.lower() if u.name else ''
            if email_lower.startswith('test') or email_lower.endswith('@test.com') or email_lower == 'user@empathi.com' or name_lower.startswith('test') or (u.name == 'X'):
                test_user_ids.append(u.id)
        if not test_user_ids:
            print('No test users found.')
            return
        print(f'Found {len(test_user_ids)} test users to delete.')
        test_campaigns = db.query(Campaign).filter(Campaign.created_by.in_(test_user_ids)).all()
        test_campaign_ids = [c.id for c in test_campaigns]
        print(f'Found {len(test_campaign_ids)} campaigns created by test users to delete.')
        verification_reports_to_delete = db.query(VerificationReport).filter(VerificationReport.campaign_id.in_(test_campaign_ids)).all()
        print(f'Deleting {len(verification_reports_to_delete)} verification reports linked to test campaigns.')
        donations_to_delete_by_campaign = db.query(Donation).filter(Donation.campaign_id.in_(test_campaign_ids)).all()
        print(f'Deleting {len(donations_to_delete_by_campaign)} donations linked to test campaigns.')
        updates_by_campaign = db.query(CampaignUpdate).filter(CampaignUpdate.campaign_id.in_(test_campaign_ids)).all()
        update_ids_by_campaign = [u.id for u in updates_by_campaign]
        update_comments_to_delete_by_campaign = db.query(UpdateComment).filter(UpdateComment.update_id.in_(update_ids_by_campaign)).all() if update_ids_by_campaign else []
        print(f'Deleting {len(update_comments_to_delete_by_campaign)} update comments linked to test campaigns.')
        update_likes_to_delete_by_campaign = db.query(UpdateLike).filter(UpdateLike.update_id.in_(update_ids_by_campaign)).all() if update_ids_by_campaign else []
        print(f'Deleting {len(update_likes_to_delete_by_campaign)} update likes linked to test campaigns.')
        print(f'Deleting {len(updates_by_campaign)} updates linked to test campaigns.')
        saved_campaigns_to_delete_by_campaign = db.query(SavedCampaign).filter(SavedCampaign.campaign_id.in_(test_campaign_ids)).all()
        print(f'Deleting {len(saved_campaigns_to_delete_by_campaign)} saved campaigns entries linked to test campaigns.')
        campaign_reports_to_delete_by_campaign = db.query(CampaignReport).filter(CampaignReport.campaign_id.in_(test_campaign_ids)).all()
        print(f'Deleting {len(campaign_reports_to_delete_by_campaign)} campaign reports linked to test campaigns.')
        audit_logs_to_delete = db.query(AuditLog).filter(AuditLog.user_id.in_(test_user_ids)).all()
        print(f'Deleting {len(audit_logs_to_delete)} audit logs linked to test users.')
        donations_to_delete_by_user = db.query(Donation).filter(Donation.user_id.in_(test_user_ids)).all()
        print(f'Deleting {len(donations_to_delete_by_user)} donations made by test users.')
        updates_by_user = db.query(CampaignUpdate).filter(CampaignUpdate.created_by.in_(test_user_ids)).all()
        update_ids_by_user = [u.id for u in updates_by_user]
        update_comments_to_delete_by_user = db.query(UpdateComment).filter(UpdateComment.update_id.in_(update_ids_by_user)).all() if update_ids_by_user else []
        print(f'Deleting {len(update_comments_to_delete_by_user)} update comments linked to updates by test users.')
        update_likes_to_delete_by_user = db.query(UpdateLike).filter(UpdateLike.update_id.in_(update_ids_by_user)).all() if update_ids_by_user else []
        print(f'Deleting {len(update_likes_to_delete_by_user)} update likes linked to updates by test users.')
        print(f'Deleting {len(updates_by_user)} updates created by test users.')
        comments_by_test_users = db.query(UpdateComment).filter(UpdateComment.user_id.in_(test_user_ids)).all()
        print(f'Deleting {len(comments_by_test_users)} comments made by test users.')
        likes_by_test_users = db.query(UpdateLike).filter(UpdateLike.user_id.in_(test_user_ids)).all()
        print(f'Deleting {len(likes_by_test_users)} likes made by test users.')
        follows_to_delete = db.query(Follow).filter(Follow.follower_id.in_(test_user_ids) | Follow.following_id.in_(test_user_ids)).all()
        print(f'Deleting {len(follows_to_delete)} follow relationships linked to test users.')
        saved_campaigns_to_delete_by_user = db.query(SavedCampaign).filter(SavedCampaign.user_id.in_(test_user_ids)).all()
        print(f'Deleting {len(saved_campaigns_to_delete_by_user)} saved campaigns entries by test users.')
        campaign_reports_to_delete_by_user = db.query(CampaignReport).filter(CampaignReport.user_id.in_(test_user_ids)).all()
        print(f'Deleting {len(campaign_reports_to_delete_by_user)} campaign reports made by test users.')
        emergency_contacts_to_delete = db.query(EmergencyContact).filter(EmergencyContact.user_id.in_(test_user_ids)).all()
        print(f'Deleting {len(emergency_contacts_to_delete)} emergency contacts linked to test users.')
        trust_profiles_to_delete = db.query(CampaignCreatorTrust).filter(CampaignCreatorTrust.user_id.in_(test_user_ids)).all()
        print(f'Deleting {len(trust_profiles_to_delete)} creator trust profiles linked to test users.')
        print('\nStarting database cleanup...')
        comment_ids_to_del = set((c.id for c in comments_by_test_users + update_comments_to_delete_by_campaign + update_comments_to_delete_by_user))
        if comment_ids_to_del:
            db.query(UpdateComment).filter(UpdateComment.id.in_(comment_ids_to_del)).delete(synchronize_session=False)
        like_ids_to_del = set((l.id for l in likes_by_test_users + update_likes_to_delete_by_campaign + update_likes_to_delete_by_user))
        if like_ids_to_del:
            db.query(UpdateLike).filter(UpdateLike.id.in_(like_ids_to_del)).delete(synchronize_session=False)
        update_ids_to_del = set((u.id for u in updates_by_campaign + updates_by_user))
        if update_ids_to_del:
            db.query(CampaignUpdate).filter(CampaignUpdate.id.in_(update_ids_to_del)).delete(synchronize_session=False)
        if verification_reports_to_delete:
            vr_ids = [vr.id for vr in verification_reports_to_delete]
            db.query(VerificationReport).filter(VerificationReport.id.in_(vr_ids)).delete(synchronize_session=False)
        donation_ids_to_del = set((d.id for d in donations_to_delete_by_campaign + donations_to_delete_by_user))
        if donation_ids_to_del:
            db.query(Donation).filter(Donation.id.in_(donation_ids_to_del)).delete(synchronize_session=False)
        saved_campaign_ids_to_del = set((sc.id for sc in saved_campaigns_to_delete_by_campaign + saved_campaigns_to_delete_by_user))
        if saved_campaign_ids_to_del:
            db.query(SavedCampaign).filter(SavedCampaign.id.in_(saved_campaign_ids_to_del)).delete(synchronize_session=False)
        campaign_report_ids_to_del = set((cr.id for cr in campaign_reports_to_delete_by_campaign + campaign_reports_to_delete_by_user))
        if campaign_report_ids_to_del:
            db.query(CampaignReport).filter(CampaignReport.id.in_(campaign_report_ids_to_del)).delete(synchronize_session=False)
        if test_campaign_ids:
            db.query(Campaign).filter(Campaign.id.in_(test_campaign_ids)).delete(synchronize_session=False)
        if audit_logs_to_delete:
            al_ids = [al.id for al in audit_logs_to_delete]
            db.query(AuditLog).filter(AuditLog.id.in_(al_ids)).delete(synchronize_session=False)
        if emergency_contacts_to_delete:
            ec_ids = [ec.id for ec in emergency_contacts_to_delete]
            db.query(EmergencyContact).filter(EmergencyContact.id.in_(ec_ids)).delete(synchronize_session=False)
        if follows_to_delete:
            f_ids = [f.id for f in follows_to_delete]
            db.query(Follow).filter(Follow.id.in_(f_ids)).delete(synchronize_session=False)
        if trust_profiles_to_delete:
            tp_ids = [tp.id for tp in trust_profiles_to_delete]
            db.query(CampaignCreatorTrust).filter(CampaignCreatorTrust.id.in_(tp_ids)).delete(synchronize_session=False)
        db.query(User).filter(User.id.in_(test_user_ids)).delete(synchronize_session=False)
        db.commit()
        print('\nAll test users and their related entities have been successfully deleted!')
    except Exception as e:
        db.rollback()
        print(f'\nTransaction failed and was rolled back: {e}')
        raise e
    finally:
        db.close()
if __name__ == '__main__':
    delete_test_users()
