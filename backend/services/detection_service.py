from deepforest import main
import pandas as pd
import numpy as np

class TreeDetector:
    def __init__(self):
        # Initialize and load the pre-trained DeepForest model
        self.model = main.deepforest()
        if hasattr(self.model, "use_release"):
            self.model.use_release()
        elif hasattr(self.model, "use_bird_release"): # Just a safe fallback logic
            pass
    def detect_trees(self, image_array: np.ndarray) -> pd.DataFrame:
        """
        Detects trees in an RGB image array (channels last: H, W, C).
        Returns a DataFrame with columns: [xmin, ymin, xmax, ymax, label, score].
        """
        # DeepForest predicts on images in BGR format typically if loaded via cv2, 
        # but predict_image accepts standard RGB arrays.
        # Ensure image is channels last (H, W, C).
        if image_array.shape[0] == 3:
            image_array = np.transpose(image_array, (1, 2, 0))
            
        # Predict using DeepForest's tiled prediction for large images
        # We can use predict_tile if the image is large, or predict_image for smaller ones
        # For this MVP, predict_tile handles both safely
        boxes = self.model.predict_tile(image=image_array)
        
        if boxes is None or boxes.empty:
            return pd.DataFrame(columns=["xmin", "ymin", "xmax", "ymax", "label", "score"])
            
        # Add centroid calculation
        boxes["centroid_x"] = (boxes["xmin"] + boxes["xmax"]) / 2.0
        boxes["centroid_y"] = (boxes["ymin"] + boxes["ymax"]) / 2.0
        
        return boxes

# Singleton pattern for the detector to avoid reloading model per request
_detector_instance = None

def get_detector() -> TreeDetector:
    global _detector_instance
    if _detector_instance is None:
        _detector_instance = TreeDetector()
    return _detector_instance
