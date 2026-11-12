
import pandas as pd
import joblib

from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

from preprocessing import preprocess_text


# Get the backend folder path
BASE_DIR = Path(__file__).resolve().parent

# Dataset path
DATASET_PATH = BASE_DIR / "dataset" / "phishing_dataset.csv"

# Model folder path
MODEL_DIR = BASE_DIR / "models"

# Create models folder if it does not exist
MODEL_DIR.mkdir(exist_ok=True)

# Model save path
MODEL_PATH = MODEL_DIR / "phishing_model.pkl"


# Step 1: Load dataset
print("Loading dataset...")

data = pd.read_csv(DATASET_PATH)

# Check required columns
if not {"message", "label"}.issubset(data.columns):
    raise ValueError("Dataset must contain message and label columns.")

# Remove empty rows
data = data.dropna(subset=["message", "label"])

# Remove duplicate messages
data = data.drop_duplicates(subset=["message"])

# Convert labels into integers
data["label"] = data["label"].astype(int)

# Check valid labels
if not set(data["label"].unique()).issubset({0, 1}):
    raise ValueError("Labels must be 0 or 1.")

# Check number of examples
if data["label"].value_counts().min() < 2:
    raise ValueError("At least two examples per class are required.")

print("Dataset loaded successfully!")
print("Total messages:", len(data))

print("\nLabel distribution:")
print(data["label"].value_counts())


# Step 2: Preprocess messages
print("\nPreprocessing messages...")

data["clean_message"] = data["message"].apply(preprocess_text)

# Remove empty messages after preprocessing
data = data[data["clean_message"].str.strip() != ""]

X = data["clean_message"]
y = data["label"]


# Step 3: Split dataset
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.25,
    random_state=42,
    stratify=y
)

print("\nTraining samples:", len(X_train))
print("Testing samples:", len(X_test))


# Step 4: Convert text into numerical features
print("\nApplying TF-IDF...")

vectorizer = TfidfVectorizer(
    max_features=5000,
    ngram_range=(1, 2)
)

X_train_vectorized = vectorizer.fit_transform(X_train)
X_test_vectorized = vectorizer.transform(X_test)


# Step 5: Train Logistic Regression
print("\nTraining Logistic Regression model...")

model = LogisticRegression(max_iter=1000)

model.fit(X_train_vectorized, y_train)

print("Model training completed!")


# Step 6: Evaluate model
predictions = model.predict(X_test_vectorized)

accuracy = accuracy_score(y_test, predictions)

print("\n========== MODEL EVALUATION ==========")

print("Accuracy:", round(accuracy * 100, 2), "%")

print("\nClassification Report:")
print(
    classification_report(
        y_test,
        predictions,
        target_names=["Legitimate", "Phishing"],
        zero_division=0
    )
)

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, predictions))


# Step 7: Save model and vectorizer
model_data = {
    "model": model,
    "vectorizer": vectorizer
}

joblib.dump(model_data, MODEL_PATH)

print("\nModel and vectorizer saved successfully!")
print("Saved location:", MODEL_PATH)
