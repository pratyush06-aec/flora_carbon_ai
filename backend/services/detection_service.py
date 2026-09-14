from deepforest import main
import pandas as pd
import numpy as np

class TreeDetector:
    def __init__(self):
        self.model = None
        self.ready = False

    def load_model(self):
        if self.ready:
            return
        # Initialize and load the pre-trained DeepForest model
        import logging
        logging.info("Starting background AI model initialization...")
        self.model = main.deepforest()
        if hasattr(self.model, "use_release"):
            self.model.use_release()
        elif hasattr(self.model, "use_bird_release"):
            pass
        self.ready = True
        logging.info("AI model successfully initialized and ready for requests.")
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
            
        # For this MVP on a free-tier CPU, predict_tile takes too long and causes 100s timeouts.
        # predict_image is much faster (it resizes internally) at the cost of some accuracy on huge images.
        boxes = self.model.predict_image(image=image_array)
        
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

def init_detector_background():
    import threading
    detector = get_detector()
    thread = threading.Thread(target=detector.load_model)
    thread.daemon = True
    thread.start()
