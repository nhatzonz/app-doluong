import numpy as np
from .iso_weighting import weighted_rms

# He so k cho comfort, nguoi ngoi, mat ghe (ISO 2631-1 muc 8.2.2): kx = ky = kz = 1.
# (k = 1.4 cho truc ngang chi dung khi danh gia suc khoe.)
K_X = K_Y = K_Z = 1.0

MIN_SAMPLES = 16


def estimate_fs(timestamps):
    """Uoc luong sampling rate (Hz) tu timestamps (ms)."""
    if timestamps is None or len(timestamps) < 2:
        return 50.0
    ts = np.asarray(timestamps, dtype=float)
    dur_sec = (ts[-1] - ts[0]) / 1000.0
    if dur_sec <= 0:
        return 50.0
    return (len(ts) - 1) / dur_sec


def resample_uniform(timestamps, values, fs):
    """Noi suy tuyen tinh ve luoi thoi gian deu (FFT can mau cach deu)."""
    ts = np.asarray(timestamps, dtype=float) / 1000.0
    ts = ts - ts[0]
    n = max(2, int(round(ts[-1] * fs)) + 1)
    grid = np.arange(n) / fs
    return [np.interp(grid, ts, np.asarray(v, dtype=float)) for v in values]


def decompose_axes(ax, ay, az):
    """Tach gia toc (m/s²) thanh truc dung va 2 truc ngang, doc lap huong phone.

    Huong trong luc = vector trung binh cua segment. Truc dung = hinh chieu
    len huong nay (tuyen tinh, co dau — khong dung abs). Hai truc ngang lay
    theo co so truc chuan bat ky vuong goc voi trong luc: vi x va y dung cung
    Wd va cung k nen tong binh phuong khong phu thuoc cach chon co so.

    Han che: gia toc/phanh keo dai lam lech uoc luong trong luc vai do.
    """
    a = np.column_stack([ax, ay, az]).astype(float)
    g_vec = a.mean(axis=0)
    g_norm = np.linalg.norm(g_vec)
    if g_norm < 1e-6:
        g_hat = np.array([0.0, 0.0, 1.0])
    else:
        g_hat = g_vec / g_norm

    helper = np.array([1.0, 0.0, 0.0]) if abs(g_hat[0]) < 0.9 else np.array([0.0, 1.0, 0.0])
    e1 = np.cross(g_hat, helper)
    e1 /= np.linalg.norm(e1)
    e2 = np.cross(g_hat, e1)

    return a @ e1, a @ e2, a @ g_hat


def analyze_segment(ax, ay, az, timestamps):
    """WRMS theo ISO 2631-1 cho 1 segment.

    Input: ax/ay/az don vi m/s², timestamps don vi ms.
    Tra ve: av (overall vibration total value), aw_z (Wk), aw_xy (Wd, gop 2 truc
    ngang), fs, duration.
    """
    fs = estimate_fs(timestamps)
    ax, ay, az = resample_uniform(timestamps, [ax, ay, az], fs)
    hx, hy, vz = decompose_axes(ax, ay, az)

    aw_x = weighted_rms(hx, fs, "Wd")
    aw_y = weighted_rms(hy, fs, "Wd")
    aw_z = weighted_rms(vz, fs, "Wk")

    av = float(np.sqrt((K_X * aw_x) ** 2 + (K_Y * aw_y) ** 2 + (K_Z * aw_z) ** 2))
    return {
        "wrms": av,
        "aw_z": aw_z,
        "aw_xy": float(np.hypot(aw_x, aw_y)),
        "fs": float(fs),
        "duration": float(len(vz) / fs),
    }


def energy_average(wrms_values, durations):
    """WRMS tong cua ca chuyen di: RMS theo nang luong, trong so thoi luong.

    Trung binh cong cac WRMS la sai ve mat vat ly (RMS khong cong tuyen tinh).
    """
    w = np.asarray(wrms_values, dtype=float)
    d = np.asarray(durations, dtype=float)
    if len(w) == 0 or d.sum() <= 0:
        return 0.0
    return float(np.sqrt(np.sum(w ** 2 * d) / d.sum()))
