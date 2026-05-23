# RoadSense AI — Scene Analyzer

from typing import List, Dict, Any, Tuple
import os
import cv2
import numpy as np
from app.cv.detector import YOLODetector
from app.cv.tracker import ObjectTracker

class SceneAnalyzer:
    def __init__(self, model_path: str = "yolov8n.pt"):
        self.detector = YOLODetector(model_path)

    def analyze_image(self, image_path: str) -> Dict[str, Any]:
        """
        Analyzes a single image and returns SceneAnalysis metadata.
        """
        frame = cv2.imread(image_path)
        if frame is None:
            raise ValueError(f"Could not read image: {image_path}")

        h, w, _ = frame.shape
        line_y = 0.6 * h
        
        # Detect objects
        detections = self.detector.detect(frame)
        
        # Setup temporary tracker to assign tracking formats
        tracker = ObjectTracker()
        tracked_objects = tracker.update(detections, frame)
        
        # Compile object info
        objects_data = []
        traffic_light_color = "none"
        pedestrians_on_crossing = 0
        closest_vehicle_distance = float('inf')
        fastest_vehicle_speed = 0.0
        
        vehicle_classes = {"car", "bus", "truck", "motorcycle", "bicycle"}
        
        for obj in tracked_objects:
            bbox = obj["bbox"]
            class_name = obj["class_name"]
            
            # Check traffic light color
            if class_name == "traffic light":
                # Find color from original detections
                for d in detections:
                    if d["class_id"] == 9:
                        traffic_light_color = d.get("color", "unknown")
                        break
            
            # Pedestrians on crossing
            if class_name == "person":
                y1, y2 = bbox[1], bbox[3]
                if y1 <= line_y <= y2:
                    pedestrians_on_crossing += 1
            
            # Vehicle metrics
            if class_name in vehicle_classes:
                dist = tracker.compute_distance_to_line(obj, line_y)
                if dist < closest_vehicle_distance:
                    closest_vehicle_distance = dist
                
                speed = tracker.compute_speed(obj)
                if speed > fastest_vehicle_speed:
                    fastest_vehicle_speed = speed
                    
            objects_data.append({
                "track_id": obj["track_id"],
                "class_name": class_name,
                "bbox": bbox,
                "speed": 0.0,
                "direction": "lateral",
                "distance": tracker.compute_distance_to_line(obj, line_y)
            })

        # Calculate scene complexity
        num_objects = len(objects_data)
        if num_objects <= 2:
            complexity = "simple"
        elif num_objects <= 5:
            complexity = "moderate"
        else:
            complexity = "complex"

        # Safe defaults if no vehicles detected
        if closest_vehicle_distance == float('inf'):
            closest_vehicle_distance = 999.0

        # Encode annotated image as base64
        annotated_frame = self._draw_annotations(frame.copy(), objects_data, line_y, traffic_light_color)
        _, buffer = cv2.imencode('.jpg', annotated_frame)
        import base64
        base64_str = base64.b64encode(buffer).decode('utf-8')

        return {
            "objects": objects_data,
            "traffic_light_color": traffic_light_color,
            "fastest_vehicle_speed": fastest_vehicle_speed,
            "closest_vehicle_distance": closest_vehicle_distance,
            "pedestrians_on_crossing": pedestrians_on_crossing,
            "scene_complexity": complexity,
            "recommended_freeze_frame": 0,
            "annotated_frame_base64": base64_str
        }

    def analyze_video(self, video_path: str) -> Dict[str, Any]:
        """
        Analyzes a video file (up to 30 sampled frames) using Detector + Tracker.
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video: {video_path}")
            
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        line_y = 0.6 * h
        
        # Determine sample step to analyze up to 30 frames evenly
        max_analyze_frames = 30
        step = max(1, total_frames // max_analyze_frames)
        
        tracker = ObjectTracker()
        frame_idx = 0
        processed_frames_data = []
        
        traffic_light_colors = []
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
                
            if frame_idx % step == 0 and len(processed_frames_data) < max_analyze_frames:
                detections = self.detector.detect(frame)
                
                # Check for traffic light color in this frame
                for d in detections:
                    if d["class_id"] == 9 and "color" in d:
                        traffic_light_colors.append(d["color"])
                
                tracked_objects = tracker.update(detections, frame)
                
                # Copy frame to store with annotations later
                processed_frames_data.append({
                    "frame_idx": frame_idx,
                    "frame": frame,
                    "detections": detections,
                    "tracked_objects": tracked_objects
                })
                
            frame_idx += 1
            if len(processed_frames_data) >= max_analyze_frames:
                break
                
        cap.release()
        
        if not processed_frames_data:
            raise ValueError("No frames processed from video")
            
        # Determine traffic light color (majority vote)
        traffic_light_color = "none"
        if traffic_light_colors:
            valid_colors = [c for c in traffic_light_colors if c != "unknown"]
            if valid_colors:
                traffic_light_color = max(set(valid_colors), key=valid_colors.count)
                
        # Aggregate stats across all tracked objects
        all_objects_summary = {}
        vehicle_classes = {"car", "bus", "truck", "motorcycle", "bicycle"}
        
        closest_vehicle_distance = float('inf')
        fastest_vehicle_speed = 0.0
        pedestrians_on_crossing = 0
        
        # Scan through frames to build cumulative track details
        freeze_frame_idx = 0
        min_dist_seen = float('inf')
        
        for idx, fdata in enumerate(processed_frames_data):
            f_objects = fdata["tracked_objects"]
            f_pedestrians = 0
            
            for obj in f_objects:
                tid = obj["track_id"]
                cname = obj["class_name"]
                bbox = obj["bbox"]
                
                speed = tracker.compute_speed(obj)
                direction = tracker.compute_direction(obj, line_y)
                distance = tracker.compute_distance_to_line(obj, line_y)
                
                if cname in vehicle_classes:
                    if distance < closest_vehicle_distance:
                        closest_vehicle_distance = distance
                    if speed > fastest_vehicle_speed:
                        fastest_vehicle_speed = speed
                        
                    # Find frame where vehicle is closest (good freeze frame)
                    if distance < min_dist_seen:
                        min_dist_seen = distance
                        freeze_frame_idx = idx
                        
                if cname == "person":
                    y1, y2 = bbox[1], bbox[3]
                    if y1 <= line_y <= y2:
                        f_pedestrians += 1
                        
                # Update global record for this track ID
                if tid not in all_objects_summary:
                    all_objects_summary[tid] = {
                        "track_id": tid,
                        "class_name": cname,
                        "bbox": bbox,
                        "speed": speed,
                        "direction": direction,
                        "distance": distance
                    }
                else:
                    # Update to latest state
                    all_objects_summary[tid]["bbox"] = bbox
                    all_objects_summary[tid]["speed"] = max(all_objects_summary[tid]["speed"], speed)
                    all_objects_summary[tid]["distance"] = min(all_objects_summary[tid]["distance"], distance)
                    if direction != "lateral":
                        all_objects_summary[tid]["direction"] = direction
                        
            pedestrians_on_crossing = max(pedestrians_on_crossing, f_pedestrians)

        # Convert cumulative tracks to list
        objects_list = list(all_objects_summary.values())
        
        # Calculate complexity
        num_objects = len(objects_list)
        if num_objects <= 2:
            complexity = "simple"
        elif num_objects <= 5:
            complexity = "moderate"
        else:
            complexity = "complex"
            
        if closest_vehicle_distance == float('inf'):
            closest_vehicle_distance = 999.0
            
        # Get the freeze frame
        freeze_data = processed_frames_data[freeze_frame_idx]
        freeze_frame = freeze_data["frame"]
        freeze_tracks = freeze_data["tracked_objects"]
        
        # Format objects list specifically for the freeze frame
        freeze_objects_list = []
        for obj in freeze_tracks:
            tid = obj["track_id"]
            summary = all_objects_summary.get(tid, {})
            freeze_objects_list.append({
                "track_id": tid,
                "class_name": obj["class_name"],
                "bbox": obj["bbox"],
                "speed": summary.get("speed", 0.0),
                "direction": summary.get("direction", "lateral"),
                "distance": tracker.compute_distance_to_line(obj, line_y)
            })

        # Draw annotations on the freeze frame
        annotated_freeze = self._draw_annotations(
            freeze_frame.copy(), 
            freeze_objects_list, 
            line_y, 
            traffic_light_color
        )
        
        _, buffer = cv2.imencode('.jpg', annotated_freeze)
        import base64
        base64_str = base64.b64encode(buffer).decode('utf-8')
        
        # Compute freeze_at_ms in the video
        freeze_at_ms = int((freeze_data["frame_idx"] / total_frames) * (total_frames / cap.get(cv2.CAP_PROP_FPS) * 1000)) if total_frames > 0 else 0
        
        return {
            "objects": freeze_objects_list,
            "traffic_light_color": traffic_light_color,
            "fastest_vehicle_speed": fastest_vehicle_speed,
            "closest_vehicle_distance": closest_vehicle_distance,
            "pedestrians_on_crossing": pedestrians_on_crossing,
            "scene_complexity": complexity,
            "recommended_freeze_frame": freeze_data["frame_idx"],
            "freeze_at_ms": freeze_at_ms,
            "annotated_frame_base64": base64_str
        }

    def _draw_annotations(self, frame: np.ndarray, objects: List[Dict[str, Any]], line_y: float, tl_color: str) -> np.ndarray:
        """
        Draws boxes, labels, and safety markers on the image/frame.
        """
        h, w, _ = frame.shape
        
        # Draw crossing line (line_y)
        color_line = (0, 165, 255) # orange
        cv2.line(frame, (0, int(line_y)), (w, int(line_y)), color_line, 2)
        cv2.putText(frame, "CROSSING LINE", (10, int(line_y) - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color_line, 1)
        
        # Draw traffic light status on top right
        status_box_color = (40, 40, 40)
        cv2.rectangle(frame, (w - 220, 10), (w - 10, 50), status_box_color, -1)
        cv2.rectangle(frame, (w - 220, 10), (w - 10, 50), (100, 100, 100), 1)
        
        tl_color_bgr = (100, 100, 100)
        if tl_color == "red":
            tl_color_bgr = (0, 0, 255)
        elif tl_color == "green":
            tl_color_bgr = (0, 255, 0)
        elif tl_color == "yellow":
            tl_color_bgr = (0, 255, 255)
            
        cv2.circle(frame, (w - 200, 30), 10, tl_color_bgr, -1)
        cv2.putText(frame, f"SIGNAL: {tl_color.upper()}", (w - 180, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        # Draw detected objects
        for obj in objects:
            x1, y1, x2, y2 = obj["bbox"]
            cname = obj["class_name"]
            speed = obj.get("speed", 0.0)
            direction = obj.get("direction", "lateral")
            
            # Determine boundary box color
            box_color = (0, 255, 0) # green (person/default)
            if cname in {"car", "bus", "truck", "motorcycle"}:
                if speed > 10.0 or direction == "toward_crossing":
                    box_color = (0, 0, 255) # red (danger)
                else:
                    box_color = (0, 255, 255) # yellow (warning)
                    
            cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
            
            # Label
            label = f"{cname.capitalize()}"
            if speed > 0:
                label += f" | {speed:.1f} px/f"
            if direction != "lateral" and cname in {"car", "bus", "truck", "motorcycle"}:
                label += f" | {direction.replace('_', ' ')}"
                
            cv2.rectangle(frame, (x1, y1 - 20), (x1 + len(label)*8, y1), box_color, -1)
            cv2.putText(frame, label, (x1 + 4, y1 - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1)
            
        return frame
