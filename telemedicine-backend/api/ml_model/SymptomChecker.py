from flask import Flask, request, jsonify
import joblib
import numpy as np
import pandas as pd
from flask_cors import CORS

# Load the trained model
model = joblib.load("diseaseModel.pkl")
symptom_descriptions = pd.read_csv('../datasets/symptom_Description.csv', index_col='Disease')
symptom_precautions = pd.read_csv('../datasets/symptom_precaution.csv', index_col='Disease')

# Load symptom severities
severity_df = pd.read_csv('../datasets/Symptom-severity.csv')
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
        
         # Map symptoms to weights using severity
        psymptoms = []
        for symptom in symptoms:
            if symptom in severity:
                psymptoms.append(severity[symptom])  # Replace symptom with its weight
            else:
                psymptoms.append(0)  # Default to 0 if symptom is unknown

        nulls = [0] * (17 - len(psymptoms))
        input_features = psymptoms + nulls

        # Ensure the input is exactly 17 features
        input_features = input_features[:17]

        # Convert to model input
        input_features = np.array(input_features).reshape(1, -1)

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
    app.run(host="0.0.0.0", port=5001)
