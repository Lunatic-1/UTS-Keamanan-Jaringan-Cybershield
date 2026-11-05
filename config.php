<?php
// Sesuaikan dengan pengaturan MySQL (XAMPP default: root tanpa password)
$pdo = new PDO(
    'mysql:host=localhost;dbname=cybershield;charset=utf8mb4',
    'root',
    '',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
);
