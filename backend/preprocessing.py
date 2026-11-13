
import re
import html


def preprocess_text(text):
    if text is None:
        return ""

    text = str(text)

    text = html.unescape(text)

    text = re.sub(r'<[^>]+>', ' ', text)

    text = re.sub(
        r'https?://\S+|www\.\S+',
        ' URL ',
        text,
        flags=re.IGNORECASE
    )

    text = re.sub(
        r'\b[\w.-]+@[\w.-]+\.\w+\b',
        ' EMAIL ',
        text
    )

    text = text.lower()

    text = re.sub(r'[^a-z\s]', ' ', text)

    text = re.sub(r'\s+', ' ', text).strip()

    return text


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
