# ===============================================================
# 📱 ULTRA SCI ROAD ROUGHNESS APP — ONE CELL VERSION
# ISO-2631 WRMS + DATA FIX + MAP VISUALIZATION
# ===============================================================

import pandas as pd
import numpy as np
from scipy import signal
import folium
from folium.plugins import HeatMap
import matplotlib.pyplot as plt

# ===============================================================
# 1️⃣ LOAD + AUTO FIX SMARTPHONE CSV
# ===============================================================

FILE = r"D:/Phd program/SCI42/data.csv"   # 👈 change path

df = pd.read_csv(FILE, encoding="utf-8-sig")

# ---- clean headers automatically ----
df.columns = (
    df.columns
    .str.strip()
    .str.lower()
    .str.replace(" ", "")
)

# rename GPS columns
df = df.rename(columns={
    "latitude":"lat",
    "longitude":"lon"
})

# check columns
required = ["time","ax","ay","az","lat","lon"]

missing = [c for c in required if c not in df.columns]
if missing:
    raise Exception(f"❌ Missing columns: {missing}")

df = df[required]

print("✅ DATA LOADED")
print(df.head())

# ===============================================================
# 2️⃣ ISO-2631 WEIGHTING FILTER
# ===============================================================

def iso_filter(acc, fs=50):

    fc = 0.5        # human sensitivity
    wn = fc/(fs/2)

    b,a = signal.butter(4, wn, btype='high')
    return signal.filtfilt(b,a,acc)

# ===============================================================
# 3️⃣ COMPUTE RESULTANT ACCELERATION
# ===============================================================

df["a"] = np.sqrt(df.ax**2 + df.ay**2 + df.az**2)

# remove gravity
df["a_dyn"] = df["a"] - 9.81

# ISO weighting
df["a_w"] = iso_filter(df["a_dyn"])

# ===============================================================
# 4️⃣ WRMS CALCULATION
# ===============================================================

WINDOW = 50   # 1 sec @50Hz

wrms = []
for i in range(len(df)):
    s = max(0, i-WINDOW)
    w = df["a_w"].iloc[s:i+1]
    wrms.append(np.sqrt(np.mean(w**2)))

df["WRMS"] = wrms

# ===============================================================
# 5️⃣ ISO-2631 COMFORT CLASSIFICATION
# ===============================================================

def classify(w):

    if w < 0.315:
        return "Comfortable"
    elif w < 0.63:
        return "Some discomfort"
    elif w < 1.0:
        return "Quite uncomfortable"
    elif w < 1.6:
        return "Uncomfortable"
    elif w < 2.5:
        return "Very uncomfortable"
    else:
        return "Extremely uncomfortable"

df["Comfort"] = df["WRMS"].apply(classify)

print("\n✅ WRMS Mean =", round(df["WRMS"].mean(),3),"m/s²")

# ===============================================================
# 6️⃣ PLOT SCI RESULT
# ===============================================================

plt.figure(figsize=(12,4))
plt.plot(df["WRMS"])
plt.title("Weighted RMS Acceleration (ISO-2631)")
plt.xlabel("Sample")
plt.ylabel("WRMS (m/s²)")
plt.grid()
plt.show()

# ===============================================================
# 7️⃣ ROAD ROUGHNESS HEATMAP
# ===============================================================

m = folium.Map(
    location=[df.lat.mean(), df.lon.mean()],
    zoom_start=15
)

heat_data = df[["lat","lon","WRMS"]].values.tolist()

HeatMap(heat_data, radius=8).add_to(m)

m.save("road_roughness_map.html")

print("✅ MAP SAVED → road_roughness_map.html")

# ===============================================================
# 8️⃣ SAVE SCI DATASET
# ===============================================================

df.to_csv("road_roughness_results.csv",index=False)

print("✅ SCI DATA EXPORTED")
thêm 1 code: # ==============================================================
# 🚀 ULTRA SCI LEVEL 2 — SMART ROAD DIGITAL TWIN PLATFORM
# ==============================================================

