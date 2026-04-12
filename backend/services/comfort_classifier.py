def classify(wrms):
    """Phan loai ISO-2631 comfort level"""
    if wrms < 0.315:
        return "Comfortable"
    elif wrms < 0.63:
        return "Some discomfort"
    elif wrms < 1.0:
        return "Quite uncomfortable"
    elif wrms < 1.6:
        return "Uncomfortable"
    elif wrms < 2.5:
        return "Very uncomfortable"
    else:
        return "Extremely uncomfortable"


def get_color(wrms):
    """Tra ve mau theo muc do gho"""
    if wrms < 0.63:
        return "#4CAF50"   # Xanh
    elif wrms < 1.6:
        return "#FF9800"   # Cam
    else:
        return "#F44336"   # Do
