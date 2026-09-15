import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score

LAGS = 3                 # so segment truoc dung lam feature
MIN_TRAIN = 15
MIN_TEST = 5
FEATURE_NAMES = ["mean", "std", "peak", "speed"]


def extract_features(wrms_values, speeds):
    """Feature cho segment i chi lay tu cac segment TRUOC i (i-LAGS .. i-1)
    va toc do cua chinh segment i (biet truoc khi do WRMS).

    Ban cu dung cua so chua chinh wrms[i] trong khi target cung la wrms[i]
    -> ro ri target, R² vo nghia.
    """
    wrms = np.asarray(wrms_values, dtype=float)
    spd = np.asarray(speeds, dtype=float)

    X, y, prev = [], [], []
    for i in range(LAGS, len(wrms)):
        window = wrms[i - LAGS:i]
        X.append([window.mean(), window.std(), window.max(), spd[i]])
        y.append(wrms[i])
        prev.append(wrms[i - 1])
    return np.array(X), np.array(y), np.array(prev)


def train_and_predict(wrms_values, speeds):
    """Du doan WRMS segment ke tiep. Chia train/test theo thoi gian (khong
    xao tron — cac segment lien ke tuong quan manh), va so voi baseline
    'persistence' (du doan = segment truoc) de biet model co gia tri hay khong.
    """
    X, y, prev = extract_features(wrms_values, speeds)
    n = len(y)
    n_test = max(MIN_TEST, int(round(n * 0.2)))
    n_train = n - n_test

    if n_train < MIN_TRAIN:
        need = LAGS + MIN_TRAIN + MIN_TEST
        return {
            "r2_score": None,
            "baseline_r2": None,
            "feature_importances": {},
            "n_train": max(0, n_train),
            "n_test": 0,
            "note": f"Can it nhat {need} segment de danh gia model (hien co {len(wrms_values)}).",
        }

    X_train, X_test = X[:n_train], X[n_train:]
    y_train, y_test = y[:n_train], y[n_train:]

    # Tree model khong can scale feature.
    model = RandomForestRegressor(n_estimators=150, random_state=42)
    model.fit(X_train, y_train)
    pred = model.predict(X_test)

    r2 = float(r2_score(y_test, pred))
    baseline = float(r2_score(y_test, prev[n_train:]))

    return {
        "r2_score": r2,
        "baseline_r2": baseline,
        "feature_importances": {
            name: float(imp) for name, imp in zip(FEATURE_NAMES, model.feature_importances_)
        },
        "n_train": n_train,
        "n_test": n_test,
        "note": _verdict(r2, baseline),
    }


def _verdict(r2, baseline):
    if r2 <= 0:
        return "Model khong du doan duoc (R² <= 0, kem hon doan gia tri trung binh)"
    if r2 <= baseline:
        return "Model khong tot hon baseline (du doan = segment truoc)"
    return "Model tot hon baseline"
