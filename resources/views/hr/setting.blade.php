@extends('layouts.hr')

@section('title', 'Setting')
@section('page_title', 'Setting Lokasi Absensi')

@push('styles')
<style>
    .setting-card {
        background: var(--surface);
        border-radius: var(--radius-lg);
        padding: 2rem;
        box-shadow: var(--shadow-sm);
        border: 1px solid var(--border);
        margin-bottom: 1.5rem;
    }

    .form-group {
        margin-bottom: 1.5rem;
    }

    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
    }

    .form-group input {
        width: 100%;
        padding: 0.625rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
    }

    .map-container {
        width: 100%;
        height: 400px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--border);
        margin-bottom: 1rem;
        position: relative;
        overflow: hidden;
    }

    #map {
        width: 100%;
        height: 100%;
        border-radius: var(--radius-sm);
    }

    /* Leaflet popup styling */
    .leaflet-popup-content-wrapper {
        border-radius: var(--radius-sm);
    }

    .btn {
        padding: 0.625rem 1.25rem;
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        border: none;
        transition: all 0.2s;
    }

    .btn-primary {
        background: var(--primary);
        color: white;
    }

    .btn-primary:hover {
        background: var(--primary-dark);
    }

    .info-box {
        background: var(--bg);
        padding: 1rem;
        border-radius: var(--radius-sm);
        border: 1px solid var(--border);
        margin-bottom: 1rem;
    }

    .info-box p {
        margin: 0.5rem 0;
        font-size: 0.875rem;
        color: var(--text-muted);
    }

    .info-box strong {
        color: var(--text);
    }
</style>
@endpush

@section('content')
<div class="setting-card">
    <h3 style="margin: 0 0 1.5rem 0;">Setting Lokasi Kantor</h3>
    
    <div class="info-box">
        <p><strong>Petunjuk:</strong></p>
        <p>1. Klik pada peta untuk memilih lokasi kantor</p>
        <p>2. Atau gunakan tombol "Gunakan Lokasi Saya" untuk mendapatkan lokasi saat ini</p>
        <p>3. Atur radius (dalam meter) untuk batas absensi</p>
        <p>4. Klik "Simpan" untuk menyimpan pengaturan</p>
    </div>

    <form id="settingForm">
        <div class="form-group">
            <label>Nama Lokasi *</label>
            <input type="text" id="nama" placeholder="Contoh: Kantor Pusat" required>
        </div>

        <div class="form-group">
            <label>Pilih Lokasi di Peta</label>
            <div class="map-container">
                <div id="map"></div>
            </div>
            <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                <button type="button" class="btn btn-primary" onclick="useCurrentLocation()">Gunakan Lokasi Saya</button>
                <button type="button" class="btn" onclick="clearMarker()" style="background: var(--surface); border: 1px solid var(--border);">Hapus Marker</button>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
                <label>Latitude *</label>
                <input type="text" id="latAbsen" readonly required placeholder="Contoh: -6.2088">
            </div>
            <div class="form-group">
                <label>Longitude *</label>
                <input type="text" id="longAbsen" readonly required placeholder="Contoh: 106.8456">
            </div>
        </div>

        <div class="form-group">
            <label>Radius (meter) *</label>
            <input type="number" id="radius" placeholder="Contoh: 100" min="1" required>
            <small style="display: block; margin-top: 0.25rem; color: var(--text-muted); font-size: 0.75rem;">
                Radius dalam meter untuk batas melakukan absensi dari lokasi kantor
            </small>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 2rem;">
            <button type="button" class="btn" onclick="resetForm()" style="background: var(--surface); border: 1px solid var(--border);">Reset</button>
            <button type="button" class="btn btn-primary" onclick="saveSetting()">Simpan</button>
        </div>
    </form>
</div>
@endsection

