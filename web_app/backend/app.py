from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import os
import sys
import cv2
import numpy as np
import io

# Add parent directory to path to import signature_digitizer
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from signature_digitizer import SignatureDigitizer

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/api/digitize', methods=['POST'])
def digitize_signature():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    ink_color = request.form.get('color', 'black')
    
    # Save uploaded file temporarily
    input_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(input_path)
    
    try:
        # Process the image
        digitizer = SignatureDigitizer(input_path)
        digitizer.process(ink_color=ink_color)
        
        # Save processed image to a buffer
        is_success, buffer = cv2.imencode(".png", digitizer.image)
        if not is_success:
             return jsonify({'error': 'Failed to encode image'}), 500
             
        io_buf = io.BytesIO(buffer)
        
        # Clean up input file
        os.remove(input_path)
        
        return send_file(
            io_buf,
            mimetype='image/png',
            as_attachment=True,
            download_name='digitized_signature.png'
        )

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
