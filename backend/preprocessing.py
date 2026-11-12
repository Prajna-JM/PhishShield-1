
import re
import html


def preprocess_text(text):
    # Handle empty input
    if text is None:
        return ""

    # Convert input into string
    text = str(text)

    # Decode HTML entities
    text = html.unescape(text)

    # Remove HTML tags
    text = re.sub(r'<[^>]+>', ' ', text)

    # Convert URLs into a common word
    text = re.sub(
        r'https?://\S+|www\.\S+',
        ' URL ',
        text,
        flags=re.IGNORECASE
    )

    # Convert email addresses into a common word
    text = re.sub(
        r'\b[\w.-]+@[\w.-]+\.\w+\b',
        ' EMAIL ',
        text
    )

    # Convert text to lowercase
    text = text.lower()

    # Remove special characters and numbers
    text = re.sub(r'[^a-z\s]', ' ', text)

    # Remove extra spaces
    text = re.sub(r'\s+', ' ', text).strip()

    return text


# Test the preprocessing function
if __name__ == "__main__":

    message = """
    URGENT! Your bank account will be blocked.
    Verify immediately at https://example.com
    """

    result = preprocess_text(message)

    print("Original Message:")
    print(message)

    print("\nPreprocessed Message:")
    print(result)
