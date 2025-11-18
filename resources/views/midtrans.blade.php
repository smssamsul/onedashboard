<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bayar Sekarang</title>
</head>

<body>
  <h2>Bayar Pesanan</h2>
  <button id="pay-button">Bayar Sekarang</button>

  <script>
    document.getElementById('pay-button').addEventListener('click', function () {
      fetch('http://localhost:8000/api/midtrans/create-snap-cc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Samsul',
          email: 'user@example.com',
          amount: 150000,
          product_name: 'Ternak Properti'
        })
      })
      .then(res => res.json())
      .then(data => {
        window.location.href = data.redirect_url;
      });
    });
  </script>
</body>
</html>
