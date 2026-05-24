try:
    from paddleocr import PaddleOCRVL
    pipeline = PaddleOCRVL(pipeline_version="v1.5")
    print("SUCCESS")
except Exception as e:
    import traceback
    traceback.print_exc()
