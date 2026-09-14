import cv2
import numpy as np
from skimage.segmentation import watershed
from skimage.feature import peak_local_max
from scipy import ndimage as ndi

def segment_crown_watershed(crop: np.ndarray, local_centroid_x: int, local_centroid_y: int) -> tuple[bool, np.ndarray]:
    """
    Applies Marker-Controlled Watershed to extract a single tree crown mask.
    Returns: (is_valid, mask)
    is_valid is False if segmentation fails quality checks.
    mask is a boolean 2D array of the same H, W as crop.
    """
    try:
        # 1. Vegetation / Foreground mask
        # Convert to grayscale and apply basic Otsu thresholding
        # In a real forestry app, calculating NDVI or ExG from RGB would be better
        gray = cv2.cvtColor(crop, cv2.COLOR_RGB2GRAY)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Otsu's thresholding
        _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # 2. Distance transform
        distance = ndi.distance_transform_edt(thresh)
        
        # 3. Create markers
        markers = np.zeros(distance.shape, dtype=int)
        
        # Marker 1: The tree we care about (from DeepForest centroid)
        H, W = markers.shape
        cy = int(min(max(local_centroid_y, 0), H - 1))
        cx = int(min(max(local_centroid_x, 0), W - 1))
        markers[cy, cx] = 1
        
        # Marker 2: Background (edges of the crop where it's likely not this tree)
        # We can set the borders as background markers (label 2)
        markers[0, :] = 2
        markers[-1, :] = 2
        markers[:, 0] = 2
        markers[:, -1] = 2
        
        # 4. Watershed
        labels = watershed(-distance, markers, mask=thresh)
        
        # 5. Extract the target crown (label == 1)
        crown_mask = (labels == 1)
        
        # 6. Quality Checks
        pixel_count = np.sum(crown_mask)
        if pixel_count < 10:
            return False, crown_mask # Too small to be valid
            
        # If the mask covers almost the entire crop, it likely under-segmented
        total_pixels = H * W
        if pixel_count > total_pixels * 0.9:
            return False, crown_mask
            
        return True, crown_mask
        
    except Exception as e:
        # Fallback to circular if watershed fails unexpectedly
        return False, np.zeros(crop.shape[:2], dtype=bool)
