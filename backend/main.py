from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from tflite_runner import classify_image
from PIL import Image
import io
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
import os
from pydantic import BaseModel

load_dotenv()

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

class DiseaseRequest(BaseModel):
    disease: str

@app.post("/suggestion")
async def suggest(request: DiseaseRequest):
    disease = request.disease
    print("disease: ", disease)
    llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0,
    max_tokens=None,
    timeout=None,
    max_retries=2,
    api_key=os.getenv("GEMINI_API")
)
    system_prompt = f""""
    Give brief suggestions about the following disease: {disease}. In simple text, no markdown required.
    """
    response = llm.invoke(system_prompt)
    print(response.content)
    return response.content

class QueryRequest(BaseModel):
    disease: str
    message: str
    previousMessages: str

@app.post("/chat")
async def chat(request: QueryRequest):
    disease = request.disease
    query = request.message
    previousMessages = request.previousMessages
    print("disease: ", disease)
    print("query: ", query)
    print("older msg", previousMessages)
    llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0,
    max_tokens=None,
    timeout=None,
    max_retries=2,
    api_key=os.getenv("GEMINI_API")
)
    system_prompt = f""""
    In context of disease {disease} answer the query {query} in brief, use previous chats {previousMessages} if needed.
    In simple text, no markdown required.
    """
    response = llm.invoke(system_prompt)
    print(response.content)
    return {"response": response.content}
    