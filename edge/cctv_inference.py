"""
cctv_inference.py

Two-thread design:
  _capture_loop   : 30 fps webcam reader, pushes raw frames to frame_holder
                    immediately so the stream server always has fresh video.
  _inference_loop : YOLO at ~5 fps in its own daemon thread.
                    YOLO model is loaded INSIDE this thread (required on Windows
                    — PyTorch/OpenMP deadlocks if model is loaded in one thread
                    and predict() is called from another).

draw_overlay_fn : optional callback (e.g. MainController.draw_dashboard) that
                  draws the SADRS status overlay on top of every frame before
                  it is pushed to the stream server.
"""

import cv2
import time
import os
import threading
import numpy as np
from collections import deque
from threat_state import ThreatState
from stream_server import FrameHolder

os.environ["OPENCV_LOG_LEVEL"] = "SILENT"
# Must be set before PyTorch/YOLO import to prevent OpenMP deadlock on Windows
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")

_FALLBACK_IMG_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "cctv_monitoring.jpg")
)

_YOLO_MODEL = "yolov8n.pt"
_CONF_THRESHOLD = 0.25   # lower = more detections
_DETECT_CLASSES = [0, 24, 34, 43, 67]  # person, backpack, bat, knife, phone


class CCTVInference:
    def __init__(self, state: ThreatState, frame_holder: FrameHolder,
                 camera_index: int = 0, draw_overlay_fn=None):
        self.state           = state
        self.frame_holder    = frame_holder
        self.camera_index    = camera_index
        self.draw_overlay_fn = draw_overlay_fn   # optional status overlay cb

        self.cap     = None
        self.running = False

        self.fps         = 15
        self.buffer_size = 30 * self.fps
        self.frame_buffer: deque = deque(maxlen=self.buffer_size)

        self._raw_frame       = None
        self._annotated_frame = None
        self._lock            = threading.Lock()

        self.threat_map = {
            43: "WEAPON_DETECTED",
            34: "WEAPON_DETECTED",
            24: "SUSPICIOUS_BAGGAGE",
            67: "SUSPICIOUS_BEHAVIOR",
        }

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_latest_frame(self):
        with self._lock:
            return (self._annotated_frame
                    if self._annotated_frame is not None
                    else self._raw_frame)

    def get_buffer(self):
        with self._lock:
            return list(self.frame_buffer)

    @property
    def latest_frame(self):
        return self.get_latest_frame()

    # ------------------------------------------------------------------
    # Camera helpers
    # ------------------------------------------------------------------

    def _try_open(self, index, backend):
        try:
            cap = cv2.VideoCapture(index, backend)
            if cap.isOpened():
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                ret, frame = cap.read()
                if ret and frame is not None:
                    return cap
            cap.release()
        except Exception:
            pass
        return None

    def _open_camera(self):
        for idx in range(2):
            for backend in [cv2.CAP_DSHOW, cv2.CAP_ANY]:
                bname = "DSHOW" if backend == cv2.CAP_DSHOW else "DEFAULT"
                print(f"[CCTV] Trying camera index {idx} via {bname}...")
                cap = self._try_open(idx, backend)
                if cap:
                    self.camera_index = idx
                    print(f"[CCTV] Connected to camera index {idx} via {bname}")
                    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                    return cap
        return None

    # ------------------------------------------------------------------
    # Entry point
    # ------------------------------------------------------------------

    def start(self):
        self.cap = self._open_camera()
        if not self.cap:
            print("[CCTV] No webcam found - using fallback image.")

        self.running = True

        threading.Thread(
            target=self._inference_loop, daemon=True, name="yolo-inference"
        ).start()

        self._capture_loop()   # blocks cctv daemon thread

    def stop(self):
        self.running = False
        if self.cap:
            self.cap.release()

    # ------------------------------------------------------------------
    # Capture loop  (30 fps, no YOLO)
    # ------------------------------------------------------------------

    def _capture_loop(self):
        fallback = cv2.imread(_FALLBACK_IMG_PATH)
        if fallback is None:
            print(f"[CCTV] Fallback image not found: {_FALLBACK_IMG_PATH}")
            fallback = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(fallback, "NO CAMERA - NO FALLBACK",
                        (80, 240), cv2.FONT_HERSHEY_SIMPLEX,
                        0.8, (60, 60, 60), 2)
        if fallback.shape[:2] != (480, 640):
            fallback = cv2.resize(fallback, (640, 480))

        consecutive_failures = 0

        while self.running:
            frame = None

            if self.cap is not None and self.cap.isOpened():
                ret, frame = self.cap.read()
                if not ret or frame is None:
                    consecutive_failures += 1
                    frame = None
                    if consecutive_failures >= 30:
                        print("[CCTV] Read failures - reconnecting camera...")
                        self.cap.release()
                        self.cap = None
                        consecutive_failures = 0
                        time.sleep(1.0)
                        self.cap = self._open_camera()
                else:
                    consecutive_failures = 0

            if frame is None:
                frame = fallback.copy()

            with self._lock:
                self._raw_frame = frame
                self.frame_buffer.append(frame)

            # Use annotated frame if YOLO has produced one, else raw
            display = self.get_latest_frame()

            # Apply SADRS dashboard overlay if provided
            if self.draw_overlay_fn is not None and display is not None:
                try:
                    display = self.draw_overlay_fn(display)
                except Exception:
                    pass

            self.frame_holder.update(display)
            time.sleep(1.0 / 30)

    # ------------------------------------------------------------------
    # Inference loop  (YOLO at 5 fps, separate thread)
    # ------------------------------------------------------------------

    def _inference_loop(self):
        """
        IMPORTANT: YOLO model is loaded HERE, inside this thread.
        Loading in __init__ (main thread) and calling predict() from a
        daemon thread causes an OpenMP deadlock on Windows.
        """
        try:
            import torch
            torch.set_num_threads(1)
            torch.set_num_interop_threads(1)
        except Exception:
            pass

        print("[CCTV] Loading YOLOv8-nano model inside inference thread...")
        try:
            from ultralytics import YOLO
            model = YOLO(_YOLO_MODEL)
            print("[CCTV] YOLOv8 model loaded. Detection active.")
        except Exception as e:
            print(f"[CCTV] YOLO failed to load: {e}. Detection disabled.")
            return

        inference_count = 0

        while self.running:
            with self._lock:
                raw = self._raw_frame

            if raw is None:
                time.sleep(0.1)
                continue

            try:
                results = model.predict(
                    source=raw.copy(),
                    verbose=False,
                    conf=_CONF_THRESHOLD,
                    classes=_DETECT_CLASSES,
                )

                detected_threat = "NORMAL"
                highest_conf    = 0.0
                annotated       = raw

                for result in results:
                    annotated    = result.plot()
                    person_count = 0
                    for box in result.boxes:
                        cls_id = int(box.cls[0])
                        conf   = float(box.conf[0])
                        if cls_id == 0:
                            person_count += 1
                        if cls_id in self.threat_map:
                            detected_threat = self.threat_map[cls_id]
                            highest_conf    = max(highest_conf, conf)
                    if person_count >= 2:
                        detected_threat = "CROWD"
                        highest_conf    = 0.8

                self.state.update_ml_detection(detected_threat, highest_conf)

                with self._lock:
                    self._annotated_frame = annotated

                inference_count += 1
                if inference_count == 1:
                    print("[CCTV] First YOLO inference complete. Bounding boxes active.")

            except Exception as e:
                print(f"[CCTV] YOLO inference error: {e}")
                time.sleep(1.0)

            time.sleep(0.2)   # ~5 fps inference rate
