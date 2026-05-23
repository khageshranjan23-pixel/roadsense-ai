# RoadSense AI — YOLOv8n Detector Wrapper

import threading
from typing import List, Dict, Any, Tuple
import numpy as np
import cv2
from ultralytics import YOLO

class YOLODetector:
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(YOLODetector, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self, model_path: str = "yolov8n.pt"):
        if self._initialized:
            return
        
        # Lazy loading of model on startup
        self.model = YOLO(model_path)
        # Class list to filter (COCO dataset indices)
        # 0: person, 1: bicycle, 2: car, 3: motorcycle, 5: bus, 7: truck, 9: traffic light, 11: stop sign
        self.target_classes = {0, 1, 2, 3, 5, 7, 9, 11}
        self.lock = threading.Lock()
        self._initialized = True

    def detect(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detects road-relevant objects in a frame with confidence > 0.45.
        Returns a list of Detection dicts.
        """
        with self.lock:
            results = self.model(frame, verbose=False)
            
        detections = []
        if not results:
            return detections
            
        result = results[0]
        boxes = result.boxes
        
        for box in boxes:
            conf = float(box.conf[0])
            class_id = int(box.cls[0])
            
            if conf < 0.45 or class_id not in self.target_classes:
                continue
                
            # xyxy format bounding box
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            class_name = self.model.names[class_id]
            
            detection = {
                "bbox": [x1, y1, x2, y2],
                "conf": conf,
                "class_id": class_id,
                "class_name": class_name
            }
            
            # If the detected object is a traffic light, detect its color
            if class_id == 9: # traffic light
                color = self.detect_traffic_light_color(frame, [x1, y1, x2, y2])
                detection["color"] = color
                
            detections.append(detection)
            
        return detections

    def detect_traffic_light_color(self, frame: np.ndarray, bbox: Tuple[int, int, int, int]) -> str:
        """
        Crops a detected traffic light bounding box and detects its color ('red', 'green', 'yellow', or 'unknown')
        using HSV thresholding and spatial position (top = red, middle = yellow, bottom = green).
        """
        x1, y1, x2, y2 = bbox
        
        # Guard against invalid bboxes
        h, w, _ = frame.shape
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        
        if x2 - x1 < 2 or y2 - y1 < 2:
            return "unknown"
            
        crop = frame[y1:y2, x1:x2]
        crop_h, crop_w, _ = crop.shape
        
        # Resize to standard 32x32 for consistent calculations
        crop_resized = cv2.resize(crop, (32, 32))
        hsv = cv2.cvtColor(crop_resized, cv2.COLOR_BGR2HSV)
        
        # Divide into vertical segments (top third, middle third, bottom third)
        top_third = hsv[0:11, :]
        middle_third = hsv[11:21, :]
        bottom_third = hsv[21:32, :]
        
        # Define HSV color boundaries
        # Red ranges (wraps around 0 and 180)
        red_lower1 = np.array([0, 100, 100])
        red_upper1 = np.array([10, 255, 255])
        red_lower2 = np.array([160, 100, 100])
        red_upper2 = np.array([180, 255, 255])
        
        # Yellow range
        yellow_lower = np.array([15, 100, 100])
        yellow_upper = np.array([35, 255, 255])
        
        # Green range
        green_lower = np.array([35, 100, 100])
        green_upper = np.array([90, 255, 255])
        
        # Check top third for RED
        red_mask_top1 = cv2.inRange(top_third, red_lower1, red_upper1)
        red_mask_top2 = cv2.inRange(top_third, red_lower2, red_upper2)
        red_pixels_top = cv2.countNonZero(red_mask_top1) + cv2.countNonZero(red_mask_top2)
        
        # Check middle third for YELLOW
        yellow_mask_mid = cv2.inRange(middle_third, yellow_lower, yellow_upper)
        yellow_pixels_mid = cv2.countNonZero(yellow_mask_mid)
        
        # Check bottom third for GREEN
        green_mask_bottom = cv2.inRange(bottom_third, green_lower, green_upper)
        green_pixels_bottom = cv2.countNonZero(green_mask_bottom)
        
        # Sum of pixels in the entire crop matching the ranges
        red_mask_full1 = cv2.inRange(hsv, red_lower1, red_upper1)
        red_mask_full2 = cv2.inRange(hsv, red_lower2, red_upper2)
        red_pixels_full = cv2.countNonZero(red_mask_full1) + cv2.countNonZero(red_mask_full2)
        
        yellow_mask_full = cv2.inRange(hsv, yellow_lower, yellow_upper)
        yellow_pixels_full = cv2.countNonZero(yellow_mask_full)
        
        green_mask_full = cv2.inRange(hsv, green_lower, green_upper)
        green_pixels_full = cv2.countNonZero(green_mask_full)
        
        # Threshold to confirm active color
        active_thresh = 5 # Minimum matching pixels in a 32x32 division
        
        # Spatial checks take precedence
        if red_pixels_top > active_thresh and red_pixels_top > yellow_pixels_mid and red_pixels_top > green_pixels_bottom:
            return "red"
        if green_pixels_bottom > active_thresh and green_pixels_bottom > red_pixels_top and green_pixels_bottom > yellow_pixels_mid:
            return "green"
        if yellow_pixels_mid > active_thresh and yellow_pixels_mid > red_pixels_top and yellow_pixels_mid > green_pixels_bottom:
            return "yellow"
            
        # Full crop fallback
        max_pixels = max(red_pixels_full, yellow_pixels_full, green_pixels_full)
        if max_pixels > active_thresh * 3:
            if max_pixels == red_pixels_full:
                return "red"
            elif max_pixels == green_pixels_full:
                return "green"
            else:
                return "yellow"
                
        return "unknown"
