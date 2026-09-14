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
        from deepforest import main
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
        if image_array.shape[0] == 3:
            image_array = np.transpose(image_array, (1, 2, 0))
            
        orig_h, orig_w = image_array.shape[:2]
        max_dim = 800
        scale = 1.0
        
        # Downscale to prevent OOM on 512MB Render free tier
        if orig_h > max_dim or orig_w > max_dim:
            import cv2
            scale = max_dim / max(orig_h, orig_w)
            new_h = int(orig_h * scale)
            new_w = int(orig_w * scale)
            # Resize using cv2 (already installed via OpenCV) or PIL
            # We'll use cv2 since rasterio env usually has cv2 or we can use PIL
            try:
                import cv2
                pred_image = cv2.resize(image_array, (new_w, new_h))
            except ImportError:
                from PIL import Image
                img = Image.fromarray(image_array)
                img = img.resize((new_w, new_h), Image.BILINEAR)
                pred_image = np.array(img)
        else:
            pred_image = image_array

        boxes = self.model.predict_image(image=pred_image)
        
        if boxes is None or boxes.empty:
            return pd.DataFrame(columns=["xmin", "ymin", "xmax", "ymax", "label", "score"])
            
        # Rescale boxes back to original dimensions
        if scale != 1.0:
            boxes["xmin"] = boxes["xmin"] / scale
            boxes["ymin"] = boxes["ymin"] / scale
            boxes["xmax"] = boxes["xmax"] / scale
            boxes["ymax"] = boxes["ymax"] / scale

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
