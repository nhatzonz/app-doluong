import numpy as np
from scipy import signal


def iso_filter(acc, fs=50):
    """Butterworth high-pass filter theo ISO-2631 (tu readme.md)"""
    fc = 0.5          # human sensitivity frequency
    wn = fc / (fs / 2)
    b, a = signal.butter(4, wn, btype='high')
    return signal.filtfilt(b, a, acc)