@push('scripts')
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<script>
    let map;
    let marker;
    let radiusCircle;

    function initMap() {
        // Default location (Jakarta)
        const defaultLocation = [-6.2088, 106.8456];
        
        try {
            // Initialize map with OpenStreetMap
            map = L.map('map').setView(defaultLocation, 15);

            // Add OpenStreetMap tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19
            }).addTo(map);

            // Add click listener to map
            map.on('click', function(e) {
                placeMarker([e.latlng.lat, e.latlng.lng]);
            });

            // Load existing setting
            loadSetting();
        } catch (error) {
            console.error('Error initializing map:', error);
            document.getElementById('map').innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted);">Error loading map.</div>';
            loadSetting();
        }
    }

    function placeMarker(location) {
        if (!map) return;

        // location is [lat, lng] array for Leaflet
        if (marker) {
            marker.setLatLng(location);
        } else {
            // Create custom icon
            const customIcon = L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });

            marker = L.marker(location, {
                draggable: true,
                icon: customIcon
            }).addTo(map);

            // Add drag listener
            marker.on('dragend', function(e) {
                const pos = marker.getLatLng();
                updateCoordinates([pos.lat, pos.lng]);
            });
        }

        updateCoordinates(location);
        map.setView(location, map.getZoom());
        updateRadiusCircle();
    }

    function updateCoordinates(location) {
        if (Array.isArray(location) && location.length === 2) {
            document.getElementById('latAbsen').value = location[0].toFixed(6);
            document.getElementById('longAbsen').value = location[1].toFixed(6);
        } else if (location && typeof location.lat === 'number') {
            document.getElementById('latAbsen').value = location.lat.toFixed(6);
            document.getElementById('longAbsen').value = location.lng.toFixed(6);
        }
        updateRadiusCircle();
    }

    function updateRadiusCircle() {
        if (!map) return;

        const lat = parseFloat(document.getElementById('latAbsen').value);
        const lng = parseFloat(document.getElementById('longAbsen').value);
        const radius = parseFloat(document.getElementById('radius').value) || 100;

        if (lat && lng) {
            if (radiusCircle) {
                map.removeLayer(radiusCircle);
            }

            radiusCircle = L.circle([lat, lng], {
                color: '#FF0000',
                fillColor: '#FF0000',
                fillOpacity: 0.35,
                radius: radius
            }).addTo(map);
        }
    }

    document.getElementById('radius').addEventListener('input', function() {
        if (marker) {
            updateRadiusCircle();
        }
    });

    function useCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = [position.coords.latitude, position.coords.longitude];
                    placeMarker(location);
                },
                (error) => {
                    alert('Tidak dapat mengambil lokasi saat ini. Pastikan izin lokasi sudah diberikan.');
                    console.error('Error getting location:', error);
                }
            );
        } else {
            alert('Browser tidak mendukung geolocation');
        }
    }

    function clearMarker() {
        if (marker) {
            map.removeLayer(marker);
            marker = null;
        }
        if (radiusCircle) {
            map.removeLayer(radiusCircle);
            radiusCircle = null;
        }
        document.getElementById('latAbsen').value = '';
        document.getElementById('longAbsen').value = '';
    }

    async function loadSetting() {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            const response = await fetch('/api/hr/setting', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success && result.data) {
                const setting = result.data;
                document.getElementById('nama').value = setting.nama || '';
                document.getElementById('latAbsen').value = setting.lat_absen || '';
                document.getElementById('longAbsen').value = setting.long_long || '';
                document.getElementById('radius').value = setting.radius || '';

                // Place marker if coordinates exist
                if (setting.lat_absen && setting.long_long) {
                    try {
                        const location = [
                            parseFloat(setting.lat_absen),
                            parseFloat(setting.long_long)
                        ];
                        placeMarker(location);
                        if (setting.radius) {
                            updateRadiusCircle();
                        }
                    } catch (error) {
                        console.error('Error placing marker:', error);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading setting:', error);
        }
    }

    async function saveSetting() {
        const nama = document.getElementById('nama').value;
        const latAbsen = document.getElementById('latAbsen').value;
        const longAbsen = document.getElementById('longAbsen').value;
        const radius = document.getElementById('radius').value;

        if (!nama || !latAbsen || !longAbsen || !radius) {
            alert('Harap lengkapi semua field yang wajib diisi');
            return;
        }

        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const response = await fetch('/api/hr/setting', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nama: nama,
                    lat_absen: latAbsen,
                    long_long: longAbsen,
                    radius: radius
                })
            });

            const result = await response.json();
            
            if (result.success) {
                alert(result.message || 'Setting berhasil disimpan');
            } else {
                alert(result.message || 'Terjadi kesalahan');
            }
        } catch (error) {
            console.error('Error saving setting:', error);
            alert('Terjadi kesalahan saat menyimpan setting');
        }
    }

    function resetForm() {
        if (confirm('Apakah Anda yakin ingin mereset form?')) {
            document.getElementById('settingForm').reset();
            clearMarker();
            if (map) {
                map.setView([-6.2088, 106.8456], 15);
            }
        }
    }

    // Initialize map when page loads
    window.addEventListener('load', function() {
        initMap();
    });
</script>
@endpush

