import os
import time

# Ensure we don't try to use MKLDNN on incompatible CPUs
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"

from ml.hf_services import hf_services

def test_document_extraction():
    image_path = r"C:\Users\sanat\OneDrive\Desktop\emma report.png"
    
    print(f"Loading image from: {image_path}")
    
    if not os.path.exists(image_path):
        print("Error: Image file not found! Please check the path.")
        return

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    print("Starting document analysis with PaddleOCR-VL-1.5...")
    start_time = time.time()
    
    try:
        # Run the extraction (this will do the cold start if not cached)
        markdown_result = hf_services.extract_document_text(image_bytes)
        
        end_time = time.time()
        elapsed = end_time - start_time
        
        print("\n" + "="*50)
        print("SUCCESS! Extraction completed in {:.2f} seconds".format(elapsed))
        print("="*50)
        print("\nEXTRACTED MARKDOWN:\n")
        print(markdown_result)
        print("\n" + "="*50)
        
    except Exception as e:
        print("\nError during extraction:")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_document_extraction()
