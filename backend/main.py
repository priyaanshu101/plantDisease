from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from tflite_runner import classify_image
from PIL import Image
import io

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load class names
with open("class_names.txt", "r") as f:
    CLASS_NAMES = [line.strip() for line in f]

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    class_id = classify_image(image)
    return {"prediction": CLASS_NAMES[class_id]}
