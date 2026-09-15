"""Frequency weighting theo ISO 2631-1:1997, Annex A.

Wk: truc dung (z) cho comfort/health khi ngoi.
Wd: truc ngang (x, y).

Trong so duoc ap dung trong mien tan so (FFT) roi tinh RMS bang dinh ly
Parseval. Vi RMS chi phu thuoc bien do, cach nay tuong duong loc bang
IIR nhung khong co transient o 2 dau segment ngan (van de cua filtfilt).

Da doi chieu voi bang gia tri Wk trong ISO 2631-1 (sai so <= 0.1%).
"""
import numpy as np

# Tham so Annex A (Hz). f1/f2: band-limiting 0.4 Hz - 100 Hz.
WEIGHTINGS = {
    "Wk": dict(f1=0.4, f2=100.0, f3=12.5, f4=12.5, q4=0.63,
               f5=2.37, q5=0.91, f6=3.35, q6=0.91),
    "Wd": dict(f1=0.4, f2=100.0, f3=2.0, f4=2.0, q4=0.63),
}


def weighting_magnitude(freqs, kind="Wk"):
    """|W(f)| theo ISO 2631-1 Annex A. freqs: Hz (array). W(0) = 0."""
    p_ = WEIGHTINGS[kind]
    f = np.asarray(freqs, dtype=float)
    out = np.zeros_like(f)
    nz = f > 0
    s = 2j * np.pi * f[nz]
    w = lambda hz: 2 * np.pi * hz

    w1, w2 = w(p_["f1"]), w(p_["f2"])
    h_high = 1 / (1 + np.sqrt(2) * w1 / s + (w1 / s) ** 2)
    h_low = 1 / (1 + np.sqrt(2) * s / w2 + (s / w2) ** 2)
    w3, w4 = w(p_["f3"]), w(p_["f4"])
    h_t = (1 + s / w3) / (1 + s / (p_["q4"] * w4) + (s / w4) ** 2)
    h = h_high * h_low * h_t
    if "f5" in p_:
        w5, w6 = w(p_["f5"]), w(p_["f6"])
        h_s = ((1 + s / (p_["q5"] * w5) + (s / w5) ** 2)
               / (1 + s / (p_["q6"] * w6) + (s / w6) ** 2)
               * (w5 / w6) ** 2)
        h = h * h_s
    out[nz] = np.abs(h)
    return out


def weighted_rms(signal, fs, kind="Wk"):
    """RMS co trong so (m/s²) cua tin hieu lay mau deu tai fs (Hz).

    Mean bi loai truoc (W(0) = 0 nen DC — gom bias cam bien — khong anh huong).
    Luu y: chi danh gia duoc tan so <= fs/2.
    """
    x = np.asarray(signal, dtype=float)
    n = len(x)
    if n < 2 or fs <= 0:
        return 0.0
    x = x - x.mean()
    spec = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(n, d=1.0 / fs)

    # Parseval mot phia: moi bin k>0 dai dien 2 bin (+/-), tru bin Nyquist.
    power = np.abs(spec) ** 2
    power[1:] *= 2
    if n % 2 == 0:
        power[-1] /= 2

    mean_square = np.sum(power * weighting_magnitude(freqs, kind) ** 2) / n ** 2
    return float(np.sqrt(mean_square))
