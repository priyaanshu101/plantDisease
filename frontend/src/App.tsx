import React, { useState } from 'react';
import axios from 'axios';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [prediction, setPrediction] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await axios.post(`${BACKEND_URL}/predict`, formData);
    setPrediction(res.data.prediction);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div>
      <h1>🌿 Plant Disease Detector</h1>
      <form onSubmit={handleSubmit}>
        <input type="file" accept="image/*" onChange={handleFileChange} />
        <button type="submit">Predict</button>
      </form>
      {prediction && <p><strong>Prediction:</strong> {prediction}</p>}
    </div>
  );
}

export default App;
