import cv2
import os
import json
from datetime import datetime

class ClipExtractor:
    def __init__(self, evidence_dir="evidence"):
        self.evidence_dir = evidence_dir
        if not os.path.exists(self.evidence_dir):
            os.makedirs(self.evidence_dir)

    def extract_clip(self, frame_buffer, fps, threat_class, conf, snapshot, summary):
        """
        Takes the ring buffer of frames and saves as an MP4 incident.
        Called asynchronously by the AlertManager.
        """
        if not frame_buffer:
            print("[CLIP_EXTRACTOR] No frames in buffer to extract.")
            return None

        # Determine filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        incident_id = f"INC-{timestamp}"
        base_name = f"{timestamp}_{threat_class}_{int(conf*100)}"
        mp4_path = os.path.join(self.evidence_dir, f"{base_name}.mp4")
        json_path = os.path.join(self.evidence_dir, f"{base_name}.json")

        # Video Writer
        height, width, _ = frame_buffer[0].shape
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(mp4_path, fourcc, fps, (width, height))

        for frame in frame_buffer:
            out.write(frame)
        out.release()
        
        print(f"[CLIP_EXTRACTOR] Saved {len(frame_buffer)} frames to {mp4_path}")

        # Metadata
        metadata = {
            "incident_id": incident_id,
            "timestamp": datetime.now().isoformat(),
            "trigger_type": "ml_cctv",
            "threat_class": threat_class,
            "confidence_score": conf,
            "sensor_snapshot": snapshot,
            "claude_summary": summary,
            "clip_filename": f"{base_name}.mp4"
        }

        with open(json_path, 'w') as f:
            json.dump(metadata, f, indent=2)
            
        # Update index.json for the dashboard
        index_path = os.path.join(self.evidence_dir, "index.json")
        index_data = []
        if os.path.exists(index_path):
            with open(index_path, 'r') as f:
                try:
                    index_data = json.load(f)
                except:
                    pass
        index_data.append(metadata)
        with open(index_path, 'w') as f:
            json.dump(index_data, f, indent=2)

        return metadata