print("\n🚀 ULTRA SCI LEVEL 2 ACTIVATED\n")

# ==============================================================
# 1️⃣ IMPORTS
# ==============================================================

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import warnings
warnings.filterwarnings("ignore")

from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score,mean_squared_error
from sklearn.ensemble import RandomForestRegressor
from scipy.stats import f_oneway

import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense,Conv1D,MaxPooling1D,GlobalAveragePooling1D

import folium
from folium.plugins import HeatMap

# ==============================================================
# 2️⃣ REAL-TIME ANDROID SENSOR STREAM (SIMULATION)
# ==============================================================

print("📱 Simulating Android Smartphone Stream...")

N=800

df=pd.DataFrame({
"time":np.arange(N),
"lat":16.46+np.cumsum(np.random.randn(N)*1e-5),
"lon":107.59+np.cumsum(np.random.randn(N)*1e-5),
"ax":np.random.normal(0,1,N),
"ay":np.random.normal(0,1,N),
"az":9.81+np.random.normal(0,1,N),
"speed":np.random.uniform(20,60,N)
})

# ==============================================================
# 3️⃣ FEATURE ENGINEERING
# ==============================================================

df["RMS"]=np.sqrt(df.ax**2+df.ay**2+df.az**2)
df["WRMS"]=df["RMS"]*0.8

# physics-based normalization
df["IRI"]=df.WRMS/(df.speed**0.6+1e-6)

print("✅ Features Ready")

# ==============================================================
# 4️⃣ CNN POTHOLE DETECTOR
# ==============================================================

WINDOW=30
X=[]
for i in range(len(df)-WINDOW):
    X.append(df[["ax","ay","az"]].iloc[i:i+WINDOW].values)

X=np.array(X)
y=(df.WRMS.iloc[WINDOW:].values>df.WRMS.mean()).astype(int)

X_train,X_test,y_train,y_test=train_test_split(X,y,test_size=0.2)

cnn=Sequential([
Conv1D(32,3,activation="relu",input_shape=(WINDOW,3)),
MaxPooling1D(2),
Conv1D(64,3,activation="relu"),
GlobalAveragePooling1D(),
Dense(32,activation="relu"),
Dense(1,activation="sigmoid")
])

cnn.compile(optimizer="adam",
loss="binary_crossentropy",
metrics=["accuracy"])

cnn.fit(X_train,y_train,epochs=5,verbose=0)

print("✅ CNN Pothole Detector Ready")

# ==============================================================
# 5️⃣ DEEP LEARNING ROUGHNESS PREDICTOR
# ==============================================================

features=["ax","ay","az","speed","RMS","WRMS"]
target="IRI"

scaler=StandardScaler()
X=scaler.fit_transform(df[features])
y=df[target].values

X_train,X_test,y_train,y_test=train_test_split(X,y,test_size=0.2)
dl=Sequential([
Dense(128,activation="relu"),
Dense(64,activation="relu"),
Dense(1)
])

dl.compile(optimizer="adam",loss="mse")
dl.fit(X_train,y_train,epochs=10,verbose=0)

pred_dl=dl.predict(X_test).flatten()

print("✅ Deep Learning Roughness Model Ready")

# ==============================================================
# 6️⃣ ONLINE LEARNING (DIGITAL TWIN UPDATE)
# ==============================================================

print("🤖 Updating Digital Twin Model...")

dl.fit(X_test,y_test,epochs=2,verbose=0)

# ==============================================================
# 7️⃣ ML BASELINE + ANOVA VALIDATION
# ==============================================================

rf=RandomForestRegressor()
rf.fit(X_train,y_train)
pred_rf=rf.predict(X_test)

anova=f_oneway(pred_dl,pred_rf)

print("ANOVA p-value =",anova.pvalue)

# ==============================================================
# 8️⃣ TAYLOR DIAGRAM VALIDATION
# ==============================================================

