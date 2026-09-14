import math
import numpy as np
from typing import Tuple

def calculate_canopy_area(
    is_segmentation_valid: bool,
    mask: np.ndarray,
    xmin: float,
    ymin: float,
    xmax: float,
    ymax: float,
    gsd_x: float = None,
    gsd_y: float = None
) -> Tuple[float, str]:
    """
    Calculates the canopy area using either the segmentation mask or a circular fallback.
    Returns: (area, method_used)
    If GSD is provided, area is in m2. Otherwise, area is in pixels squared.
    """
    # Prefer segmentation
    if is_segmentation_valid and mask is not None:
        pixel_count = np.sum(mask)
        if gsd_x is not None and gsd_y is not None:
            area_m2 = pixel_count * (gsd_x * gsd_y)
            return area_m2, "segmentation"
        else:
            return float(pixel_count), "segmentation"
            
    # Fallback to Circular Approximation
    width = xmax - xmin
    height = ymax - ymin
    
    # Estimate diameter as the average of bounding box width and height
    diameter_px = (width + height) / 2.0
    radius_px = diameter_px / 2.0
    
    if gsd_x is not None and gsd_y is not None:
        # Assuming isotropic pixels for simple radius scaling (or take average GSD)
        avg_gsd = (gsd_x + gsd_y) / 2.0
        radius_m = radius_px * avg_gsd
        area_m2 = math.pi * (radius_m ** 2)
        return area_m2, "circular_fallback"
    else:
        area_px = math.pi * (radius_px ** 2)
        return area_px, "circular_fallback"
