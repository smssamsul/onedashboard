<?php
// Verify customer_type distribution
$pdo = new PDO('pgsql:host=localhost;dbname=one_dashboard', 'postgres', 'root');
$stmt = $pdo->query("SELECT customer_type, COUNT(*) as total FROM customer WHERE status != 'N' GROUP BY customer_type ORDER BY customer_type");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($rows as $row) {
    echo $row['customer_type'] . ': ' . $row['total'] . PHP_EOL;
}
$total = $pdo->query("SELECT COUNT(*) FROM customer WHERE status != 'N'")->fetchColumn();
echo "TOTAL: " . $total . PHP_EOL;
