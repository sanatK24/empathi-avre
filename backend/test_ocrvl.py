import tempfile
import os
from PIL import Image

# create dummy image
img_path = "dummy.png"
Image.new('RGB', (100, 100), color = 'white').save(img_path)

try:
    from paddleocr import PaddleOCRVL
    pipeline = PaddleOCRVL(pipeline_version="v1.5")
    output = pipeline.predict(img_path)
    for res in output:
        print("ATTRIBUTES:")
        print(dir(res))
        break
except Exception as e:
    print(f"Error: {e}")
finally:
    if os.path.exists(img_path):
        os.remove(img_path)
