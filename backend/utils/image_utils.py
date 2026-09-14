import numpy as np

def extract_crop(image: np.ndarray, xmin: int, ymin: int, xmax: int, ymax: int, padding: int = 10) -> tuple[np.ndarray, int, int]:
    """
    Extracts a local crop around a bounding box, applying padding if possible.
    image: (H, W, C)
    Returns: (crop_array, start_x, start_y) - start_x and start_y are the offsets in the original image.
    """
    H, W = image.shape[:2]
    
    start_y = max(0, ymin - padding)
    end_y = min(H, ymax + padding)
    start_x = max(0, xmin - padding)
    end_x = min(W, xmax + padding)
    
    crop = image[start_y:end_y, start_x:end_x]
    
    return crop, start_x, start_y
