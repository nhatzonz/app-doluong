import numpy as np
from .iso_filter import iso_filter


def calculate_wrms_from_xyz(ax, ay, az, fs=50):
    """Tinh WRMS tu 3 truc gia toc theo ISO-2631

    Expo Accelerometer tra ve m/s² (bao gom trong luc tren truc Z)
    Phai tru trong luc TRUOC khi tinh tong hop:
      Dung: sqrt(ax² + ay² + (az - 9.81)²)
      Sai:  sqrt(ax² + ay² + az²) - 9.81
    """
    ax = np.array(ax)
    ay = np.array(ay)
    az = np.array(az)

    # Tru trong luc tren truc Z truoc
    dyn_z = az - 9.81

    # Gia toc dong tong hop
    dynamic = np.sqrt(ax**2 + ay**2 + dyn_z**2)

    # Loc Butterworth ISO-2631
    if len(dynamic) >= 13:  # can du mau cho filtfilt (bac 4 * 3 + 1)
        weighted = iso_filter(dynamic, fs)
    else:
        weighted = dynamic

    # WRMS = sqrt(mean(a_w^2))
    wrms = np.sqrt(np.mean(weighted ** 2))
    return float(wrms)