std_ref=np.std(y_test)
std_model=np.std(pred_dl)
corr=np.corrcoef(y_test,pred_dl)[0,1]

plt.figure(dpi=1200)
plt.scatter(std_model,corr)
plt.xlabel("Standard Deviation")
plt.ylabel("Correlation")
plt.title("Taylor Diagram")
plt.savefig("Taylor_Diagram.png",dpi=1200)
plt.show()

# ==============================================================
# 9️⃣ DIGITAL TWIN ROAD DETERIORATION MODEL
# ==============================================================

years=np.arange(0,10)
deterioration=df.IRI.mean()*np.exp(0.15*years)

plt.figure(dpi=1200)
plt.plot(years,deterioration)
plt.xlabel("Years")
plt.ylabel("IRI Growth")
plt.title("Digital Twin Road Deterioration Prediction")
plt.savefig("DigitalTwin.png",dpi=1200)
plt.show()

# ==============================================================
# 🔟 SMART CITY ROUGHNESS HEATMAP
# ==============================================================

m=folium.Map(
location=[df.lat.mean(),df.lon.mean()],
zoom_start=15
)

HeatMap(df[["lat","lon","IRI"]].values.tolist(),
radius=7).add_to(m)

m.save("SmartRoad_Map.html")

print("🗺 Smart Road Map Saved")

# ==============================================================
# 1️⃣1️⃣ EXPORT ANDROID MODEL (TensorFlow Lite)
# ==============================================================

converter=tf.lite.TFLiteConverter.from_keras_model(dl)
tflite_model=converter.convert()

open("road_AI_model.tflite","wb").write(tflite_model)

print("📱 Android AI Model Exported")

# ==============================================================
# 1️⃣2️⃣ AUTO SCI MANUSCRIPT GENERATOR
# ==============================================================

r2=r2_score(y_test,pred_dl)
rmse=np.sqrt(mean_squared_error(y_test,pred_dl))

paper=f"""
AI DIGITAL TWIN SMART ROAD MONITORING SYSTEM

Abstract:
An integrated framework combining smartphone sensing,
CNN pothole detection, deep learning roughness prediction,
and digital twin modeling is proposed.

Results:
R2 = {r2:.3f}
RMSE = {rmse:.3f}
ANOVA p-value = {anova.pvalue:.5f}

Impact:
The system enables real-time smart-city pavement monitoring.
"""

open("SCI_Paper.txt","w").write(paper)

print("📄 SCI Manuscript Generated")

# ==============================================================
# FINAL
# ==============================================================

print("\n🏆 ULTRA SCI LEVEL 2 COMPLETED")
nhờ thầy có cai kiến làm cái app để đo lường và viết báo nhé
cái này chạy thử khá ok: # ============================================================
# FULL RESEARCH ROAD ROUGHNESS APP
# SMARTPHONE + ISO2631 + ML + GIS
# ONE CELL SCI VERSION
# ============================================================

import numpy as np
import pandas as pd
from scipy import signal
import matplotlib.pyplot as plt
import folium
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score
from ipywidgets import FileUpload
from IPython.display import display, HTML, clear_output
from io import BytesIO

# ============================================================
# APP HEADER
# ============================================================

display(HTML("<h1>🚧 FULL RESEARCH ROAD ROUGHNESS SYSTEM</h1>"))

uploader = FileUpload(accept=".csv", multiple=False)
display(uploader)

# ============================================================
# ISO 2631 FILTER
# ============================================================

def iso_filter(acc, fs=50):
    fc = 0.5
    w = fc/(fs/2)
    b,a = signal.butter(4,w,'high')
    return signal.filtfilt(b,a,acc)

def WRMS(x):
    return np.sqrt(np.mean(x**2))

# ============================================================
# COMFORT CLASS
# ============================================================

def classify(a):
    if a < 0.315:
        return "Comfortable"
    elif a < 0.63:
        return "Some discomfort"
    elif a < 1.0:
        return "Quite uncomfortable"
    elif a < 1.6:
        return "Uncomfortable"
    elif a < 2.5:
        return "Very uncomfortable"
    else:
        return "Extremely uncomfortable"

