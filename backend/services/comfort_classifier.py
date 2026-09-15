def classify(wrms):
    """Phan loai ISO-2631 comfort level.

    Bang goc trong ISO 2631-1 (Annex C) co cac khoang chong lan (vd 0.5-1.0,
    0.8-1.6) de phan anh tinh chu quan; o day dung nguong gioi han duoi cua
    tung muc de co phan loai duy nhat.
    """
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
    """6 muc mau ISO-2631, dong bo voi FE comfortGradient."""
    if wrms < 0.315:
        return "#10B981"   # Comfortable — green
    elif wrms < 0.63:
        return "#65A30D"   # Some discomfort — lime
    elif wrms < 1.0:
        return "#F59E0B"   # Quite uncomfortable — amber
    elif wrms < 1.6:
        return "#F97316"   # Uncomfortable — orange
    elif wrms < 2.5:
        return "#EF4444"   # Very uncomfortable — red
    else:
        return "#991B1B"   # Extremely uncomfortable — deep red
