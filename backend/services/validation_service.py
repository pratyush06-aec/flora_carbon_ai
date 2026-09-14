import numpy as np

def calculate_iou(boxA: tuple[float, float, float, float], boxB: tuple[float, float, float, float]) -> float:
    """Calculates Intersection over Union (IoU) of two bounding boxes (xmin, ymin, xmax, ymax)."""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    interArea = max(0, xB - xA) * max(0, yB - yA)
    
    if interArea == 0:
        return 0.0

    boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
    boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])

    iou = interArea / float(boxAArea + boxBArea - interArea)
    return iou

def calculate_area_error(estimated_area: float, true_area: float) -> dict:
    """Calculates MAE and relative error for area estimation."""
    absolute_error = abs(estimated_area - true_area)
    relative_error = absolute_error / true_area if true_area > 0 else 0.0
    return {
        "absolute_error": absolute_error,
        "relative_error": relative_error
    }