# ============================================================
# MAIN APP
# ============================================================

def run(change):

    clear_output(wait=True)
    display(HTML("<h1>🚧 FULL RESEARCH ROAD ROUGHNESS SYSTEM</h1>"))
    display(uploader)

    name=list(uploader.value.keys())[0]
    content=uploader.value[name]["content"]

    df=pd.read_csv(BytesIO(content))

    display(df.head())

    # --------------------------------------------------------
    # ACCELERATION MAGNITUDE
    # --------------------------------------------------------
    df["acc"]=np.sqrt(df.ax**2+df.ay**2+df.az**2)

    fs=50
    weighted=iso_filter(df["acc"],fs)

    # --------------------------------------------------------
    # SEGMENT ANALYSIS
    # --------------------------------------------------------
    window=fs*2

    features=[]
    wrms_list=[]
    labels=[]
    lat=[]
    lon=[]

    for i in range(0,len(weighted)-window,window):

        seg=weighted[i:i+window]

        wrms=WRMS(seg)
        mean=np.mean(seg)
        std=np.std(seg)
        peak=np.max(np.abs(seg))

        features.append([mean,std,peak])
        wrms_list.append(wrms)
        labels.append(classify(wrms))

        lat.append(df.latitude.iloc[i])
lon.append(df.longitude.iloc[i])

    features=np.array(features)

    # --------------------------------------------------------
    # MACHINE LEARNING MODEL
    # --------------------------------------------------------
    scaler=StandardScaler()
    X=scaler.fit_transform(features)
    y=np.array(wrms_list)

    X_train,X_test,y_train,y_test=train_test_split(
        X,y,test_size=0.2,random_state=42)

    model=RandomForestRegressor(n_estimators=150)
    model.fit(X_train,y_train)

    pred=model.predict(X_test)

    r2=r2_score(y_test,pred)

    display(HTML(f"<h3>AI Roughness Prediction R² = {r2:.3f}</h3>"))

    # --------------------------------------------------------
    # RESULT TABLE
    # --------------------------------------------------------
    result=pd.DataFrame({
        "WRMS":wrms_list,
        "Comfort":labels
    })

    display(result.head())

    # --------------------------------------------------------
    # WRMS PLOT
    # --------------------------------------------------------
    plt.figure(figsize=(12,4))
    plt.plot(wrms_list)
    plt.title("WRMS Road Roughness Profile")
    plt.ylabel("WRMS (m/s²)")
    plt.grid()
    plt.show()

    # --------------------------------------------------------
    # FEATURE IMPORTANCE
    # --------------------------------------------------------
    plt.figure()
    plt.bar(["Mean","STD","Peak"],model.feature_importances_)
    plt.title("ML Feature Importance")
    plt.show()

    # --------------------------------------------------------
    # GIS HEAT MAP
    # --------------------------------------------------------
    m=folium.Map(location=[np.mean(lat),np.mean(lon)],zoom_start=15)

    for la,lo,w in zip(lat,lon,wrms_list):

        color="green"
        if w>1: color="orange"
        if w>2: color="red"

        folium.CircleMarker(
            location=[la,lo],
            radius=5,
            color=color,
            fill=True
        ).add_to(m)

    display(m)

    print("✅ FULL RESEARCH ROAD ROUGHNESS ANALYSIS COMPLETED")

uploader.observe(run,names="value")
# ============================================================
# FULL RESEARCH ROAD ROUGHNESS APP
# SMARTPHONE + ISO2631 + ML + GIS
# ONE CELL SCI VERSION
# ============================================================

import numpy as np
import pandas as pd
from scipy import signal
import matplotlib.pyplot as plt
import folium
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score
from ipywidgets import FileUpload
from IPython.display import display, HTML, clear_output
from io import BytesIO

# ============================================================
# APP HEADER
# ============================================================

