import React, { useState } from 'react';
import { Upload, Leaf, Camera, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [prediction, setPrediction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError("");
    setPrediction("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Actual API call to your backend
      const res = await axios.post(`${BACKEND_URL}/predict`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setPrediction(res.data.prediction);
    } catch (err: any) {
      console.error('Error calling backend:', err);
      setError(
        err.response?.data?.message || 
        err.message || 
        "Failed to analyze image. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError("");
      setPrediction("");
      
      // Create image preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      setError("");
      setPrediction("");
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-green-100">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center space-x-3">
            <div className="p-2 bg-green-100 rounded-full">
              <Leaf className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Plant Disease Detector</h1>
          </div>
          <p className="text-center text-gray-600 mt-2">
            Upload an image of your plant to detect diseases and get instant results
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8">
            <div className="space-y-6">
              {/* File Upload Area */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                  file 
                    ? 'border-green-400 bg-green-50' 
                    : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="file-upload"
                />
                
                {!imagePreview ? (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className="p-4 bg-green-100 rounded-full">
                        <Upload className="h-12 w-12 text-green-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-800 mb-2">
                        Drop your plant image here
                      </h3>
                      <p className="text-gray-600 mb-4">
                        or click to browse files
                      </p>
                      <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                        <Camera className="h-4 w-4" />
                        <span>Supports JPG, PNG, GIF up to 10MB</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-64 rounded-lg shadow-md"
                      />
                      <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="text-green-600 font-medium">
                      {file?.name}
                    </p>
                    <label
                      htmlFor="file-upload"
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 cursor-pointer transition-colors"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Different Image
                    </label>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmit(e as any);
                }}
                disabled={!file || loading}
                className={`w-full py-4 px-6 rounded-xl font-medium text-white transition-all duration-300 ${
                  !file || loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Analyzing Plant...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Leaf className="h-5 w-5" />
                    <span>Detect Disease</span>
                  </div>
                )}
              </button>
            </div>

            {/* Results Section */}
            {(prediction || error) && (
              <div className="mt-8 p-6 rounded-xl border">
                {error && (
                  <div className="flex items-center space-x-3 text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span className="font-medium">{error}</span>
                  </div>
                )}
                
                {prediction && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-full">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800">Analysis Results</h3>
                    </div>
                    
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
                      <p className="text-lg font-medium text-gray-800 mb-2">Prediction:</p>
                      <p className="text-xl font-bold text-green-700">{prediction}</p>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <strong>💡 Tip:</strong> For best results, ensure your image is well-lit and shows the plant clearly. 
                        If you're unsure about the results, consider consulting with a plant expert.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-600">
          <p className="text-sm">
            Powered by advanced AI technology for accurate plant disease detection
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
