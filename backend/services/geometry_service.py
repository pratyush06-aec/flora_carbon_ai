import cv2
import numpy as np
from shapely.geometry import Polygon
from typing import Optional

def mask_to_polygon(mask: np.ndarray, offset_x: int, offset_y: int) -> Optional[Polygon]:
    """
    Converts a boolean mask into a Shapely Polygon, offsetting it back to global image coordinates.
    """
    # Convert mask to uint8
    mask_uint8 = (mask * 255).astype(np.uint8)
    
    # Find contours
    contours, _ = cv2.findContours(mask_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        return None
        
    # Take the largest contour as the main crown boundary
    largest_contour = max(contours, key=cv2.contourArea)
    
    # Need at least 3 points for a valid polygon
    if len(largest_contour) < 3:
        return None
        
    # Reshape and add offset
    points = largest_contour.reshape(-1, 2)
    points = points + np.array([offset_x, offset_y])
    
    try:
        poly = Polygon(points)
        if not poly.is_valid:
            poly = poly.buffer(0)
        return poly
    except Exception:
        return None

def bounding_box_to_polygon(xmin: float, ymin: float, xmax: float, ymax: float) -> Polygon:
    """Creates a rectangular Polygon from a bounding box."""
    return Polygon([
        (xmin, ymin),
        (xmax, ymin),
        (xmax, ymax),
        (xmin, ymax)
    ])
