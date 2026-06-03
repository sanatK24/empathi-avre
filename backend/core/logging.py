import logging
import sys
from typing import Any

def setup_logging():
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', stream=sys.stdout)
    logger = logging.getLogger('EmpathI')
    return logger
logger = setup_logging()

def log_info(message: str, **kwargs: Any):
    logger.info(f'{message} | {kwargs}')

def log_error(message: str, error: Exception, **kwargs: Any):
    logger.error(f'{message} | Error: {str(error)} | {kwargs}', exc_info=True)

def log_warning(message: str, **kwargs: Any):
    logger.warning(f'{message} | {kwargs}')