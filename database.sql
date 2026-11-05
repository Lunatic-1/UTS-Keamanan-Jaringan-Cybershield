CREATE DATABASE IF NOT EXISTS cybershield CHARACTER SET utf8mb4;
USE cybershield;

CREATE TABLE IF NOT EXISTS firewall_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  ip_address VARCHAR(45) NOT NULL DEFAULT '*',
  port VARCHAR(5) NOT NULL DEFAULT '*',
  aksi ENUM('ALLOW','BLOCK') NOT NULL,
  aktif TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  waktu DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_sumber VARCHAR(45) NOT NULL,
  port_tujuan INT NOT NULL,
  jenis_aktivitas VARCHAR(60) NOT NULL,
  tindakan ENUM('DIIZINKAN','DIBLOKIR') NOT NULL,
  keterangan VARCHAR(150)
);

CREATE TABLE IF NOT EXISTS blacklist_ips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL UNIQUE,
  alasan VARCHAR(150),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO firewall_rules (nama, ip_address, port, aksi) VALUES
('Izinkan HTTP', '*', '80', 'ALLOW'),
('Izinkan HTTPS', '*', '443', 'ALLOW'),
('Izinkan DNS', '*', '53', 'ALLOW'),
('Izinkan SSH LAN', '192.168.1.*', '22', 'ALLOW'),
('Blokir Telnet', '*', '23', 'BLOCK');

INSERT INTO blacklist_ips (ip_address, alasan) VALUES
('185.220.101.4', 'Sumber brute force berulang'),
('103.28.12.9', 'Terdeteksi port scan');

INSERT INTO security_logs (waktu, ip_sumber, port_tujuan, jenis_aktivitas, tindakan, keterangan) VALUES
(NOW() - INTERVAL 50 MINUTE, '192.168.1.10', 443, 'Akses Normal', 'DIIZINKAN', 'Aturan: Izinkan HTTPS'),
(NOW() - INTERVAL 45 MINUTE, '45.133.1.77', 23, 'Port Scan', 'DIBLOKIR', 'Aturan: Blokir Telnet'),
(NOW() - INTERVAL 40 MINUTE, '185.220.101.4', 22, 'Brute Force SSH', 'DIBLOKIR', 'Blacklist IP'),
(NOW() - INTERVAL 30 MINUTE, '192.168.1.22', 80, 'Akses Normal', 'DIIZINKAN', 'Aturan: Izinkan HTTP'),
(NOW() - INTERVAL 20 MINUTE, '45.133.1.77', 3389, 'Port Scan', 'DIBLOKIR', 'Default deny (allow-list)'),
(NOW() - INTERVAL 10 MINUTE, '103.28.12.9', 445, 'Port Scan', 'DIBLOKIR', 'Blacklist IP');
