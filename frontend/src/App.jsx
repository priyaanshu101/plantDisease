import React, { useState, useRef, useEffect } from 'react';
import { Upload, Leaf, Camera, AlertCircle, CheckCircle, Loader2, Lightbulb, Send, MessageCircle, User, Bot, X } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function App() {
  const [file, setFile] = useState(null);
  const [prediction, setPrediction] = useState("");
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  
  // Chat-related state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError("");
    setPrediction("");
    setSuggestions(null);
    setChatMessages([]); // Clear chat when new analysis starts
    setShowChat(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(`${BACKEND_URL}/predict`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setPrediction(res.data.prediction);
      
      const suggestionRes = await axios.post(`${BACKEND_URL}/suggestion`, {disease: res.data.prediction}, {
      });
      
      setSuggestions(suggestionRes.data);
    } catch (err) {
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

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatLoading(true);

    // Add user message to chat
    const newUserMessage = {
      id: Date.now(),
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, newUserMessage]);

    try {
      const previousMessagesString = chatMessages
      .map(msg => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');
      // Send chat query to backend with context
      const chatRes = await axios.post(`${BACKEND_URL}/chat`, {
        message: userMessage,
        disease: prediction,
        previousMessages: previousMessagesString, // Send as formatted string
      });

      // Add bot response to chat
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: chatRes.data.response || chatRes.data || "I'm sorry, I couldn't process your question.",
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, botMessage]);

    } catch (err) {
      console.error('Error in chat:', err);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: "I'm sorry, I encountered an error while processing your question. Please try again.",
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError("");
      setPrediction("");
      setSuggestions(null);
      setChatMessages([]);
      setShowChat(false);

      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      setError("");
      setPrediction("");
      setSuggestions(null);
      setChatMessages([]);
      setShowChat(false);

      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result);
      };
      reader.readAsDataURL(droppedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
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

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8">
            <div className="space-y-6">
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

              <button
                onClick={handleSubmit}
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

            {(prediction || error) && (
              <div className="mt-8 space-y-6">
                {error && (
                  <div className="flex items-center space-x-3 text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span className="font-medium">{error}</span>
                  </div>
                )}

                {prediction && (
                  <div className="space-y-6">
                    <div className="p-6 rounded-xl border bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-green-100 rounded-full">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800">Analysis Results</h3>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-green-200">
                        <p className="text-sm font-medium text-gray-600 mb-1">Detected Disease:</p>
                        <p className="text-xl font-bold text-green-700">{prediction}</p>
                      </div>
                    </div>

                    {suggestions && (
                      <div className="p-6 rounded-xl border bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="p-2 bg-blue-100 rounded-full">
                            <Lightbulb className="h-6 w-6 text-blue-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-800">Treatment Suggestions</h3>
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-blue-200">
                          {typeof suggestions === 'string' ? (
                            <div className="prose prose-sm max-w-none">
                              <p className="text-gray-700 whitespace-pre-wrap">{suggestions}</p>
                            </div>
                          ) : suggestions.suggestion ? (
                            <div className="prose prose-sm max-w-none">
                              <p className="text-gray-700 whitespace-pre-wrap">{suggestions.suggestion}</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {Object.entries(suggestions).map(([key, value]) => (
                                <div key={key} className="border-b border-gray-200 pb-2 last:border-b-0">
                                  <p className="font-medium text-gray-800 capitalize mb-1">
                                    {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:
                                  </p>
                                  <p className="text-gray-700 text-sm">{value}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Chat Toggle Button */}
                    <div className="flex justify-center">
                      <button
                        onClick={() => setShowChat(!showChat)}
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        <MessageCircle className="h-5 w-5 mr-2" />
                        {showChat ? 'Hide Chat Assistant' : 'Ask Questions About This Diagnosis'}
                      </button>
                    </div>

                    {/* Chat Interface */}
                    {showChat && (
                      <div className="p-6 rounded-xl border bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-purple-100 rounded-full">
                              <MessageCircle className="h-6 w-6 text-purple-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800">Chat Assistant</h3>
                          </div>
                          <button
                            onClick={() => setShowChat(false)}
                            className="p-2 hover:bg-purple-100 rounded-full transition-colors"
                          >
                            <X className="h-5 w-5 text-gray-500" />
                          </button>
                        </div>

                        {/* Chat Messages */}
                        <div className="bg-white rounded-lg border border-purple-200 mb-4">
                          <div className="h-80 overflow-y-auto p-4 space-y-4">
                            {chatMessages.length === 0 ? (
                              <div className="text-center text-gray-500 py-8">
                                <Bot className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                                <p>Ask me anything about the detected disease!</p>
                                <p className="text-sm mt-1">Examples: "How can I prevent this?", "Is this contagious?", "What causes this disease?"</p>
                              </div>
                            ) : (
                              chatMessages.map((message) => (
                                <div
                                  key={message.id}
                                  className={`flex items-start space-x-3 ${
                                    message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                                  }`}
                                >
                                  <div className={`p-2 rounded-full ${
                                    message.type === 'user' 
                                      ? 'bg-purple-100' 
                                      : 'bg-gray-100'
                                  }`}>
                                    {message.type === 'user' ? (
                                      <User className="h-4 w-4 text-purple-600" />
                                    ) : (
                                      <Bot className="h-4 w-4 text-gray-600" />
                                    )}
                                  </div>
                                  <div className={`flex-1 ${
                                    message.type === 'user' ? 'text-right' : ''
                                  }`}>
                                    <div className={`inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                      message.type === 'user'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {formatTime(message.timestamp)}
                                    </p>
                                  </div>
                                </div>
                              ))
                            )}
                            {chatLoading && (
                              <div className="flex items-start space-x-3">
                                <div className="p-2 bg-gray-100 rounded-full">
                                  <Bot className="h-4 w-4 text-gray-600" />
                                </div>
                                <div className="flex-1">
                                  <div className="inline-block bg-gray-100 px-4 py-2 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      <span className="text-sm text-gray-600">Thinking...</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            <div ref={chatEndRef} />
                          </div>
                        </div>

                        {/* Chat Input */}
                        <form onSubmit={handleChatSubmit} className="flex space-x-2">
                          <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Ask a question about the diagnosis..."
                            className="flex-1 px-4 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            disabled={chatLoading}
                          />
                          <button
                            type="submit"
                            disabled={!chatInput.trim() || chatLoading}
                            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                              !chatInput.trim() || chatLoading
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg'
                            }`}
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </form>
                      </div>
                    )}

                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                      <p className="text-sm text-amber-800">
                        <strong>💡 Important:</strong> These suggestions are AI-generated and should be used as guidance only. 
                        For serious plant diseases or valuable plants, consider consulting with a plant pathologist or agricultural expert.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

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