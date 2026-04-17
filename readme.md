# App Do Luong Mat Duong

App do do gho mat duong bang smartphone, su dung cam bien gia toc (accelerometer) va GPS.
Tinh WRMS theo tieu chuan ISO-2631, phan loai comfort, hien thi ban do va bieu do realtime.

## Kien truc

```
App Expo (Dien thoai)              Backend Python (Laptop)
├── Thu sensor realtime             ├── Nhan data tu app
├── Hien thi ban do + bieu do       ├── Loc Butterworth ISO-2631
├── Giao dien ket qua               ├── Tinh WRMS
└── Xuat CSV                        ├── ML RandomForest
                                    └── Tra ket qua ve app
```

## Yeu cau

- Node.js >= 18
- Python >= 3.10
- Expo Go tren dien thoai (iOS / Android)
- Dien thoai va laptop cung 1 mang WiFi

## Cai dat

### 1. Clone project

```bash
git clone https://github.com/nhatzonz/app-doluong.git
cd app-doluong
```

### 2. Cai dat Frontend (Expo)

```bash
npm install
```

### 3. Cai dat Backend (Python)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Mac/Linux
# hoac: venv\Scripts\activate   # Windows
pip install -r requirements.txt
cd ..
```

### 4. Cau hinh IP

Tim IP laptop:

```bash
# Mac
ifconfig # Ip chính là chuỗi định dạng 192.168.x.x tại en1 của wifi

# Windows
ipconfig
```

Mo file `src/utils/constants.js`, sua IP:

```javascript
export const API_BASE_URL = 'http://<IP-LAPTOP>:8000';
```

## Chay ung dung

### Terminal 1 — Backend

```bash
cd backend
source venv/bin/activate
cd ..
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Backend chay tai: http://localhost:8000

Kiem tra: http://localhost:8000/health

### Terminal 2 — Frontend

```bash
npx expo start
```

Quet QR bang Expo Go tren dien thoai.

## Su dung

1. Mo app, vao tab **Do Luong**
2. Bam **START**
3. Dat dien thoai tren xe, chay xe
4. Bam **STOP** khi hoan thanh
5. Xem ket qua:
   - **Ban Do**: tuyen duong voi marker mau (xanh/cam/do)
   - **Bieu Do**: toc do, do cao, gia toc, WRMS realtime
   - **Ket Qua**: bang segment, xuat CSV, phan tich ML

## Cau truc thu muc

```
app-doluong/
├── App.js                        # Root: 4 tab navigation
├── app.json                      # Expo config
├── src/
│   ├── screens/
│   │   ├── HomeScreen.js         # Start/Stop do, hien thi sensor
│   │   ├── MapScreen.js          # Ban do + marker mau
│   │   ├── ChartScreen.js        # 4 bieu do realtime
│   │   └── ResultScreen.js       # Ket qua + xuat CSV + ML
│   ├── components/               # SensorDataCard, ComfortBadge
│   ├── hooks/                    # useAccelerometer, useLocation, useMeasurement
│   ├── services/                 # api, csvExport, wrmsCalculator
│   ├── utils/                    # constants, comfortClassifier, colors
│   └── context/                  # MeasurementContext
│
└── backend/
    ├── main.py                   # FastAPI + CORS
    ├── requirements.txt
    ├── routers/analysis.py       # /analyze, /analyze-full
    └── services/                 # iso_filter, wrms_calculator, comfort_classifier, ml_model
```

## API Endpoints

| Method | Endpoint | Mo ta |
|--------|----------|-------|
| GET | /health | Kiem tra server |
| POST | /analyze | Phan tich 1 segment (realtime) |
| POST | /analyze-full | Phan tich toan bo chuyen di (ML) |

## Tieu chuan ISO-2631

| WRMS (m/s2) | Phan loai |
|-------------|-----------|
| < 0.315 | Comfortable |
| 0.315 - 0.63 | Some discomfort |
| 0.63 - 1.0 | Quite uncomfortable |
| 1.0 - 1.6 | Uncomfortable |
| 1.6 - 2.5 | Very uncomfortable |
| > 2.5 | Extremely uncomfortable |
