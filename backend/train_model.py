
import pandas as pd
import joblib

from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.model_selection import StratifiedKFold, cross_validate, cross_val_predict
from sklearn.metrics import classification_report, confusion_matrix

from preprocessing import preprocess_text


BASE_DIR = Path(__file__).resolve().parent

DATASET_PATH = BASE_DIR / "dataset" / "phishing_dataset.csv"
MODEL_DIR = BASE_DIR / "models"
MODEL_DIR.mkdir(exist_ok=True)

MODEL_PATH = MODEL_DIR / "phishing_model.pkl"


print("Loading dataset...")

data = pd.read_csv(DATASET_PATH, encoding="utf-8-sig")

data.columns = data.columns.str.strip().str.lower()

if not {"message", "label"}.issubset(data.columns):
    raise ValueError("Dataset must contain message and label columns.")

data = data.dropna(subset=["message", "label"])

data["message"] = data["message"].astype(str).str.strip()
data = data[data["message"] != ""]

data = data.drop_duplicates(subset=["message"])

data["label"] = pd.to_numeric(data["label"], errors="raise").astype(int)

if not set(data["label"].unique()).issubset({0, 1}):
    raise ValueError("Labels must be 0 or 1.")

print("\nDataset loaded successfully!")
print("Total messages:", len(data))
print("\nLabel distribution:")
print(data["label"].value_counts().sort_index())

data["clean_message"] = data["message"].apply(preprocess_text)

data = data[data["clean_message"].str.strip() != ""]

X = data["clean_message"]
y = data["label"]

if y.value_counts().min() < 5:
    raise ValueError("At least five messages per class are required for 5-fold cross-validation.")

cv = StratifiedKFold(
    n_splits=5,
    shuffle=True,
    random_state=42
)

models = {
    "Logistic Regression": LogisticRegression(max_iter=1000),
    "Multinomial Naive Bayes": MultinomialNB()
}

results = {}

print("\n========== MODEL COMPARISON ==========")

for name, classifier in models.items():

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 2)
        )),
        ("classifier", classifier)
    ])

    scores = cross_validate(
        pipeline,
        X,
        y,
        cv=cv,
        scoring={
            "accuracy": "accuracy",
            "precision": "precision",
            "recall": "recall",
            "f1": "f1"
        },
        error_score="raise"
    )

    results[name] = {
        "model": classifier,
        "scores": scores
    }

    print(f"\n{name}")
    print("Accuracy:", round(scores["test_accuracy"].mean() * 100, 2), "%")
    print("Precision:", round(scores["test_precision"].mean() * 100, 2), "%")
    print("Recall:", round(scores["test_recall"].mean() * 100, 2), "%")
    print("F1-score:", round(scores["test_f1"].mean() * 100, 2), "%")


best_name = max(
    results,
    key=lambda name: (
        results[name]["scores"]["test_f1"].mean(),
        results[name]["scores"]["test_precision"].mean()
    )
)

best_model = results[best_name]["model"]

print("\n========== BEST MODEL ==========")
print("Selected model:", best_name)

best_pipeline = Pipeline([
    ("tfidf", TfidfVectorizer(
        max_features=5000,
        ngram_range=(1, 2)
    )),
    ("classifier", best_model)
])

predictions = cross_val_predict(
    best_pipeline,
    X,
    y,
    cv=cv
)

print("\n========== CLASSIFICATION REPORT ==========")

print(
    classification_report(
        y,
        predictions,
        labels=[0, 1],
        target_names=["Legitimate", "Phishing"],
        zero_division=0
    )
)

print("\n========== CONFUSION MATRIX ==========")
print(confusion_matrix(y, predictions, labels=[0, 1]))


print("\nTraining selected model on the complete dataset...")

vectorizer = TfidfVectorizer(
    max_features=5000,
    ngram_range=(1, 2)
)

X_vectorized = vectorizer.fit_transform(X)

best_model.fit(X_vectorized, y)

model_data = {
    "model": best_model,
    "vectorizer": vectorizer
}

joblib.dump(model_data, MODEL_PATH)

print("\nModel and vectorizer saved successfully!")
print("Selected algorithm:", best_name)
print("Saved location:", MODEL_PATH)
