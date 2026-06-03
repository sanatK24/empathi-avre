import os
import uuid
import logging
import requests
from typing import Optional
from config import settings
logger = logging.getLogger(__name__)

class StorageService:

    def __init__(self):
        self.supabase_url = settings.SUPABASE_URL
        self.supabase_key = settings.SUPABASE_KEY
        self.bucket_name = 'verification_documents'
        if self.supabase_url and self.supabase_key:
            logger.info('Supabase credentials found. Storage service ready.')
        else:
            logger.warning('SUPABASE_URL or SUPABASE_KEY not found. Document storage will use mocks.')

    def upload_document(self, file_bytes: bytes, filename: str, content_type: str) -> str:
        if not self.supabase_url or not self.supabase_key:
            logger.warning('Supabase credentials missing. Mocking document upload.')
            return f'https://mock-supabase.local/storage/v1/object/public/{self.bucket_name}/mock-{filename}'
        try:
            unique_filename = f'{uuid.uuid4()}-{filename}'
            url = f'{self.supabase_url}/storage/v1/object/{self.bucket_name}/{unique_filename}'
            headers = {'Authorization': f'Bearer {self.supabase_key}', 'apikey': self.supabase_key, 'Content-Type': content_type}
            response = requests.post(url, headers=headers, data=file_bytes, timeout=15)
            if response.status_code in (200, 201):
                public_url = f'{self.supabase_url}/storage/v1/object/public/{self.bucket_name}/{unique_filename}'
                return public_url
            else:
                logger.error(f'Supabase upload failed: {response.status_code} - {response.text}')
                raise Exception('Failed to upload verification document to storage.')
        except Exception as e:
            logger.error(f'Error uploading document to Supabase: {e}')
            raise Exception('Failed to upload verification document to storage.')
storage_service = StorageService()