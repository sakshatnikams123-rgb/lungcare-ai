"""
LungCare AI - backend

Serves the existing HTML/CSS/JS frontend and exposes a /predict
endpoint that runs uploaded images through the trained CNN from
Lung_Cancer_Model.ipynb.

Run:
    pip install -r requirements.txt
    python app.py
Then open http://127.0.0.1:5000 in your browser.
"""

import io
import os

import numpy as np
from flask import Flask, jsonify, request, send_from_directory
from PIL import Image

# --- Config -----------------------------------------------------------

IMG_WIDTH = 150
IMG_HEIGHT = 150
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "lung_cancer_cnn.keras")

# This order MUST match the class_indices your notebook printed after
# train_generator = train_datagen.flow_from_directory(...).
# Keras sorts class folders alphabetically, so for folders named
# "Benign cases", "Malignant cases", "Normal cases" the order is:
CLASS_NAMES = ["Benign cases", "Malignant cases", "Normal cases"]

app = Flask(__name__, static_folder="frontend", static_url_path="")

# --- Model loading ------------------------------------------------------

_model = None
_model_load_error = None


def get_model():
    """Lazily load the Keras model on first request (and reuse it)."""
    global _model, _model_load_error
    if _model is not None:
        return _model
    if _model_load_error is not None:
        return None
    try:
        import tensorflow as tf  # imported here so the server can still boot without TF installed

        if not os.path.exists(MODEL_PATH):
            _model_load_error = f"Model file not found at {MODEL_PATH}"
            return None
        _model = tf.keras.models.load_model(MODEL_PATH)
        return _model
    except Exception as exc:  # noqa: BLE001
        _model_load_error = str(exc)
        return None


def preprocess_image(file_bytes: bytes) -> np.ndarray:
    """Match the notebook's preprocessing: grayscale, 150x150, rescale 1/255."""
    img = Image.open(io.BytesIO(file_bytes)).convert("L")  # grayscale
    img = img.resize((IMG_WIDTH, IMG_HEIGHT))
    arr = np.array(img, dtype=np.float32) / 255.0
    arr = arr.reshape(1, IMG_HEIGHT, IMG_WIDTH, 1)
    return arr


# --- Routes -------------------------------------------------------------


@app.route("/")
def home():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/predict", methods=["POST"])
def predict():
    model = get_model()
    if model is None:
        return (
            jsonify(
                {
                    "error": "Model not available on the server.",
                    "detail": _model_load_error
                    or "Place your trained lung_cancer_cnn.keras file in the model/ folder.",
                }
            ),
            503,
        )

    if "image" not in request.files:
        return jsonify({"error": "No image file received. Expected form field 'image'."}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "Empty filename."}), 400

    try:
        img_array = preprocess_image(file.read())
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": f"Could not read image: {exc}"}), 400

    probabilities = model.predict(img_array, verbose=0)[0]
    predicted_index = int(np.argmax(probabilities))
    predicted_class = CLASS_NAMES[predicted_index]
    confidence = float(probabilities[predicted_index]) * 100

    return jsonify(
        {
            "class": predicted_class,
            "confidence": round(confidence, 2),
            "probabilities": {
                CLASS_NAMES[i]: round(float(p) * 100, 2) for i, p in enumerate(probabilities)
            },
        }
    )


@app.route("/health")
def health():
    model = get_model()
    return jsonify({"model_loaded": model is not None, "error": _model_load_error})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
