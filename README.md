# Monster World – Phase 1 Prototype

Bản prototype HTML5 cho Monster World, ưu tiên màn hình dọc và chạy offline.

## Chạy thử

- Mở `index.html` trực tiếp bằng trình duyệt hiện đại.
- Nếu trình duyệt hạn chế mở file trực tiếp, chạy máy chủ tĩnh trong thư mục này, ví dụ `python -m http.server 8000`, rồi truy cập `http://localhost:8000`.
- Trên điện thoại, tải thư mục lên GitHub Pages hoặc một static host HTTPS.

## Điều khiển

- Điện thoại: cần điều khiển ảo ở góc trái; nút A để tương tác.
- Máy tính: WASD hoặc phím mũi tên; phím tương tác chưa gán mặc định, có thể bấm nút A trên giao diện.

## Đã có trong Phase 1

- Canvas top-down với bản đồ Greenfield thử nghiệm.
- Nhân vật di chuyển, camera bám theo.
- Cây, hồ, đường, nhà, phòng nghiên cứu, NPC và bảng chỉ dẫn.
- HUD dọc, joystick cảm ứng, các tab giao diện khung.
- Tự lưu vị trí bằng LocalStorage mỗi 10 giây và khi rời trang.
- Canvas tự điều chỉnh theo kích thước màn hình và device pixel ratio.

## Chưa có (dành cho các phase sau)

Chọn starter, sinh vật hoang dã, chiến đấu, thu phục, nhiệm vụ thực tế, tiến hóa, hệ thống âm thanh và lưu nhiều slot.

## Cấu trúc

- `index.html`: điểm vào.
- `src/style.css`: giao diện responsive.
- `src/game.js`: vòng lặp game, bản đồ, điều khiển, camera và lưu cục bộ.
- `docs/GDD.md`: tài liệu thiết kế.
