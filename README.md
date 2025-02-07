# Emotion Recognition WebApp

## Overview
The **Emotion Recognition WebApp** is a machine learning-powered web application that classifies emotions from text input. It utilizes a pre-trained transformer model to analyze text and determine the predominant emotion. The application also allows users to upload PDF files for batch emotion analysis and provides a feature to rephrase text to align with a selected emotion.

## Features
- **Text-Based Emotion Analysis**: Users can enter text, and the model predicts its emotional category.
- **PDF File Upload and Processing**: Extracts narrative text from PDF documents and classifies emotions for each text snippet.
- **Text Rephrasing**: Users can rephrase text to match a chosen emotion.
- **Interactive UI with Charts**: Displays emotion analysis results using charts and interactive elements.
- **API Endpoints**: Exposes RESTful API endpoints for integration with other applications.

## Technologies Used
- **Backend**: FastAPI, Flask, Flask-CORS
- **Machine Learning**: `transformers`, `torch` (using `j-hartmann/emotion-english-distilroberta-base` model)
- **PDF Processing**: `unstructured_ingest`
- **Generative AI**: Google Gemini AI for text rephrasing
- **Environment Management**: `python-dotenv`
- **Frontend**: TailwindCSS, Chart.js, JavaScript

## Installation and Setup
### Prerequisites
Ensure you have the following installed:
- Python (>=3.8)
- pip (Python package manager)

### Clone the Repository
```bash
git clone https://github.com/your-username/emotion-recognition-webapp.git
cd emotion-recognition-webapp
```

### Install Dependencies
```bash
pip install -r requirements.txt
```

### Set Up Environment Variables
Create a `.env` file and add your API keys:
```ini
UNSTRUCTURED_API_KEY=your_unstructured_api_key
GOOGLE_API_KEY=your_google_api_key
```

### Run the Application
```bash
python app.py
```
By default, the app runs on `http://127.0.0.1:5000/`.

## API Endpoints
### 1. Predict Emotion
**Endpoint:** `/predict_emotion`
- **Method:** `POST`
- **Payload:** `{ "text": "Your input text" }`
- **Response:** `{ "joy": 80.5, "sadness": 10.2, "anger": 9.3 }`

### 2. Upload PDF for Emotion Analysis
**Endpoint:** `/upload`
- **Method:** `POST`
- **Payload:** PDF file
- **Response:** Emotion classification for extracted text.

### 3. Rephrase Text Based on Emotion
**Endpoint:** `/rephrase`
- **Method:** `POST`
- **Payload:** `{ "text": "Your input text", "emotion": "joy" }`
- **Response:** `{ "rephrased_text": "Your joyful version of the text" }`

## Usage Guide
1. Enter text in the input field to analyze its emotion.
2. Upload a PDF file to extract text and classify emotions.
3. Click on "Rephrase" and select an emotion to rephrase your text.
4. View results in real-time, including graphical emotion distribution.

## Contributing
Feel free to submit issues or pull requests to enhance the project.

---

