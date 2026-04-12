import numpy as np
from .iso_filter import iso_filter


def calculate_wrms(acc_array, fs=50):
    """Tinh WRMS tu mang gia toc theo ISO-2631"""
    # Gia toc tong hop
    resultant = np.array(acc_array)

    # Tru trong luc
    dynamic = resultant - 9.81

    # Loc Butterworth ISO-2631
    if len(dynamic) >= 13:  # can du mau cho filtfilt
        weighted = iso_filter(dynamic, fs)
    else:
        weighted = dynamic

    # WRMS = sqrt(mean(a_w^2))
    wrms = np.sqrt(np.mean(weighted ** 2))
    return float(wrms)


def calculate_wrms_from_xyz(ax, ay, az, fs=50):
    """Tinh WRMS tu 3 truc gia toc"""
    resultant = np.sqrt(np.array(ax)**2 + np.array(ay)**2 + np.array(az)**2)
    return calculate_wrms(resultant, fs)
