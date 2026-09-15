# Plan mở rộng UI/UX: App Đo Lường Mặt Đường

*Phiên bản 2 · 15/09/2026 · Trạng thái: đã triển khai giai đoạn 0–4 (chưa thử thực địa trên điện thoại thật)*

> **Khác với plan khi triển khai:**
> - Thêm deep link (`doluong://trip/<id>`, `exp://…/--/history`) để mở thẳng từng màn.
> - Màn Thống kê vẽ đường xu hướng **riêng từng loại xe**. Gộp chung ô tô và xe máy tạo ra xu hướng giả (nghịch lý Simpson).
> - Gán nhãn điểm 📍 làm trong màn Chi tiết chuyến, không bật hộp hỏi ngay sau khi STOP, để không làm phiền lúc đang lái.
> - `useLocation` có thêm trường `accuracy` (chỉ để hiển thị).

## 0. Yêu cầu đã chốt

| Hạng mục | Quyết định |
|---|---|
| Người dùng chính | **Nhóm nghiên cứu**: ưu tiên hiển thị đầy đủ số liệu, xuất dữ liệu thô |
| Ngôn ngữ giao diện | **2 chế độ: Tiếng Việt / English**, đổi được trong Cài đặt |
| Lưu trữ | **Chỉ trên máy, giữ 5 chuyến gần nhất**. Có chuyến mới thì tự xóa chuyến cũ nhất |
| Loại phương tiện | **2 chế độ: Ô tô / Xe máy** |
| Báo cáo PDF | **Tiếng Việt, ngắn gọn** (1–2 trang) |

**Nguyên tắc "không ảnh hưởng logic cũ":**
1. Không sửa công thức tính (`wrmsCalculator.js`, backend) và luồng đo (`useMeasurement.js`, `useAccelerometer.js`, `useLocation.js`, reducer).
2. Tính năng mới chỉ **đọc** dữ liệu từ `MeasurementContext`, code nằm trong `src/features/`, dùng context riêng.
3. Chỉ dùng thư viện chạy được trong **Expo Go SDK 57**.

---

## 1. Bản đồ màn hình

```
Tab bar
├── Đo / Measure        (cũ) ─► [+] Chuẩn bị đo (modal)
├── Bản đồ / Map        (cũ)
├── Biểu đồ / Charts    (cũ)
├── Kết quả / Results   (cũ) ─► [+] Xem chi tiết chuyến
└── Lịch sử / History   (MỚI, tối đa 5 chuyến)
     ├── Chi tiết chuyến ─► Chi tiết đoạn · Báo cáo / Xuất
     ├── So sánh 2 chuyến
     └── Thống kê (gộp 5 chuyến)

Header: ⓘ Hướng dẫn ISO 2631 · ⚙︎ Cài đặt
```

---

## 2. Tính năng theo giai đoạn

Công sức: **S** ≈ 0.5–1 ngày · **M** ≈ 2–3 ngày · **L** ≈ 4–6 ngày.

### Giai đoạn 0: Nền móng

| # | Việc | Công sức |
|---|---|---|
| 0.1 | ⚠️ **Sửa lỗi thời gian của đoạn đo:** thêm `wallTime: Date.now()` (xem mục 5) | S |
| 0.2 | **Song ngữ (i18n):** file `vi.json` / `en.json`, hook `useT()`, ngôn ngữ lưu trong máy; mặc định theo ngôn ngữ của điện thoại. Việt hóa hoặc Anh hóa luôn **nhãn 6 mức ISO** ở lớp hiển thị (backend giữ nguyên chuỗi tiếng Anh làm mã) | M |
| 0.3 | Native Stack bao ngoài Tab Navigator | S |
| 0.4 | **TripStore:** tự lưu chuyến khi bấm STOP, mỗi chuyến một file JSON. **Giới hạn 5 chuyến**, lưu thêm thì xóa chuyến cũ nhất | M |
| 0.5 | Lớp tính toán hiển thị: quãng đường (haversine), % quãng đường theo mức, gộp đoạn cùng màu | M |

**Nhãn 6 mức ISO (song ngữ):**

| Mã (backend) | Tiếng Việt | English |
|---|---|---|
| Comfortable | Êm | Not uncomfortable |
| Some discomfort | Hơi khó chịu | A little uncomfortable |
| Quite uncomfortable | Khá khó chịu | Fairly uncomfortable |
| Uncomfortable | Khó chịu | Uncomfortable |
| Very uncomfortable | Rất khó chịu | Very uncomfortable |
| Extremely uncomfortable | Cực kỳ khó chịu | Extremely uncomfortable |

*(Cột English dùng đúng thuật ngữ trong ISO 2631‑1, thuận tiện khi viết bài báo.)*

