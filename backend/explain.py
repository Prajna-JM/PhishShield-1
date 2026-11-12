
from preprocessing import preprocess_text
from security import analyze_url
import re


# Words and phrases that may indicate phishing
SUSPICIOUS_PHRASES = [
    "urgent",
    "immediately",
    "account blocked",
    "account suspended",
    "verify your account",
    "verify your details",
    "click here",
    "claim your prize",
    "limited time",
    "act now",
    "password",
    "otp",
    "bank details",
    "credit card",
    "debit card",
    "pin"
]


def generate_explanation(message, ml_prediction, ml_probability=None):

    explanations = []
    url_results = []

    clean_message = preprocess_text(message)

    original_message = str(message).lower()

    # Check suspicious phrases
    for phrase in SUSPICIOUS_PHRASES:

        if phrase in original_message:
            explanations.append(
                f"Suspicious phrase detected: '{phrase}'"
            )

    # Check URLs present in the message
    urls = re.findall(
        r'https?://[^\s<>]+|www\.[^\s<>]+',
        str(message),
        flags=re.IGNORECASE
    )

    for url in urls:

        result = analyze_url(url)
        url_results.append(result)

        if result["is_suspicious"]:
            explanations.append(
                f"Suspicious URL detected: {url}"
            )

            for reason in result["reasons"]:
                explanations.append(reason)

    # ML prediction explanation
    if ml_prediction == 1:

        explanations.append(
            "Machine Learning model classified this message as phishing."
        )

    else:

        explanations.append(
            "Machine Learning model classified this message as legitimate."
        )

    # Add model probability if available
    if ml_probability is not None:

        explanations.append(
            f"Model phishing probability: {ml_probability:.2f}%"
        )

    # Remove duplicate explanations
    explanations = list(dict.fromkeys(explanations))

    # Final result
    if ml_prediction == 1 or any(
        result["is_suspicious"] for result in url_results
    ):
        final_result = "Phishing"
    else:
        final_result = "Legitimate"

    return {
        "prediction": final_result,
        "explanations": explanations,
        "url_analysis": url_results
    }


# Test explanation module
if __name__ == "__main__":

    sample_message = """
    URGENT! Your bank account will be blocked.
    Verify your details immediately at
    http://secure-bank-login-verify.com/account
    """

    result = generate_explanation(
        sample_message,
        ml_prediction=1,
        ml_probability=92.5
    )

    print("\n========== PHISHSHIELD EXPLANATION ==========")

    print("Final Prediction:", result["prediction"])

    print("\nReasons:")

    for reason in result["explanations"]:
        print("-", reason)

    print("\nURL Analysis:")

    for url in result["url_analysis"]:
        print(url)
