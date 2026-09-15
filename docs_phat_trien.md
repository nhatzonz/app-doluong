# Báo cáo phát triển: App Đo Lường Mặt Đường

*Cập nhật: 15/09/2026*

## 1. Tóm tắt

App dùng cảm biến rung và GPS của điện thoại để đánh giá mặt đường êm hay xóc. Kết quả được xếp theo 6 mức của tiêu chuẩn quốc tế **ISO 2631‑1**, từ "Êm" đến "Cực kỳ khó chịu".

Khi rà soát, chúng tôi phát hiện **con số app đưa ra chưa đúng**:
- Máy chủ thường báo **thấp hơn thực tế khoảng một nửa**.
- Khi mất kết nối, app tự tính trên điện thoại và có thể báo **đường xóc nhẹ dù xe đang đứng yên**.

Đợt này đã sửa toàn bộ phần tính toán. Các con số giờ bám sát tiêu chuẩn ISO và đã được kiểm chứng bằng dữ liệu mô phỏng. Ngoài ra app đã được **nâng cấp lên Expo SDK 57** để mở được trên iPhone.

> **Lưu ý:** số liệu đo trước đợt sửa này **không so sánh được** với số liệu mới.

---

## 2. Các vấn đề đã sửa

### 2.1. Số rung bị báo thấp khoảng 45% (nghiêm trọng nhất)
- **Trước:** trước khi tính, công thức lật mọi giá trị âm thành dương. Bước lọc phía sau lại hiểu nhầm và cắt mất gần một nửa độ rung.
- **Hậu quả:** đường xóc có thể bị xếp thành "êm". Ví dụ đoạn thực tế ở mức "Khó chịu vừa" (0.70) chỉ được báo 0.38 ("Hơi khó chịu").
- **Sau:** giữ nguyên dấu của tín hiệu. Kiểm tra lại cho đúng giá trị lý thuyết ở mọi tần số.

### 2.2. Chưa áp dụng đúng tiêu chuẩn ISO 2631‑1
- **Trước:** chỉ lọc sơ bộ. Chưa tính đến việc cơ thể người nhạy với rung ở tần số 4–12Hz hơn các tần số khác.
- **Sau:** áp dụng đúng bộ trọng số của tiêu chuẩn: **Wk** cho rung lên xuống, **Wd** cho rung ngang. Kết quả khớp bảng số liệu trong tiêu chuẩn với sai số ≤ 0.1%.

### 2.3. Tính offline trên điện thoại cho kết quả khác máy chủ
- **Trước:** khi mất kết nối, điện thoại tính theo cách đơn giản hơn. Cảm biến điện thoại hay lệch nhẹ (khoảng 1–2%), nên xe đứng yên vẫn bị báo có rung.
- **Sau:** điện thoại và máy chủ dùng **cùng một công thức**, kết quả trùng nhau hoàn toàn. Mỗi đoạn đo ghi rõ được tính ở máy chủ hay trên điện thoại.

### 2.4. Có thể mất dữ liệu cảm biến
- **Trước:** dữ liệu cảm biến đi qua lớp giao diện trước khi được lưu, nên có thể bị gộp hoặc bỏ sót khi app bận vẽ màn hình.
- **Sau:** dữ liệu được ghi thẳng ngay khi cảm biến gửi lên, kèm thời điểm đo chính xác của cảm biến.

### 2.5. Kết quả phụ thuộc cách đặt điện thoại
- **Sau:** app tự nhận biết phương thẳng đứng, nên đặt điện thoại nằm, nghiêng hay dựng đứng đều cho cùng kết quả (đã kiểm tra với các góc 0°, 35°, 90°).

### 2.6. Dữ liệu vị trí và tốc độ
- **Trước:** đoạn đo chưa bắt được GPS bị ghi tọa độ `0,0`, là một điểm ngoài biển châu Phi. Tốc độ không được lưu theo từng đoạn.
- **Sau:** không có GPS thì để trống. Mỗi đoạn lưu **tốc độ trung bình**, vì cùng một mặt đường, chạy nhanh sẽ rung mạnh hơn nhiều.
- File CSV xuất ra có thêm các cột: thời gian, tốc độ (km/h), rung dọc, rung ngang, nguồn tính.

