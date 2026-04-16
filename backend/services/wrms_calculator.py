import numpy as np
from .iso_filter import iso_filter

GRAVITY = 9.80665


def calculate_wrms_from_xyz(ax, ay, az, fs=50):
    """Tinh WRMS tu 3 truc gia toc theo ISO-2631.

    Input: ax/ay/az don vi m/s² (client da nhan G truoc khi gui).
    Orientation-independent: dung |‖a‖ - G| de khong phu thuoc huong phone.
    """
    ax = np.asarray(ax, dtype=float)
    ay = np.asarray(ay, dtype=float)
    az = np.asarray(az, dtype=float)

    magnitude = np.sqrt(ax ** 2 + ay ** 2 + az ** 2)
    dynamic = np.abs(magnitude - GRAVITY)

    # Butterworth high-pass can du padlen (~13 mau voi bac 4)
    if len(dynamic) >= 15 and fs > 1.0:
        weighted = iso_filter(dynamic, fs)
    else:
        weighted = dynamic

    wrms = np.sqrt(np.mean(weighted ** 2))
    return float(wrms)


def estimate_fs(timestamps):
    """Uoc luong sampling rate (Hz) tu timestamps (ms)."""
    if timestamps is None or len(timestamps) < 2:
        return 50.0
    ts = np.asarray(timestamps, dtype=float)
    dur_sec = (ts[-1] - ts[0]) / 1000.0
    if dur_sec <= 0:
        return 50.0
    return (len(ts) - 1) / dur_sec
