import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score


def extract_features(wrms_values, speeds):
    """Trich xuat features tu du lieu segment (tu readme.md)"""
    wrms = np.array(wrms_values)
    spd = np.array(speeds)

    features = []
    for i in range(len(wrms)):
        # Dung sliding window de tinh features
        start = max(0, i - 2)
        window = wrms[start:i + 1]

        mean_val = np.mean(window)
        std_val = np.std(window) if len(window) > 1 else 0
        peak_val = np.max(np.abs(window))

        features.append([mean_val, std_val, peak_val])

    return np.array(features)


def train_and_predict(wrms_values, speeds):
    """Train RandomForest va tra ve ket qua (tu readme.md)"""
    if len(wrms_values) < 5:
        return {
            "r2_score": 0,
            "feature_importances": {"mean": 0.33, "std": 0.33, "peak": 0.33},
        }

    features = extract_features(wrms_values, speeds)
    y = np.array(wrms_values)

    scaler = StandardScaler()
    X = scaler.fit_transform(features)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    if len(X_train) < 2 or len(X_test) < 1:
        return {
            "r2_score": 0,
            "feature_importances": {"mean": 0.33, "std": 0.33, "peak": 0.33},
        }

    model = RandomForestRegressor(n_estimators=150, random_state=42)
    model.fit(X_train, y_train)

    pred = model.predict(X_test)
    r2 = r2_score(y_test, pred)

    importances = model.feature_importances_
    feature_names = ["mean", "std", "peak"]

    return {
        "r2_score": float(r2),
        "feature_importances": {
            name: float(imp) for name, imp in zip(feature_names, importances)
        },
    }
