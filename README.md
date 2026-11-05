# CyberShield v4.2-ENT

**Firewall Engine & Network Threat Prevention**

Aplikasi web simulasi firewall dan pencegahan ancaman jaringan dengan dashboard monitoring real-time.

![Dashboard](docs/images/dashboard.jpg)

## ✨ Fitur Utama

- 📊 **Dashboard Real-time** — Monitoring statistik, grafik traffic, dan peringatan keamanan
- 🛡️ **Manajemen Aturan Firewall** — CRUD aturan ALLOW/BLOCK dengan wildcard IP & port
- 🎯 **Simulasi Serangan** — Traffic Normal, Port Scan, Brute Force SSH, SYN Flood
- 📝 **Log Keamanan** — Pencatatan lengkap semua aktivitas dengan filter
- 🚫 **Blacklist IP** — Blokir permanen IP berbahaya

## 🚀 Instalasi Cepat

1. Salin folder ke `www/` Laragon atau `htdocs/` XAMPP
2. Import database:
   ```bash
   mysql -u root < database.sql
   ```
3. Sesuaikan `config.php` jika perlu
4. Buka `http://localhost/Cybershield/`

## 📖 Dokumentasi Lengkap

Lihat [docs/DOKUMENTASI.md](docs/DOKUMENTASI.md) untuk dokumentasi lengkap termasuk:
- Arsitektur sistem
- API Reference
- Skema database
- Mekanisme evaluasi paket
- Screenshot semua fitur

## 🛠️ Tech Stack

| Layer    | Teknologi                         |
| -------- | --------------------------------- |
| Frontend | HTML5, CSS3, Vanilla JavaScript   |
| Backend  | PHP 8.x, PDO                     |
| Database | MySQL 8.x / MariaDB              |
| Server   | Apache (Laragon / XAMPP)          |

## 📄 Lisensi

Proyek UTS Keamanan Jaringan.
