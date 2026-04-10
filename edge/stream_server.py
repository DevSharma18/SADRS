"""
edge/stream_server.py

Lightweight MJPEG HTTP server that streams webcam frames directly to the browser.
Runs on port 8080.  No file I/O, no Eventlet, no Windows rename issues.

Architecture:
  FrameHolder  — thread-safe frame store updated by MainController every ~50 ms
  MJPEGHandler — handles each browser connection in its own thread, reads from
                 FrameHolder and pushes multipart/x-mixed-replace JPEG chunks.
  StreamServer — ThreadingTCPServer wrapper; starts as a daemon thread.
"""

import cv2
import time
import threading
import socketserver
from http.server import BaseHTTPRequestHandler

import numpy as np

STREAM_PORT = 8080
STREAM_FPS  = 15          # frames sent per second to the browser
JPEG_QUALITY = 75         # 0-100; lower = smaller payload, faster


class FrameHolder:
    """Thread-safe single-frame ring buffer."""

    def __init__(self):
        self._frame: np.ndarray | None = None
        self._lock = threading.Lock()

    def update(self, frame: np.ndarray) -> None:
        with self._lock:
            self._frame = frame

    def get(self) -> np.ndarray | None:
        with self._lock:
            return self._frame


class MJPEGHandler(BaseHTTPRequestHandler):
    """Serves the MJPEG stream at GET /stream (and GET /)."""

    # Injected by StreamServer before any connections arrive.
    frame_holder: FrameHolder | None = None

    # ------------------------------------------------------------------ #
    #  Silence the default per-request log lines.                          #
    # ------------------------------------------------------------------ #
    def log_message(self, format, *args):  # noqa: A002
        pass

    def do_GET(self):  # noqa: N802
        if self.path.split("?")[0] not in ("/", "/stream"):
            self.send_error(404, "Not found")
            return

        self.send_response(200)
        self.send_header("Content-Type",
                         "multipart/x-mixed-replace; boundary=frame")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache, no-store")
        self.send_header("Connection", "close")
        self.end_headers()

        interval = 1.0 / STREAM_FPS
        encode_params = [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY]

        try:
            while True:
                frame = self.frame_holder.get() if self.frame_holder else None

                if frame is None:
                    # Send a dark placeholder until the camera warms up.
                    placeholder = np.zeros((480, 640, 3), dtype=np.uint8)
                    cv2.putText(
                        placeholder, "SADRS - Initialising...",
                        (120, 240), cv2.FONT_HERSHEY_SIMPLEX,
                        0.9, (80, 80, 80), 2,
                    )
                    frame = placeholder

                ok, buf = cv2.imencode(".jpg", frame, encode_params)
                if not ok:
                    time.sleep(interval)
                    continue

                data = buf.tobytes()
                self.wfile.write(
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n"
                    + data
                    + b"\r\n"
                )
                self.wfile.flush()
                time.sleep(interval)

        except (BrokenPipeError, ConnectionAbortedError, OSError):
            # Browser tab closed or navigated away — normal, just stop.
            pass


class StreamServer(socketserver.ThreadingTCPServer):
    """ThreadingTCPServer so each browser connection gets its own thread."""

    allow_reuse_address = True
    daemon_threads = True   # don't block process exit


def start_stream_server(frame_holder: FrameHolder,
                        port: int = STREAM_PORT) -> StreamServer:
    """Inject the FrameHolder, bind the server, and return it running in a
    background daemon thread.  Caller doesn't need to do anything else."""

    MJPEGHandler.frame_holder = frame_holder

    server = StreamServer(("0.0.0.0", port), MJPEGHandler)
    t = threading.Thread(target=server.serve_forever, daemon=True,
                         name="mjpeg-stream")
    t.start()
    print(f"[STREAM] MJPEG server running -> http://localhost:{port}/stream")
    return server