**Quy tắc giữ 5 chuyến:**
- Khi đã có 5 chuyến và bấm START: modal Chuẩn bị đo hiện dòng *"Chuyến 'QL1A 12/09' sẽ bị xóa khi lưu chuyến mới"*, kèm nút **Xuất CSV trước**.
- Chỉ xóa **sau khi** chuyến mới đã ghi file thành công, tránh mất cả hai.
- Chuyến quá ngắn (dưới 3 đoạn) **không lưu**, để không đẩy chuyến tốt ra ngoài.

**Cấu trúc một chuyến:**
```json
{
  "id": "trip_20260915_210300",
  "name": "QL1A – Huế → Phú Bài",
  "startedAt": 1789999999000, "endedAt": 1790000600000,
  "setup": { "vehicle": "car", "mount": "windshield", "targetSpeedKmh": 40 },
  "summary": { "wrmsTotal": 0.54, "distanceM": 8200, "durationS": 600, "comfortShare": {} },
  "segments": [], "track": [], "marks": []
}
```

### Giai đoạn 1: Lưu và xem lại

| Màn | Nội dung chính | Công sức |
|---|---|---|
| **Lịch sử** | Tối đa 5 thẻ: tên, ngày, **icon 🚗 / 🏍️**, km, thời lượng, WRMS tổng, thanh tỉ lệ mức độ. Đổi tên, xóa, chọn 2 chuyến để so sánh. Dòng "3/5 chuyến" | M |
| **Chi tiết chuyến** | Bản đồ tô màu theo đoạn · biểu đồ **WRMS theo km** vẽ chồng **tốc độ** và các ngưỡng ISO · % quãng đường theo mức · top 5 đoạn xấu · thông tin setup | L |
| **Chi tiết đoạn** | WRMS, **`aw_z` / `aw_xy`**, tốc độ, tọa độ, **tần số lấy mẫu thực tế**, thời lượng, nguồn tính (máy chủ/offline) | S |
| Màn Kết quả (cũ) | Thêm nút "Xem chi tiết chuyến" | S |

Vì người dùng là nhóm nghiên cứu, mọi màn hiện **số chính xác đến 3 chữ số thập phân kèm đơn vị**, không làm tròn cho đẹp.

### Giai đoạn 2: Chất lượng dữ liệu đo

**2.1. Modal Chuẩn bị đo** (M)
1. **Phương tiện:** 🚗 Ô tô / 🏍️ Xe máy. Lựa chọn này quyết định các bước sau:

   | | Ô tô | Xe máy |
   |---|---|---|
   | Cách gắn máy | Giá kính lái · Kẹp cửa gió · Mặt ghế | Giá ghi đông · Trên yên · Cốp/hộc |
   | Tốc độ mục tiêu nhanh | 30 · 40 · 50 · 60 km/h | 20 · 30 · 40 km/h |

2. **Kiểm tra nhanh 3 giây:** tần số lấy mẫu (✓ nếu từ 45Hz), độ chính xác GPS (✓ nếu dưới 15 m), máy chủ online/offline.
3. Bấm Bắt đầu thì gọi `startMeasurement()` cũ. Phần setup chỉ lưu vào TripStore.

**2.2. Chip trạng thái khi đo** (M): `[● 49 Hz] [GPS ±6 m] [☁ Online] [🏍️ 32/30 km/h]`. Chip tốc độ chuyển cam khi lệch mục tiêu quá ±20%.

**2.3. Hướng dẫn ISO 2631** (S, song ngữ): WRMS là gì, bảng 6 mức, cách gắn máy cho từng loại xe.
- Ghi chú riêng cho **xe máy**: rung thường cao hơn ô tô nhiều, nên **không so sánh trực tiếp** kết quả giữa hai loại xe.

### Giai đoạn 3: Phân tích (trọng tâm nghiên cứu)

| Màn | Nội dung | Công sức |
|---|---|---|
| **Thống kê** (gộp 5 chuyến) | **Biểu đồ phân tán WRMS theo tốc độ**, tô màu theo loại xe · histogram WRMS kèm ngưỡng ISO · tỉ lệ `aw_z`/`aw_xy` · lọc 🚗 / 🏍️ | L |
| **So sánh 2 chuyến** | Hai cột số liệu song song, vẽ chồng WRMS theo km. **Cảnh báo** khi khác loại xe, khác cách gắn máy hoặc tốc độ mục tiêu lệch quá 10 km/h | M |

*Bỏ "Bản đồ tổng hợp nhiều chuyến" của phiên bản 1, vì chỉ 5 chuyến thì không đủ dữ liệu. Làm lại khi có đồng bộ lên máy chủ.*

### Giai đoạn 4: Ghi nhận và xuất dữ liệu

