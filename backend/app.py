import json
import os
import tempfile
import google.generativeai as genai
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from transformers import pipeline
from unstructured_ingest.v2.pipeline.pipeline import Pipeline
from unstructured_ingest.v2.interfaces import ProcessorConfig
from unstructured_ingest.v2.processes.connectors.local import (
    LocalIndexerConfig,
    LocalDownloaderConfig,
    LocalConnectionConfig,
    LocalUploaderConfig
)
from unstructured_ingest.v2.processes.partitioner import PartitionerConfig
from dotenv import load_dotenv
load_dotenv()


app = Flask(__name__)
CORS(app)  

OUTPUT_DIR = "./output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

classifier = pipeline("text-classification", model="j-hartmann/emotion-english-distilroberta-base", top_k=None)


os.environ["UNSTRUCTURED_API_KEY"] = os.getenv("UNSTRUCTURED_API_KEY")
os.environ["GOOGLE_API_KEY"] = os.getenv("GOOGLE_API_KEY")
os.environ["UNSTRUCTURED_API_URL"] = "https://api.unstructured.io/general/v0/general"


genai.configure(api_key=os.environ["GOOGLE_API_KEY"])

@app.route('/predict_emotion', methods=['POST'])
def predict_emotion():
    try:
        data = request.get_json()
        text = data.get('text')

        if text is None:
            return jsonify({'error': 'Text input is required'}), 400

        results = classifier(text)
        emotions = {
            "anger": 0.0,
            "disgust": 0.0,
            "fear": 0.0,
            "joy": 0.0,
            "neutral": 0.0,
            "sadness": 0.0,
            "surprise": 0.0
        }

        for result in results[0]:
            emotions[result['label']] = round(result['score'] * 100, 2)

        return jsonify(emotions)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.post('/upload')
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if not file.filename.endswith('.pdf'):
        return jsonify({'error': 'Only PDF files are allowed'}), 400

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            file_path = temp_file.name
            file.save(file_path)

        pipeline_instance = Pipeline.from_configs(
            context=ProcessorConfig(),
            indexer_config=LocalIndexerConfig(input_path=file_path),
            downloader_config=LocalDownloaderConfig(),
            source_connection_config=LocalConnectionConfig(),
            partitioner_config=PartitionerConfig(
                partition_by_api=True,
                api_key=os.getenv("UNSTRUCTURED_API_KEY"),
                partition_endpoint=os.getenv("UNSTRUCTURED_API_URL"),
                strategy="hi_res",
                additional_partition_args={
                    "split_pdf_page": True,
                    "split_pdf_allow_failed": True,
                    "split_pdf_concurrency_level": 15
                }
            ),
            uploader_config=LocalUploaderConfig(output_dir=OUTPUT_DIR)
        )

        pipeline_instance.run()

        output_file_path = os.path.join(OUTPUT_DIR, f"{os.path.basename(file_path)}.json")
        with open(output_file_path, "r") as f:
            json_content = json.load(f)

        def extract_narrative_text(data):
            narrative_texts = []
            
            for item in data:
                if item['type'] == 'NarrativeText':
                    narrative_texts.append(item['text'])
            
            return narrative_texts

        valuesList=extract_narrative_text(json_content)
        emotion_results = [] 
        for text in valuesList: 
            response = app.test_client().post('/predict_emotion', json={'text': text}) 
            if response.status_code == 200: 
                emotion_data = response.get_json() 
                max_emotion = max(emotion_data, key=emotion_data.get) 
                emotion_results.append({text: max_emotion}) 
            else: emotion_results.append({text: 'Error processing'}) 
            
        print(emotion_results)
        return jsonify(emotion_results)

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        os.remove(file_path)


@app.route('/rephrase', methods=['POST'])
def rephrase():
    try:
        data = request.get_json()
        text = data.get('text')
        emotion = data.get('emotion')

        if not text or not emotion:
            return jsonify({'error': 'Text and emotion are required'}), 400

        prompt = f"Rephrase this text as a {emotion} sentence which would be classified in {emotion} category by j-hartmann/emotion-english-distilroberta-base emotion recognition ML model. Only reply with the final sentence and nothing else: '{text}'"

        generation_config = {
            "temperature": 1,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 8192,
            "response_mime_type": "text/plain",
        }

        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash-exp",
            generation_config=generation_config,
        )

        chat_session = model.start_chat(
            history=[]
        )

        response = chat_session.send_message(prompt)

        return jsonify({'rephrased_text': response.text})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True ,port=8080)
