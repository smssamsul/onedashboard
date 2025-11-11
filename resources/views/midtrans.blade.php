<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bayar Sekarang</title>

  <!-- Snap.js (sandbox version) -->
  <script 
    type="text/javascript"
    src="https://app.sandbox.midtrans.com/snap/snap.js"
    data-client-key="{{ env('MIDTRANS_CLIENT_KEY') }}">
  </script>
</head>

<body>
  <h2>Bayar Pesanan</h2>
  <button id="pay-button">Bayar Sekarang</button>

  <script>
   document.getElementById('pay-button').addEventListener('click', function () {
  fetch('https://onedashboardapi-production.up.railway.app/api/midtrans/create-snap', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Samsul',
      email: 'user@example.com',
      amount: 150000,
      product_name: 'Ternak Properti', 
    })
  })
  .then(res => res.json())
  .then(data => {
    snap.pay(data.snap_token, {
      onSuccess: function(result){ console.log('Success', result); },
      onPending: function(result){ console.log('Pending', result); },
      onError: function(result){ console.log('Error', result); },
      onClose: function(){ console.log('Customer closed the popup'); }
    });
  });
});
  </script>
</body>
</html>