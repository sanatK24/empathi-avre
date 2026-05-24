import requests
from PIL import Image
import io

img = Image.new('RGB', (100, 100), color='white')
img_byte_arr = io.BytesIO()
img.save(img_byte_arr, format='PNG')
img_bytes = img_byte_arr.getvalue()

try:
    files = {'file': ('dummy.png', img_bytes, 'image/png')}
    res = requests.post("http://127.0.0.1:8000/api/v1/campaigns/verify-document-preview", files=files)
    print("STATUS:", res.status_code)
    print("RESPONSE:", res.json())
except Exception as e:
    print("Error:", e)
