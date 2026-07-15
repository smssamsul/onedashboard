<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Shipping Label - {{ $waybill_id }}</title>
    <style>
        @page {
            margin: 5px;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 11px;
            color: #000;
            margin: 0;
            padding: 0;
        }
        .container {
            border: 2px solid #000;
            display: block;
        }
        .row {
            border-bottom: 2px solid #000;
            display: block;
        }
        .row:last-child {
            border-bottom: none;
        }
        
        /* Header Row */
        .header-table {
            width: 100%;
            border-collapse: collapse;
        }
        .header-courier {
            width: 38%;
            border-right: 2px solid #000;
            padding: 6px 8px;
            vertical-align: middle;
            text-align: center;
        }
        .header-courier img {
            max-width: 100%;
            max-height: 44px;
            object-fit: contain;
        }
        .header-courier-text {
            font-size: 20px;
            font-weight: 900;
            letter-spacing: -1px;
            text-transform: uppercase;
        }
        .header-right {
            width: 62%;
            padding: 5px;
            text-align: center;
            vertical-align: middle;
        }
        .brand-logo {
            font-size: 20px;
            font-weight: 900;
            letter-spacing: -1px;
            margin-bottom: 2px;
        }
        .brand-url {
            font-size: 11px;
            font-weight: bold;
        }

        /* Main Barcode Row */
        .main-barcode-wrap {
            padding: 5px;
            text-align: center;
        }
        .main-barcode-wrap img {
            height: 50px;
            width: 70%;
            margin-bottom: 3px;
        }
        .waybill-text {
            font-size: 13px;
            font-weight: normal;
        }

        /* Shipping Details Row */
        .shipping-details {
            text-align: center;
            padding: 5px;
            font-size: 12px;
        }

        /* Reference & Weight Row */
        .col-table {
            width: 100%;
            border-collapse: collapse;
        }
        .col-left {
            width: 50%;
            border-right: 2px solid #000;
            padding: 5px;
            vertical-align: top;
        }
        .col-right {
            width: 50%;
            padding: 5px;
            vertical-align: top;
        }
        
        .ref-title {
            font-size: 10px;
            margin-bottom: 3px;
        }
        .ref-barcode img {
            height: 25px;
            width: 90%;
            margin-bottom: 2px;
        }
        .ref-text {
            font-size: 10px;
        }

        .qty-weight {
            font-size: 11px;
            margin-bottom: 10px;
        }
        
        /* Addresses Row */
        .address-title {
            font-size: 10px;
            margin-bottom: 2px;
        }
        .address-name {
            font-weight: normal;
            font-size: 10px;
        }
        .address-phone {
            font-size: 10px;
            margin-bottom: 2px;
        }
        .address-text {
            font-size: 9px;
            line-height: 1.2;
            text-transform: uppercase;
        }

        /* Item & Notes */
        .item-row {
            padding: 4px 6px;
            font-size: 10px;
        }
        
        /* Footer */
        .footer-row {
            text-align: center;
            padding: 4px;
            font-size: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Row 1: Header — Logo Kurir kiri, Brand kanan -->
        <div class="row">
            <table class="header-table">
                <tr>
                    <td class="header-courier">
                        @php
                            $courierSlug = strtolower(preg_replace('/[^a-z0-9]/i', '', $company ?? ''));
                            $logoPath = public_path('images/courier/' . $courierSlug . '.png');
                            $logoBase64 = '';
                            if ($courierSlug && file_exists($logoPath)) {
                                $logoBase64 = base64_encode(file_get_contents($logoPath));
                            }
                        @endphp
                        @if($logoBase64)
                            <img src="data:image/png;base64,{{ $logoBase64 }}" alt="{{ strtoupper($company) }}">
                        @else
                            <div class="header-courier-text">{{ strtoupper($company ?? '-') }}</div>
                        @endif
                    </td>
                    <td class="header-right">
                        <div class="brand-logo">
                            Ternak Properti
                        </div>
                        <div class="brand-url">ternakproperti.com</div>
                    </td>
                </tr>
            </table>
        </div>

        <!-- Row 2: Main Barcode -->
        <div class="row main-barcode-wrap">
            @if(!empty($barcodeMain))
                <img src="data:image/png;base64,{{ $barcodeMain }}" alt="Main Barcode">
            @endif
            <div class="waybill-text">Nomor Resi - {{ $waybill_id }}</div>
        </div>

        <!-- Row 3: Shipping details -->
        <div class="row shipping-details">
            <div>Ongkos Kirim: Rp. {{ is_numeric($ongkos_kirim) ? number_format($ongkos_kirim, 0, ',', '.') : $ongkos_kirim }}</div>
            <div style="margin-top: 3px;">Jenis Layanan - {{ ucfirst($type) }}. Kode Rute - {{ $routing_code }}</div>
        </div>

        <!-- Row 4: Reference & Weight -->
        <div class="row">
            <table class="col-table">
                <tr>
                    <td class="col-left">
                        <div class="ref-title">Reference Number</div>
                        <div class="ref-barcode">
                            @if(!empty($barcodeRef))
                                <img src="data:image/png;base64,{{ $barcodeRef }}" alt="Ref Barcode">
                            @endif
                        </div>
                        <div class="ref-text">{{ $reference_number }}</div>
                    </td>
                    <td class="col-right">
                        <div class="qty-weight">Quantity: &nbsp; {{ $quantity }}</div>
                        <div class="qty-weight">Weight: &nbsp; {{ $weight }} Kg</div>
                    </td>
                </tr>
            </table>
        </div>

        <!-- Row 5: Addresses -->
        <div class="row">
            <table class="col-table">
                <tr>
                    <td class="col-left">
                        <div class="address-title">Alamat Penerima:</div>
                        <div class="address-name">{{ $contact_name }}</div>
                        <div class="address-phone">{{ $contact_phone }}</div>
                        <div class="address-text">{{ $address }}</div>
                    </td>
                    <td class="col-right">
                        <div class="address-title">Alamat Pengirim:</div>
                        <div class="address-name">{{ $sender_name }}</div>
                        <div class="address-phone">{{ $sender_phone }}</div>
                        <div class="address-text">{{ $sender_address }}</div>
                    </td>
                </tr>
            </table>
        </div>

        <!-- Row 6: Item -->
        <div class="row item-row">
            Jenis Barang : &nbsp;&nbsp; {{ $quantity }}x {{ $jenis_barang }}
        </div>

        <!-- Row 7: Notes -->
        <div class="row item-row">
            Catatan : &nbsp;&nbsp; {{ $catatan }}
        </div>

        <!-- Row 8: Footer -->
        <div class="row footer-row">
            Pengiriman melalui platform Ternak Properti<br>
            ternakproperti.com
        </div>
    </div>
</body>
</html>
