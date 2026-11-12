
import re
import ipaddress
from urllib.parse import urlparse


def analyze_url(url):

    reasons = []
    risk_score = 0

    if not url or not str(url).strip():
        return {
            "url": url,
            "risk_score": 0,
            "risk_level": "Unknown",
            "is_suspicious": False,
            "reasons": ["No URL provided"]
        }

    url = str(url).strip()

    # Add scheme if missing
    if not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", url):
        url = "http://" + url

    parsed = urlparse(url)
    hostname = parsed.hostname or ""

    if not hostname:
        return {
            "url": url,
            "risk_score": 0,
            "risk_level": "Unknown",
            "is_suspicious": False,
            "reasons": ["Invalid URL"]
        }

    # Check HTTPS
    if parsed.scheme.lower() != "https":
        risk_score += 15
        reasons.append("URL does not use HTTPS")

    # Check URL length
    if len(url) > 75:
        risk_score += 15
        reasons.append("Unusually long URL")

    # Check IP address
    try:
        ipaddress.ip_address(hostname)
        risk_score += 30
        reasons.append("URL uses an IP address instead of a domain")
    except ValueError:
        pass

    # Check suspicious words
    suspicious_words = [
        "login", "verify", "update", "secure",
        "account", "banking", "password",
        "free", "prize", "claim"
    ]

    found_words = [
        word for word in suspicious_words
        if word in url.lower()
    ]

    if found_words:
        risk_score += 10
        reasons.append(
            "Suspicious keywords found: " + ", ".join(found_words)
        )

    # Check @ symbol
    if "@" in url:
        risk_score += 20
        reasons.append("URL contains an @ symbol")

    # Check excessive hyphens in hostname
    if hostname.count("-") >= 3:
        risk_score += 15
        reasons.append("Hostname contains multiple hyphens")

    # Limit score to 100
    risk_score = min(risk_score, 100)

    # Determine risk level
    if risk_score >= 60:
        risk_level = "High"
    elif risk_score >= 30:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    return {
        "url": url,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "is_suspicious": risk_score >= 30,
        "reasons": reasons
    }


# Test URL detection
if __name__ == "__main__":

    test_urls = [
        "https://www.google.com",
        "http://192.168.1.10/login",
        "http://secure-bank-login-verify.com/account"
    ]

    for test_url in test_urls:

        result = analyze_url(test_url)

        print("\nURL:", result["url"])
        print("Risk Score:", result["risk_score"])
        print("Risk Level:", result["risk_level"])
        print("Suspicious:", result["is_suspicious"])
        print("Reasons:", result["reasons"])
