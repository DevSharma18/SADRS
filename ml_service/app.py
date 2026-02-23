import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from detector import analyze_frame

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "service": "SADRS ML Service", "models": ["yolov8n", "weapon_model"]})

@app.route('/analyze', methods=['POST'])
def analyze():
    camera_id = request.form.get('camera_id', 'unknown')
    atm_id = request.form.get('atm_id', 'unknown')
    
    image_path = None
    
    if 'image' in request.files:
        file = request.files['image']
        if file.filename != '':
            image_path = os.path.join(UPLOAD_FOLDER, file.filename)
            file.save(image_path)
            
    # Fallback to sample frame if no image uploaded
    if not image_path:
        sample_dir = 'sample_frames'
        os.makedirs(sample_dir, exist_ok=True)
        sample_path = os.path.join(sample_dir, 'sample.jpg')
        if not os.path.exists(sample_path):
            from PIL import Image
            img = Image.new('RGB', (640, 480), color = (73, 109, 137))
            img.save(sample_path)
        image_path = sample_path
        
    threat_analysis = analyze_frame(image_path, camera_id, atm_id)
    
    if image_path.startswith(UPLOAD_FOLDER) and os.path.exists(image_path):
        os.remove(image_path)
        
    return jsonify(threat_analysis)

if __name__ == '__main__':
    print("Starting ML Service on port 5001...")
    # Using 0.0.0.0 to allow access, use 5001 as specified
    app.run(host='0.0.0.0', port=5001, debug=False)
