# RoadSense AI — Object Tracker Wrapper

from typing import List, Dict, Any, Tuple
import math
import numpy as np
from deep_sort_realtime.deepsort_tracker import DeepSort

class ObjectTracker:
    def __init__(self, max_age: int = 25, n_init: int = 2, max_cosine_distance: float = 0.4):
        # Initialize DeepSort tracker
        # embedder=None allows running without heavy deep models, making it fast and lightweight on CPU
        self.tracker = DeepSort(
            max_age=max_age,
            n_init=n_init,
            max_cosine_distance=max_cosine_distance,
            embedder=None
        )
        # History map: track_id -> List[Dict[str, Any]] (containing 'x', 'y', 'frame_index')
        self.track_histories = {}
        # Keep track of active frame index
        self.frame_index = 0

    def update(self, detections: List[Dict[str, Any]], frame: np.ndarray) -> List[Dict[str, Any]]:
        """
        Updates the tracker with current frame detections.
        Detections format: list of dicts with 'bbox' [x1, y1, x2, y2], 'conf', 'class_id', 'class_name'
        Returns a list of tracked objects with history and computed motion vectors.
        """
        self.frame_index += 1
        
        # Format detections for DeepSort: [ [left, top, w, h], confidence, class_name ]
        deepsort_detections = []
        for det in detections:
            x1, y1, x2, y2 = det["bbox"]
            w = x2 - x1
            h = y2 - y1
            deepsort_detections.append(([x1, y1, w, h], det["conf"], det["class_name"]))

        # Update tracks
        tracks = self.tracker.update_tracks(deepsort_detections, frame=frame)
        
        active_tracks = []
        for track in tracks:
            if not track.is_confirmed():
                continue
                
            track_id = track.track_id
            # Get bounding box in x1, y1, x2, y2 (TLBR) format
            x1, y1, x2, y2 = map(int, track.to_tlbr())
            
            # Center coordinates
            cx = (x1 + x2) / 2.0
            cy = (y1 + y2) / 2.0
            
            # Update history
            if track_id not in self.track_histories:
                self.track_histories[track_id] = []
            
            self.track_histories[track_id].append({
                "x": cx,
                "y": cy,
                "frame": self.frame_index
            })
            
            # Keep history bounded to avoid memory leaks
            if len(self.track_histories[track_id]) > 50:
                self.track_histories[track_id].pop(0)
                
            # Compile track data
            history = self.track_histories[track_id]
            class_name = track.get_class()
            
            track_data = {
                "track_id": track_id,
                "bbox": [x1, y1, x2, y2],
                "class_name": class_name,
                "history": history
            }
            
            active_tracks.append(track_data)
            
        # Clean up history for dead tracks
        active_ids = {t["track_id"] for t in active_tracks}
        dead_ids = [tid for tid in self.track_histories if tid not in active_ids]
        for tid in dead_ids:
            del self.track_histories[tid]
            
        return active_tracks

    def compute_speed(self, track: Dict[str, Any]) -> float:
        """
        Computes pixel speed per frame based on tracking history.
        """
        history = track.get("history", [])
        if len(history) < 2:
            return 0.0
            
        first = history[0]
        last = history[-1]
        
        dx = last["x"] - first["x"]
        dy = last["y"] - first["y"]
        distance = math.sqrt(dx*dx + dy*dy)
        
        frames = last["frame"] - first["frame"]
        if frames <= 0:
            return 0.0
            
        return distance / frames

    def compute_direction(self, track: Dict[str, Any], line_y: float) -> str:
        """
        Computes track direction relative to the crossing line:
        'toward_crossing' | 'away_from_crossing' | 'lateral'
        """
        history = track.get("history", [])
        if len(history) < 2:
            return "lateral"
            
        first = history[0]
        last = history[-1]
        
        dx = abs(last["x"] - first["x"])
        dy = abs(last["y"] - first["y"])
        
        # If movement is mostly horizontal, classify as lateral
        if dx > 2 * dy:
            return "lateral"
            
        # Check if getting closer to the line_y
        dist_first = abs(first["y"] - line_y)
        dist_last = abs(last["y"] - line_y)
        
        if dist_last < dist_first - 2.0: # clear movement towards
            return "toward_crossing"
        elif dist_last > dist_first + 2.0: # clear movement away
            return "away_from_crossing"
            
        return "lateral"

    def compute_distance_to_line(self, track: Dict[str, Any], line_y: float) -> float:
        """
        Computes perpendicular pixel distance of the track's current position to the crossing line.
        """
        history = track.get("history", [])
        if not history:
            # Fallback to bbox center
            x1, y1, x2, y2 = track["bbox"]
            cy = (y1 + y2) / 2.0
            return abs(cy - line_y)
            
        return abs(history[-1]["y"] - line_y)
