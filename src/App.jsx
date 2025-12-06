import React, { useState } from 'react';
import { Upload, Download, Image as ImageIcon, Check, AlertCircle, Camera, X } from 'lucide-react';
import './index.css';

function App() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inkColor, setInkColor] = useState('black');
  const [error, setError] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // Default to 'environment' (rear)
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  const handleFileChange = (e) => {
    // Handle both event (e.target.files) and direct file object (e)
    const selectedFile = (e.target && e.target.files) ? e.target.files[0] : e;
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setProcessedImage(null);
      setError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const selectedFile = e.dataTransfer.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setProcessedImage(null);
      setError(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const processSignature = async (selectedColor = inkColor) => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('color', selectedColor);

    try {
      const response = await fetch('/api/digitize', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to process image');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setProcessedImage(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };


  const startCamera = async () => {
    try {
      setIsCameraOpen(true);
      if (videoRef.current && videoRef.current.srcObject) {
        // Stop any existing stream first
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Unable to access camera: " + err.message);
      setIsCameraOpen(false);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prevMode => prevMode === 'user' ? 'environment' : 'user');
    // Effect will re-trigger startCamera if we add it, but for simple implementation lets just restart manually or use effect.
    // Better: call startCamera again immediately state update won't be reflected yet in standard flow without useEffect.
    // Let's use a useEffect to watch facingMode changes when camera is open.
  };

  // Add this effect
  React.useEffect(() => {
    if (isCameraOpen) {
      startCamera();
    }
  }, [facingMode, isCameraOpen]); // Added isCameraOpen to dependencies to ensure it runs when camera opens

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext('2d');
      // Mirror the context to match the mirrored video view
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        const file = new File([blob], "camera_capture.png", { type: "image/png" });
        handleFileChange(file); // Pass the file object directly
        stopCamera();
      }, 'image/png');
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-container">
          <img src="/logo.png" alt="Signato Logo" className="app-logo" />
          <h1>Signato</h1>
        </div>
        <p>DIGITIZE // ENHANCE // SECURE</p>
      </header>

      <main className="main-content">
        <div className="split-view">
          {/* Upload Section */}
          <div className="panel upload-panel">
            <h2>Original Input</h2>
            <div
              className={`drop-zone ${!previewUrl ? 'empty' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Original" className="preview-img" />
              ) : (
                <div className="upload-placeholder">
                  <Upload size={48} className="icon-muted" />
                  <p>DROP SIGNATURE HERE</p>
                  <span>or</span>

                  <div className="button-group" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <label className="file-select-btn">
                      SELECT FILE
                      <input type="file" accept="image/*" onChange={handleFileChange} hidden />
                    </label>
                    <button className="file-select-btn" onClick={startCamera} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Camera size={18} /> CAMERA
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Result Section */}
          <div className="panel result-panel">
            <h2>Digitized Output</h2>
            <div className="result-zone">
              {processedImage ? (
                <img src={processedImage} alt="Digitized" className="preview-img transparent-bg" />
              ) : (
                <div className="result-placeholder">
                  {isProcessing ? (
                    <div className="spinner"></div>
                  ) : (
                    <div className="placeholder-content">
                      <ImageIcon size={48} className="icon-muted" />
                      <p>AWAITING PROCESS...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="controls-bar">
          <div className="control-group">
            <label>INK COLOR:</label>
            <div className="radio-group">
              <label className={`radio-btn ${inkColor === 'black' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="color"
                  value="black"
                  checked={inkColor === 'black'}
                  onChange={(e) => {
                    const newColor = e.target.value;
                    setInkColor(newColor);
                    if (file) processSignature(newColor);
                  }}
                />
                NOIR
              </label>
              <label className={`radio-btn ${inkColor === 'blue' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="color"
                  value="blue"
                  checked={inkColor === 'blue'}
                  onChange={(e) => {
                    const newColor = e.target.value;
                    setInkColor(newColor);
                    if (file) processSignature(newColor);
                  }}
                />
                AZURE
              </label>
            </div>
          </div>

          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={() => processSignature()}
              disabled={!file || isProcessing}
            >
              {isProcessing ? 'PROCESSING...' : 'INITIATE DIGITIZATION'}
            </button>

            {processedImage && (
              <a href={processedImage} download="digitized_signature.png" className="btn btn-success">
                <Download size={18} /> EXPORT PNG
              </a>
            )}
          </div>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>SYSTEM WARNING: AUTHORIZED USE ONLY. FORGERY IS A FEDERAL OFFENSE.</p>
      </footer>

      {isCameraOpen && (
        <div className="camera-modal-overlay">
          <div className="camera-modal">
            <h2>CAPTURE SIGNATURE</h2>
            <div className="camera-view">
              <video ref={videoRef} autoPlay playsInline></video>
              <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
            </div>
            <div className="camera-controls">
              <button className="btn" onClick={toggleCamera} style={{ background: '#333', color: 'white' }}>
                <Camera size={20} /> FLIP
              </button>
              <button className="btn btn-primary" onClick={captureImage}>
                <Camera size={20} /> CAPTURE
              </button>
              <button className="btn" onClick={stopCamera} style={{ background: '#333', color: 'white' }}>
                <X size={20} /> CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