### 2.7. Điểm tổng của cả chuyến đi
- **Trước:** lấy trung bình cộng các đoạn, không đúng về mặt vật lý.
- **Sau:** tính theo năng lượng rung đúng như tiêu chuẩn. Chuyến đo dưới 60 giây được ghi chú "chỉ tham khảo".

### 2.8. Phân tích ML (máy học) cho kết quả ảo
- **Trước:** mô hình được "nhìn thấy đáp án" khi học, nên độ chính xác báo ra cao nhưng không có ý nghĩa.
- **Sau:** mô hình chỉ dùng các đoạn **trước đó** và tốc độ để dự đoán đoạn kế tiếp. Kết quả được so với cách đoán đơn giản nhất: lấy luôn giá trị của đoạn trước. App **nói rõ khi mô hình không tốt hơn cách đó**. Cần ít nhất 23 đoạn đo (khoảng 46 giây).

### 2.9. Lỗi hiển thị
- Gia tốc các trục ghi đơn vị m/s² nhưng thực chất hiển thị đơn vị g, tức nhỏ hơn 9.8 lần. Đã sửa.
- Khi chưa đo, ô "DYNAMIC" hiện 9.81. Giờ hiện `--`.
- Máy chủ bị lỗi khi đoạn đo cuối có đúng 15 mẫu. Đã sửa.

### 2.10. Nâng cấp nền tảng
- Nâng **Expo SDK 54 lên 57** (React Native 0.86) để chạy được với app Expo Go mới nhất trên App Store, tức mở được trên iPhone thật.

---

## 3. Đã kiểm chứng như thế nào

| Bài kiểm tra | Kết quả |
|---|---|
| Bộ trọng số so với bảng của ISO 2631‑1 | Sai số ≤ 0.1% |
| Rung giả lập 1–16Hz, so với giá trị lý thuyết | Khớp hoàn toàn |
| Điện thoại đặt ở 3 góc khác nhau | Cùng kết quả |
| Cảm biến lệch 2%, xe đứng yên | Báo 0 (trước đây báo 0.196) |
| Máy chủ và điện thoại tính cùng một dữ liệu | Trùng nhau hoàn toàn |
| API máy chủ, build app iOS | Chạy bình thường |

Tài liệu tham khảo: tiêu chuẩn ISO 2631‑1:1997, tài liệu chính thức của Expo, React và SciPy, cùng nghiên cứu SmartRoadSense (tạp chí *Sensors*) về ảnh hưởng của tốc độ tới đo độ nhám mặt đường.

---

## 4. Hạn chế còn lại

1. **App đo rung của điện thoại, không phải của người ngồi.** Muốn so sánh các lần đo, cần gắn điện thoại **cố định ở cùng một vị trí** và **chạy cùng tốc độ**.
2. **Điện thoại lấy mẫu 50 lần/giây** nên chỉ đo được rung đến 25Hz, trong khi tiêu chuẩn xét đến 80Hz. Phần lớn rung của ô tô nằm dưới 20Hz nên ảnh hưởng nhỏ.
3. **Mỗi đoạn đo dài 2 giây** để tô màu chi tiết trên bản đồ. Theo tiêu chuẩn, đánh giá chính thức nên dựa trên thời gian đo dài (từ vài phút).
4. **Chưa thử thực địa** sau khi sửa. Mọi kiểm tra ở trên dùng dữ liệu mô phỏng.

---

## 5. Bước tiếp theo đề xuất

1. **Đo thực địa:** chạy thử trên vài tuyến có đoạn đường tốt và xấu, cùng xe, cùng tốc độ và cùng cách gắn điện thoại.
2. **Quy trình đo chuẩn:** thống nhất loại giá đỡ, vị trí gắn và tốc độ đo (ví dụ 30 hoặc 50 km/h).
3. **(Tùy chọn) Hiệu chuẩn:** so kết quả với một thiết bị đo rung chuyên dụng trên cùng tuyến đường.