display(HTML("<h1>🚧 FULL RESEARCH ROAD ROUGHNESS SYSTEM</h1>"))

uploader = FileUpload(accept=".csv", multiple=False)
display(uploader)

# ============================================================
# ISO 2631 FILTER
# ============================================================

def iso_filter(acc, fs=50):
    fc = 0.5
    w = fc/(fs/2)
    b,a = signal.butter(4,w,'high')
    return signal.filtfilt(b,a,acc)

def WRMS(x):
    return np.sqrt(np.mean(x**2))

# ============================================================
# COMFORT CLASS
# ============================================================

def classify(a):
    if a < 0.315:
        return "Comfortable"
    elif a < 0.63:
        return "Some discomfort"
    elif a < 1.0:
        return "Quite uncomfortable"
    elif a < 1.6:
        return "Uncomfortable"
    elif a < 2.5:
        return "Very uncomfortable"
    else:
        return "Extremely uncomfortable"

# ============================================================
# MAIN APP
# ============================================================

def run(change):

    clear_output(wait=True)
    display(HTML("<h1>🚧 FULL RESEARCH ROAD ROUGHNESS SYSTEM</h1>"))
    display(uploader)

    name=list(uploader.value.keys())[0]
    content=uploader.value[name]["content"]

    df=pd.read_csv(BytesIO(content))

    display(df.head())

    # --------------------------------------------------------
    # ACCELERATION MAGNITUDE
    # --------------------------------------------------------
    df["acc"]=np.sqrt(df.ax**2+df.ay**2+df.az**2)

    fs=50
    weighted=iso_filter(df["acc"],fs)

    # --------------------------------------------------------
    # SEGMENT ANALYSIS
    # --------------------------------------------------------
    window=fs*2

    features=[]
    wrms_list=[]
    labels=[]
    lat=[]
    lon=[]

    for i in range(0,len(weighted)-window,window):

        seg=weighted[i:i+window]

        wrms=WRMS(seg)
        mean=np.mean(seg)
        std=np.std(seg)
        peak=np.max(np.abs(seg))

        features.append([mean,std,peak])
        wrms_list.append(wrms)
        labels.append(classify(wrms))

        lat.append(df.latitude.iloc[i])
lon.append(df.longitude.iloc[i])

    features=np.array(features)

    # --------------------------------------------------------
    # MACHINE LEARNING MODEL
    # --------------------------------------------------------
    scaler=StandardScaler()
    X=scaler.fit_transform(features)
    y=np.array(wrms_list)

    X_train,X_test,y_train,y_test=train_test_split(
        X,y,test_size=0.2,random_state=42)

    model=RandomForestRegressor(n_estimators=150)
    model.fit(X_train,y_train)

    pred=model.predict(X_test)

    r2=r2_score(y_test,pred)

    display(HTML(f"<h3>AI Roughness Prediction R² = {r2:.3f}</h3>"))

    # --------------------------------------------------------
    # RESULT TABLE
    # --------------------------------------------------------
    result=pd.DataFrame({
        "WRMS":wrms_list,
        "Comfort":labels
    })

    display(result.head())

    # --------------------------------------------------------
    # WRMS PLOT
    # --------------------------------------------------------
    plt.figure(figsize=(12,4))
    plt.plot(wrms_list)
    plt.title("WRMS Road Roughness Profile")
    plt.ylabel("WRMS (m/s²)")
    plt.grid()
    plt.show()

    # --------------------------------------------------------
    # FEATURE IMPORTANCE
    # --------------------------------------------------------
    plt.figure()
    plt.bar(["Mean","STD","Peak"],model.feature_importances_)
    plt.title("ML Feature Importance")
    plt.show()

    # --------------------------------------------------------
    # GIS HEAT MAP
    # --------------------------------------------------------
    m=folium.Map(location=[np.mean(lat),np.mean(lon)],zoom_start=15)

    for la,lo,w in zip(lat,lon,wrms_list):

        color="green"
        if w>1: color="orange"
        if w>2: color="red"

        folium.CircleMarker(
            location=[la,lo],
            radius=5,
            color=color,
            fill=True
        ).add_to(m)

    display(m)

    print("✅ FULL RESEARCH ROAD ROUGHNESS ANALYSIS COMPLETED")

