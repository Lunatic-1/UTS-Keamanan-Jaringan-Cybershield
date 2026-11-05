<?php
header('Content-Type: application/json; charset=utf-8');
try { require 'config.php'; } catch (Throwable $e) { http_response_code(500); echo json_encode(['error' => 'Koneksi database gagal']); exit; }

$a  = $_GET['action'] ?? '';
$in = json_decode(file_get_contents('php://input'), true) ?? [];

function out($d, $c = 200) { http_response_code($c); echo json_encode($d); exit; }
function ip_ok($ip)   { return (bool)preg_match('/^[0-9.*]{1,45}$/', $ip); }
function port_ok($p)  { return $p === '*' || (ctype_digit((string)$p) && $p >= 1 && $p <= 65535); }

// Evaluasi paket: blacklist -> aturan BLOCK -> aturan ALLOW -> default deny
function evaluate($pdo, $ip, $port) {
    $s = $pdo->prepare('SELECT 1 FROM blacklist_ips WHERE ip_address = ?');
    $s->execute([$ip]);
    if ($s->fetch()) return ['DIBLOKIR', 'Blacklist IP'];
    $rules = $pdo->query("SELECT * FROM firewall_rules WHERE aktif = 1 ORDER BY (aksi = 'BLOCK') DESC, id")->fetchAll();
    foreach ($rules as $r) {
        $portMatch = $r['port'] === '*' || (int)$r['port'] === (int)$port;
        $ipMatch   = $r['ip_address'] === '*' || fnmatch($r['ip_address'], $ip);
        if ($portMatch && $ipMatch) return [$r['aksi'] === 'ALLOW' ? 'DIIZINKAN' : 'DIBLOKIR', 'Aturan: ' . $r['nama']];
    }
    return ['DIBLOKIR', 'Default deny (allow-list)'];
}

switch ($a) {
    case 'stats':
        $r = $pdo->query("SELECT COUNT(*) total,
              COALESCE(SUM(tindakan='DIIZINKAN'),0) allowed,
              COALESCE(SUM(tindakan='DIBLOKIR'),0) blocked,
              COALESCE(SUM(tindakan='DIBLOKIR' AND waktu >= NOW() - INTERVAL 1 MINUTE),0) recent_blocked
              FROM security_logs")->fetch();
        $q = $pdo->query("SELECT COALESCE(SUM(aktif=1),0) aktif,
              COALESCE(SUM(aktif=1 AND aksi='ALLOW'),0) allow_n,
              COALESCE(SUM(aktif=1 AND aksi='BLOCK'),0) block_n,
              COUNT(*) semua FROM firewall_rules")->fetch();
        out(array_map('intval', $r + $q));

    case 'top_ports':
        out($pdo->query("SELECT port_tujuan port, COUNT(*) jumlah FROM security_logs
                         WHERE tindakan='DIBLOKIR' GROUP BY port_tujuan ORDER BY jumlah DESC LIMIT 6")->fetchAll());

    case 'logs':
        $lim = min(500, max(1, (int)($_GET['limit'] ?? 100)));
        $f = $_GET['filter'] ?? '';
        $sql = 'SELECT * FROM security_logs' . (in_array($f, ['DIIZINKAN', 'DIBLOKIR']) ? " WHERE tindakan='$f'" : '') . " ORDER BY id DESC LIMIT $lim";
        out($pdo->query($sql)->fetchAll());

    case 'logs_clear':
        $pdo->exec('TRUNCATE TABLE security_logs');
        out(['ok' => true]);

    case 'rules':
        out($pdo->query('SELECT * FROM firewall_rules ORDER BY id DESC')->fetchAll());

    case 'rule_add':
        $nama = trim($in['nama'] ?? ''); $ip = trim($in['ip'] ?? '*'); $port = trim($in['port'] ?? '*'); $aksi = $in['aksi'] ?? '';
        if ($nama === '' || !ip_ok($ip) || !port_ok($port) || !in_array($aksi, ['ALLOW', 'BLOCK'])) out(['error' => 'Data aturan tidak valid'], 422);
        $pdo->prepare('INSERT INTO firewall_rules (nama, ip_address, port, aksi) VALUES (?,?,?,?)')->execute([$nama, $ip, $port, $aksi]);
        out(['ok' => true]);

    case 'rule_toggle':
        $pdo->prepare('UPDATE firewall_rules SET aktif = 1 - aktif WHERE id = ?')->execute([(int)($in['id'] ?? 0)]);
        out(['ok' => true]);

    case 'rule_delete':
        $pdo->prepare('DELETE FROM firewall_rules WHERE id = ?')->execute([(int)($in['id'] ?? 0)]);
        out(['ok' => true]);

    case 'simulate':
        $ip = trim($in['ip'] ?? ''); $port = (int)($in['port'] ?? 0); $jenis = substr(trim($in['jenis'] ?? 'Akses Normal'), 0, 60);
        if (!filter_var($ip, FILTER_VALIDATE_IP) || $port < 1 || $port > 65535) out(['error' => 'IP atau port tidak valid'], 422);
        [$status, $ket] = ($in['fw'] ?? true) ? evaluate($pdo, $ip, $port) : ['DIIZINKAN', 'Firewall dinonaktifkan'];
        $pdo->prepare('INSERT INTO security_logs (ip_sumber, port_tujuan, jenis_aktivitas, tindakan, keterangan) VALUES (?,?,?,?,?)')
            ->execute([$ip, $port, $jenis, $status, $ket]);
        out(['status' => $status, 'keterangan' => $ket, 'waktu' => date('H:i:s')]);

    case 'bl':
        out($pdo->query('SELECT * FROM blacklist_ips ORDER BY id DESC')->fetchAll());

    case 'bl_add':
        $ip = trim($in['ip'] ?? '');
        if (!filter_var($ip, FILTER_VALIDATE_IP)) out(['error' => 'Alamat IP tidak valid'], 422);
        try { $pdo->prepare('INSERT INTO blacklist_ips (ip_address, alasan) VALUES (?,?)')->execute([$ip, substr(trim($in['alasan'] ?? ''), 0, 150)]); }
        catch (PDOException $e) { out(['error' => 'IP sudah ada di blacklist'], 409); }
        out(['ok' => true]);

    case 'bl_delete':
        $pdo->prepare('DELETE FROM blacklist_ips WHERE id = ?')->execute([(int)($in['id'] ?? 0)]);
        out(['ok' => true]);

    default:
        out(['error' => 'Aksi tidak dikenal'], 400);
}
