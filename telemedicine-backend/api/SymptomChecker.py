from flask import Flask, request, jsonify
import joblib
import numpy as np
import pandas as pd
from flask_cors import CORS

# Load the trained model
model = joblib.load("diseaseModel.pkl")
symptom_descriptions = pd.read_csv('datasets/symptom_Description.csv', index_col='Disease')
symptom_precautions = pd.read_csv('datasets/symptom_precaution.csv', index_col='Disease')

# Load symptom severities
severity_df = pd.read_csv('datasets/Symptom-severity.csv')
severity = dict(zip(severity_df['Symptom'], severity_df['weight']))

all_symptoms = list(severity.keys())

app = Flask(__name__)
CORS(app)

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        symptoms = data.get('symptoms', [])

        # Validate input
        if not isinstance(symptoms, list) or not symptoms:
            return jsonify({"error": "Invalid symptoms data. Provide a list of symptoms."}), 400

        # Update input features with user's symptoms, defaulting to 0 for missing ones
        symptom_weights = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        for i, feature in enumerate(all_symptoms):
            if feature in symptoms:
                symptom_weights[i] = severity.get(feature, 0)

        # Convert to model input
        input_features = np.array(symptom_weights).reshape(1, -1)

        # Debugging: Print input shape and contents
        print("Input Features Shape:", input_features.shape)
        print("Input Features:", input_features)

        # Predict the disease
        prediction = model.predict(input_features)
        disease = prediction[0]

        # Fetch description and precautions
        description = symptom_descriptions.loc[disease, 'Description'] if disease in symptom_descriptions.index else "No description available."
        precautions = symptom_precautions.loc[disease].tolist() if disease in symptom_precautions.index else ["No precautions available."]

        return jsonify({
            "disease": disease,
            "description": description,
            "precautions": precautions
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/symptoms', methods=['GET'])
def get_symptoms():
    try:
        # Return all symptom names from the severity dictionary
        return jsonify({"symptoms": list(severity.keys())}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5001)
