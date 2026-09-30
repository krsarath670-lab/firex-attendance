import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, AlertCircle } from 'lucide-react';

export function SelfieCaptureModal({ isOpen, onClose, onCapture, actionLabel = 'Check-In' }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [photoData, setPhotoData] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [loadingCamera, setLoadingCamera] = useState(true);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setLoadingCamera(true);
    setCameraError('');
    setPhotoData(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError('Camera access unavailable. You may proceed without photo or upload an image.');
    } finally {
      setLoadingCamera(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleTakePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = 320;
      canvas.height = 320;
      const ctx = canvas.getContext('2d');
      // Draw centered cropped frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setPhotoData(dataUrl);
      stopCamera();
    }
  };

  const handleRetake = () => {
    setPhotoData(null);
    startCamera();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setPhotoData(evt.target.result);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirm = () => {
    onCapture(photoData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-rose-500" />
            <h3 className="font-bold text-white text-sm">Selfie Verification ({actionLabel})</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative aspect-square bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
          {loadingCamera && (
            <div className="text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-rose-500 mb-2" />
              Opening Camera...
            </div>
          )}

          {cameraError && !photoData && (
            <div className="p-4 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-[11px] text-slate-400">{cameraError}</p>
              <label className="inline-block px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl cursor-pointer">
                Upload Photo File
                <input type="file" accept="image/*" capture="user" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          )}

          {!photoData && !cameraError && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
          )}

          {photoData && (
            <img src={photoData} alt="Selfie preview" className="w-full h-full object-cover" />
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          {photoData ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1 shadow-lg shadow-rose-600/30"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm & {actionLabel}</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  onCapture(null);
                  onClose();
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-semibold"
              >
                Skip Photo
              </button>
              {!cameraError && (
                <button
                  type="button"
                  onClick={handleTakePhoto}
                  className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1 shadow-lg shadow-rose-600/30"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Snap Photo</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