| Việc | Nội dung | Công sức |
|---|---|---|
| **Đánh dấu 📍 khi đo** | Bấm để lưu vị trí và thời điểm; sau khi STOP gán nhãn: ổ gà / gờ giảm tốc / nứt / khe co giãn / khác. Làm dữ liệu thực tế để kiểm chứng WRMS | M |
| **Xuất dữ liệu** | **CSV** (dùng lại `exportCSV` cũ, thêm cột loại xe và cách gắn máy) · **GeoJSON** (mở bằng QGIS) · **JSON thô** của cả chuyến | S |
| **Báo cáo PDF** | Tiếng Việt, ngắn gọn (mẫu ở mục 3) | M |
| **Cài đặt** | Ngôn ngữ VI/EN · địa chỉ máy chủ và nút kiểm tra kết nối · loại xe mặc định · xem và xóa chuyến đã lưu | S |

---

## 3. Mẫu báo cáo PDF (tiếng Việt, 1–2 trang)

```
BÁO CÁO ĐO ĐỘ ÊM MẶT ĐƯỜNG
Tuyến: QL1A – Huế → Phú Bài        Ngày: 15/09/2026 21:03
Phương tiện: Ô tô · Gắn: Giá kính lái · Tốc độ mục tiêu: 40 km/h

KẾT QUẢ
WRMS tổng: 0.54 m/s² (Hơi khó chịu)
Quãng đường: 8.2 km · Thời lượng: 10 phút · Tốc độ TB: 41 km/h

Phân bố quãng đường:  Êm 42% · Hơi khó chịu 31% · Khá khó chịu 18% · Khó chịu 9%
[Ảnh bản đồ tô màu]   [Biểu đồ WRMS theo km]

5 ĐOẠN XẤU NHẤT
#  Km    WRMS   Mức           Tốc độ   Đánh dấu
1  3.4   1.82   Rất khó chịu  44 km/h  Ổ gà
...

GHI CHÚ
Tính theo ISO 2631-1 (trọng số Wk/Wd). Đo trên điện thoại, chỉ so sánh
giữa các lần đo cùng loại xe, cùng cách gắn máy và cùng tốc độ.
```

---

## 4. Code cũ phải chạm vào

| File | Thay đổi | Ảnh hưởng logic |
|---|---|---|
| `App.js` | Bọc Stack, thêm tab Lịch sử, gắn các Provider (i18n, TripStore) | Không |
| `HomeScreen.js`, `MapScreen.js`, `ChartScreen.js`, `ResultScreen.js` | **Thay chuỗi cố định bằng `t('...')`** để song ngữ; màn Đo thêm modal, chip, nút 📍; màn Kết quả thêm nút | Không (chỉ đổi chữ hiển thị) |
| `WRMSGauge.js`, `ComfortBadge.js` | Hiển thị nhãn mức theo ngôn ngữ | Không |
| `useMeasurement.js` | Chỉ sửa lỗi ở mục 5 | Sửa lỗi |
| `api.js` | Đọc địa chỉ máy chủ từ Cài đặt (có giá trị mặc định) | Rất nhỏ |

---

## 5. ⚠️ Lỗi cần sửa đầu tiên

Trường `timestamp` của mỗi đoạn đo (`useMeasurement.js:38`) đang lấy từ đồng hồ cảm biến. Đồng hồ này nhiều khả năng tính **từ lúc bật máy**, không phải giờ thực. Hệ quả: cột thời gian trong CSV ra năm 1970, và không ghép được đoạn đo với điểm GPS để tô màu bản đồ.

**Cách sửa:** thêm `wallTime: Date.now()` cho hiển thị, CSV và ghép GPS; giữ timestamp cảm biến cho việc tính toán.

---

## 6. Thư viện thêm

| Thư viện | Dùng cho |
|---|---|
| `@react-navigation/native-stack` | Màn chi tiết |
| `expo-localization` | Lấy ngôn ngữ mặc định của máy |
| `expo-print` | Báo cáo PDF |

*(Không cần thư viện i18n riêng: 2 ngôn ngữ thì dùng từ điển JSON và hook tự viết là đủ.)*

---

## 7. Lộ trình

| Giai đoạn | Nội dung | Ước lượng |
|---|---|---|
| 0 | Sửa lỗi thời gian, song ngữ, TripStore (5 chuyến), điều hướng | 5–6 ngày |
| 1 | Lịch sử, Chi tiết chuyến, Chi tiết đoạn | 6–8 ngày |
| 2 | Chuẩn bị đo (ô tô/xe máy), chip trạng thái, hướng dẫn | 4–5 ngày |
| 3 | Thống kê, So sánh | 5–7 ngày |
| 4 | Đánh dấu, xuất dữ liệu, báo cáo PDF, cài đặt | 5–6 ngày |

Tổng khoảng **5–6 tuần** cho một người. Nên làm theo đúng thứ tự vì giai đoạn 0 là nền cho tất cả các giai đoạn sau.