uploader.observe(run,names="value")
# ============================================================
# SMARTPHONE ROAD ROUGHNESS APP (ONE CELL)
# ISO 2631 WRMS BASED ROAD QUALITY EVALUATION
# ============================================================

import numpy as np
import pandas as pd
from scipy import signal
import matplotlib.pyplot as plt
import folium
from ipywidgets import FileUpload, VBox, HTML
from IPython.display import display, clear_output

# ============================================================
# APP TITLE
# ============================================================

display(HTML("<h2>📱 Smartphone Road Roughness Evaluation App</h2>"))

# ============================================================
# FILE UPLOAD WIDGET
# ============================================================

uploader = FileUpload(accept='.csv', multiple=False)
display(uploader)

# ============================================================
# FUNCTIONS
# ============================================================

def iso_filter(acc, fs=50):
    fc = 0.5
    w = fc/(fs/2)
    b,a = signal.butter(4,w,'high')
    return signal.filtfilt(b,a,acc)

def WRMS(x):
    return np.sqrt(np.mean(x**2))

def classify(a):
    if a < 0.315:
        return "Comfortable"
    elif a < 0.63:
        return "Some discomfort"
    elif a < 1.0:
        return "Quite uncomfortable"
    elif a < 1.6:
        return "Uncomfortable"
    elif a < 2.5:
        return "Very uncomfortable"
    else:
        return "Extremely uncomfortable"

# ============================================================
# PROCESS AFTER UPLOAD
# ============================================================

def run_app(change):

    clear_output(wait=True)
    display(HTML("<h2>📱 Smartphone Road Roughness Evaluation App</h2>"))
    display(uploader)

    file_name = list(uploader.value.keys())[0]
    content = uploader.value[file_name]['content']

    from io import BytesIO
    df = pd.read_csv(BytesIO(content))

    display(HTML("<b>Preview Data</b>"))
    display(df.head())

    # ---------------------------------
    # Acceleration magnitude
    # ---------------------------------
    df["acc"] = np.sqrt(
        df["ax"]**2 +
        df["ay"]**2 +
        df["az"]**2
    )

    fs = 50
    weighted = iso_filter(df["acc"], fs)

    window = fs*2

    wrms_list=[]
    label_list=[]
    lat=[]
    lon=[]

    for i in range(0,len(weighted)-window,window):

        seg = weighted[i:i+window]

        wrms = WRMS(seg)
        label = classify(wrms)

        wrms_list.append(wrms)
        label_list.append(label)

        lat.append(df.latitude.iloc[i])
        lon.append(df.longitude.iloc[i])

    result = pd.DataFrame({
        "WRMS (m/s²)":wrms_list,
        "Comfort":label_list
    })

    display(HTML("<h3>Road Roughness Result</h3>"))
    display(result)

    # ---------------------------------
    # Plot
    # ---------------------------------
    plt.figure(figsize=(10,4))
    plt.plot(wrms_list)
plt.title("Road Roughness WRMS")
    plt.ylabel("WRMS (m/s²)")
    plt.xlabel("Segment")
    plt.grid()
    plt.show()

    # ---------------------------------
    # MAP VISUALIZATION
    # ---------------------------------
    m = folium.Map(
        location=[np.mean(lat),np.mean(lon)],
        zoom_start=15
    )

    for la,lo,w in zip(lat,lon,wrms_list):

        color="green"
        if w>1:
            color="orange"
        if w>2:
            color="red"

        folium.CircleMarker(
            location=[la,lo],
            radius=5,
            color=color,
            fill=True
        ).add_to(m)

    display(m)

    print("✅ Road Roughness Evaluation Completed")

uploader.observe(run_app, names='value')