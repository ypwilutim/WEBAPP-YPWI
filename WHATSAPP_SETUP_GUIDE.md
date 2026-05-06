# 🚀 WhatsApp Setup Guide - CallMeBot

## 📱 Mengapa CallMeBot?

Karena whacenter.id tidak lagi reliable, sistem sekarang menggunakan **CallMeBot** yang lebih stabil dan gratis.

## ⚙️ Setup CallMeBot (5 menit)

### Langkah 1: Buat Akun
1. Kunjungi: https://www.callmebot.com/
2. Klik **"Sign Up"** dan buat akun gratis

### Langkah 2: Tambahkan WhatsApp
1. Setelah login, klik **"WhatsApp"** di menu
2. Klik **"Add Phone Number"**
3. Masukkan nomor HP Anda (contoh: +6281234567890)
4. **PENTING**: Pastikan nomor HP sudah terdaftar di WhatsApp
5. Klik **"Send"** untuk menerima kode verifikasi

### Langkah 3: Dapatkan API Key
1. Setelah verifikasi, Anda akan mendapat **API Key**
2. API Key terlihat seperti: `123456789` (angka saja)
3. Salin API Key ini

### Langkah 4: Update File .env
Edit file `.env` di root project:

```env
# Ganti dengan credentials CallMeBot yang sebenarnya
WHATSAPP_ENDPOINT=https://api.callmebot.com/whatsapp.php
WHATSAPP_API_KEY=123456789          # API Key dari CallMeBot
WHATSAPP_PHONE=6281234567890         # Nomor HP Anda (tanpa +)
NODE_ENV=production
```

### Langkah 5: Test Pengiriman
1. Restart server: `node server.js`
2. Buka admin dashboard
3. Pergi ke tab **Progress**
4. Klik **"Kirim WA"** pada salah satu guru
5. Anda akan menerima pesan WhatsApp!

## 📨 Format Pesan

Pesan yang dikirim akan terlihat seperti ini:

```
Assalamu'alaikum Ustadz/Ustadzah [Nama],

Semoga Ustadz/Ustadzah dalam keadaan sehat dan bahagia.

Dengan hormat, kami dari Tim YPWI Luwu Timur ingin menyampaikan
untuk melengkapi data profil di sistem absensi online.

Saat ini, progress kelengkapan data Ustadz/Ustadzah adalah 75%.

Data yang perlu dilengkapi:
• Email
• Status Kepegawaian
• TMT

Data yang lengkap akan memudahkan proses absensi dan
administrasi kepegawaian. Kami menghargai kesabaran
dan kerja samanya.

Silakan klik link berikut untuk mengisi:
http://localhost:3000/complete-profile.html?teacher_id=123

Terima kasih atas perhatian dan kerja samanya.

Wassalamu'alaikum wr. wb.

- Tim YPWI Luwu Timur
```

## 🔧 Troubleshooting

### Jika masih tidak berhasil:
1. **Cek API Key**: Pastikan API key benar
2. **Cek Nomor HP**: Pastikan nomor HP sudah terdaftar di CallMeBot
3. **Cek Format**: Nomor HP tanpa kode negara (+62)
4. **Test Manual**: Coba URL langsung di browser:
   ```
   https://api.callmebot.com/whatsapp.php?phone=6281234567890&text=Hello&apikey=YOUR_API_KEY
   ```

### Jika CallMeBot tidak bekerja:
- Pastikan WhatsApp di HP Anda sedang aktif
- Coba logout dan login ulang ke CallMeBot
- Gunakan nomor HP yang berbeda jika perlu

## ✅ Keuntungan CallMeBot

- ✅ **Gratis** untuk penggunaan personal
- ✅ **Reliable** - tidak sering down seperti whacenter
- ✅ **Simple setup** - hanya perlu API key dan nomor HP
- ✅ **Fast delivery** - pesan sampai dalam detik
- ✅ **No device limit** - bisa digunakan di banyak device

---

**Setup selesai dalam 5 menit! 🚀**