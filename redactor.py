import re

def redact_text(text):
    #Define regular expressions to look for
    patterns = {
        "SSN": r"\b\d{3}-\d{2}-\d{4}\b",
        "Credit Card": r"\b\d{4}-\d{4}-\d{4}-\d{4}\b",
        "Phone": r"\+?\d{0,2}[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}",
        "Driver's License": r"\b[0-9]{8,9}\b", 
        "Email": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
    }

    # Replace matches with [REDACTED]
    for label, pattern in patterns.items():
        text = re.sub(pattern, "[REDACTED]", text)

    return text

sample_text = "My Social Security Number is 123-45-6789. My driver's license is 123456789 and credit card is 4111-1111-1111-1111. I live in Tennessee and my phone number is (423)-836-5404. My email is tcmartin42@tntech.edu."

redacted_text = redact_text(sample_text)
print(redacted_text)
