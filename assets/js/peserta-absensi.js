/* peserta-absensi.js
   Modul Presensi Mandiri Peserta Magang
   Fitur: Jam Digital Live, Geolocation + Radius Kantor Leaflet.js, Kamera Selfie WebRTC + Fallback Upload
 */

$(document).ready(function() {

    var pesertaContext = window.pembimbingDemoData.getPesertaContext();
    $('#userName').text(pesertaContext.peserta.nama);
    $('#userRole').text(pesertaContext.peserta.nim + ' · ' + pesertaContext.unit.nama);
    $('#userInitial').text(pesertaContext.peserta.nama.charAt(0).toUpperCase());
    $('#participantPlacement').text(
        pesertaContext.unit.nama + ' · Pembimbing: ' + pesertaContext.pembimbing.nama
    );
    var historyRows = pesertaContext.absensi.map(function(item) {
        var date = new Date(item.tanggal + 'T00:00:00');
        var statusBadge = item.status === 'Terlambat'
            ? '<span class="badge badge-pending">Terlambat</span>'
            : '<span class="badge badge-approved">' + item.status + '</span>';
        var verification = item.verifikasi === 'Diverifikasi'
            ? '<span class="badge badge-approved">Diverifikasi</span><div class="small text-success">Paraf: ' + item.pembimbing + '</div>'
            : '<span class="badge badge-pending">' + item.verifikasi + '</span>';
        return '<tr>' +
            '<td>' + date.toLocaleDateString('id-ID', { weekday: 'long' }) + ', ' + item.tanggal + '</td>' +
            '<td>' + item.jamMasuk + ' WIB</td>' +
            '<td>' + item.jamPulang + ' WIB</td>' +
            '<td>' + item.foto + '</td>' +
            '<td>' + item.jarak + ' m</td>' +
            '<td>' + statusBadge + '</td>' +
            '<td>' + verification + '</td>' +
            '</tr>';
    }).join('');
    $('#tabelRiwayatSingkat tbody').html(historyRows ||
        '<tr><td colspan="7" class="text-center py-4 text-muted">Belum ada data presensi.</td></tr>');

    // 1. LIVE DIGITAL CLOCK
    function updateClock() {
        var now = new Date();
        var jam = String(now.getHours()).padStart(2, '0');
        var menit = String(now.getMinutes()).padStart(2, '0');
        var detik = String(now.getSeconds()).padStart(2, '0');
        $('#liveJam').text(jam + ':' + menit + ':' + detik + ' WIB');

        var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        var tglFormatted = now.toLocaleDateString('id-ID', options);
        $('#liveTanggal').text(tglFormatted);
    }
    updateClock();
    setInterval(updateClock, 1000);


    // 2. GPS & MAP LEAFLET.JS (2 LOKASI KANTOR DISHUB PONOROGO)
        // 1. Kantor Sekretariat Dinas Perhubungan Kabupaten Ponorogo
        //    Jl. Diponegoro No.14, Temengungan, Mangkujayan, Kec. Ponorogo, Kabupaten Ponorogo, Jawa Timur 63414
        // 2. Kantor Dinas Perhubungan - KIR KIR AN - UPT PKB
        //    Jalan Arif Rahman Hakim, Cekok, Perumda, Keniten, Kec. Ponorogo, Kabupaten Ponorogo, Jawa Timur 63412
    var DAFTAR_LOKASI_KANTOR = {
        'sekretariat': {
            nama: "Kantor Sekretariat Dishub Ponorogo",
            alamat: "Jl. Diponegoro No.14, Temengungan, Kec. Ponorogo",
            lat: -7.867828,
            long: 111.462034,
            radius: 70 // 70 meter
        },
        'upt_pkb': {
            nama: "Kantor Dinas Perhubungan - KIR KIR AN - UPT PKB",
            alamat: "Jl. Arif Rahman Hakim, Keniten / Cekok, Kec. Ponorogo",
            lat: -7.838971,
            long: 111.480587,
            radius: 70 // 70 meter
        }
    };

    var currentLokasiKey = null; // peserta harus memilih lokasi kantor dulu
    var activeKantor = null;

    var map = null;
    var userMarker = null;
    var officeMarker = null;
    var officeCircle = null;

    var isGpsDetected = false; // Flag apakah GPS perangkat sudah aktif dan terbaca
    var userLat = null;
    var userLong = null;
    var jarakUserSekarang = null;
    var isWithinRadius = false;

    // Menghitung jarak antara dua koordinat (Haversine Formula) dalam satuan meter
    function getDistance(lat1, long1, lat2, long2) {
        var R = 6371e3; // Rata-rata radius bumi dalam meter
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLong = (long2 - long1) * Math.PI / 180;
        var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLong/2) * Math.sin(dLong/2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return Math.round(R * c);
    }

    function initMap() {
        if ($('#mapPresensi').length === 0) return;

        // Default view alun-alun / kota Ponorogo sebelum kantor dipilih
        map = L.map('mapPresensi').setView([-7.870102, 111.462300], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);
    }

    initMap();

    // Event saat peserta memilih lokasi kantor penempatan
    $('#selectLokasiKantor').on('change', function() {
        currentLokasiKey = $(this).val();
        activeKantor = DAFTAR_LOKASI_KANTOR[currentLokasiKey];

        if (!activeKantor) {
            currentLokasiKey = null;
            $('#namaLokasiKantor').text('-');
            $('#alamatLokasiKantor').empty();
            $('#hintAlamatKantor').empty();
            $('#badgeRadiusMaks').text('Radius Maks: -');
            return;
        }

        $('#namaLokasiKantor').text(activeKantor.nama);
        $('#alamatLokasiKantor').html('<i class="fas fa-map-pin me-1"></i>' + activeKantor.alamat);
        $('#hintAlamatKantor').html('<span class="text-success"><i class="fas fa-check-circle me-1"></i>Kantor dipilih: ' + activeKantor.nama + '</span>');
        $('#badgeRadiusMaks').text('Radius Maks: ' + activeKantor.radius + ' Meter');

        // Update / Add marker kantor & circle radius
        if (officeMarker) {
            officeMarker.setLatLng([activeKantor.lat, activeKantor.long]);
            officeMarker.setPopupContent("<b>" + activeKantor.nama + "</b><br>" + activeKantor.alamat);
        } else {
            officeMarker = L.marker([activeKantor.lat, activeKantor.long]).addTo(map)
                .bindPopup("<b>" + activeKantor.nama + "</b><br>" + activeKantor.alamat);
        }

        if (officeCircle) {
            officeCircle.setLatLng([activeKantor.lat, activeKantor.long]);
            officeCircle.setRadius(activeKantor.radius);
        } else {
            officeCircle = L.circle([activeKantor.lat, activeKantor.long], {
                color: '#334EAC',
                fillColor: '#D0E3FF',
                fillOpacity: 0.35,
                radius: activeKantor.radius
            }).addTo(map);
        }

        map.setView([activeKantor.lat, activeKantor.long], 16);

        // Jika GPS sudah pernah terdeteksi, hitung ulang jarak ke kantor baru ini
        if (isGpsDetected && userLat && userLong) {
            updateUserMarker(userLat, userLong);
        } else {
            // Berikan petunjuk untuk aktifkan GPS
            Swal.fire({
                icon: 'info',
                title: 'Kantor Telah Dipilih!',
                html: `Anda memilih <b>${activeKantor.nama}</b>.<br><br>Sekarang, pastikan <b>GPS / Lokasi di perangkat Anda sudah aktif</b> lalu tekan tombol <b>"Aktifkan & Deteksi Lokasi GPS Saya"</b>.`,
                confirmButtonColor: '#334EAC',
                confirmButtonText: 'Baik, Mengerti'
            });
        }
    });

    function updateUserMarker(lat, long) {
        userLat = lat;
        userLong = long;
        isGpsDetected = true;

        if (userMarker) {
            userMarker.setLatLng([userLat, userLong]);
        } else if (map) {
            var iconUser = L.divIcon({
                className: 'custom-user-pin',
                html: '<div style="background:#28a745; width:18px; height:18px; border-radius:50%; border:3px solid #fff; box-shadow:0 0 8px rgba(0,0,0,0.5);"></div>',
                iconSize: [18, 18],
                iconAnchor: [9, 9]
            });
            userMarker = L.marker([userLat, userLong], { icon: iconUser }).addTo(map)
                .bindPopup("<b>Posisi GPS Anda</b>");
        }

        $('#badgeGpsStatus')
            .removeClass('bg-light text-muted bg-danger')
            .addClass('bg-success text-white')
            .html('<i class="fas fa-satellite-dish me-1"></i>GPS Terhubung');

        $('#textKoordinat').html('Koordinat GPS Anda: <code>' + userLat.toFixed(6) + ', ' + userLong.toFixed(6) + '</code>');

        if (activeKantor) {
            jarakUserSekarang = getDistance(activeKantor.lat, activeKantor.long, userLat, userLong);
            isWithinRadius = jarakUserSekarang <= activeKantor.radius;

            $('#jarakMeter').text(jarakUserSekarang + ' meter');

            if (isWithinRadius) {
                $('#jarakMeter').removeClass('text-danger text-muted').addClass('text-success');
                $('#badgeRadius')
                    .removeClass('bg-secondary badge-rejected')
                    .addClass('badge-approved')
                    .html('<i class="fas fa-check-circle me-1"></i>Di Dalam Radius (' + jarakUserSekarang + 'm)');
            } else {
                $('#jarakMeter').removeClass('text-success text-muted').addClass('text-danger');
                $('#badgeRadius')
                    .removeClass('bg-secondary badge-approved')
                    .addClass('badge-rejected')
                    .html('<i class="fas fa-times-circle me-1"></i>Di Luar Radius (' + jarakUserSekarang + 'm)');
            }
        }
    }

    // Tombol Meminta Peserta Mengaktifkan & Membaca GPS Perangkat
    $('#btnCekLokasi').on('click', function() {
        // Validasi: Harus pilih kantor dulu
        if (!currentLokasiKey || !activeKantor) {
            Swal.fire({
                icon: 'warning',
                title: 'Pilih Kantor Terlebih Dahulu!',
                text: 'Harap tentukan kantor penempatan Anda (Kantor Sekretariat atau UPT PKB) sebelum menyalakan GPS.',
                confirmButtonColor: '#334EAC'
            });
            $('#selectLokasiKantor').focus();
            return;
        }

        if (!("geolocation" in navigator)) {
            Swal.fire('Info', 'Perangkat atau browser Anda tidak mendukung Geolocation GPS.', 'warning');
            return;
        }

        var $btn = $(this);
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-1"></i> Menghubungi Sensor GPS Perangkat...');

        navigator.geolocation.getCurrentPosition(
            function(pos) {
                $btn.prop('disabled', false).html('<i class="fas fa-sync-alt me-1"></i> Deteksi Ulang GPS Saya');
                
                var realLat = pos.coords.latitude;
                var realLong = pos.coords.longitude;

                updateUserMarker(realLat, realLong);
                map.setView([realLat, realLong], 17);

                if (isWithinRadius) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Lokasi Berhasil Terdeteksi!',
                        html: `GPS Anda aktif!<br>Posisi Anda terdeteksi <b>${jarakUserSekarang} meter</b> dari <b>${activeKantor.nama}</b>.<br><span class="badge bg-success mt-2">Memenuhi Syarat Radius (&le; ${activeKantor.radius}m)</span>`,
                        confirmButtonColor: '#28a745'
                    });
                } else {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Lokasi Di Luar Radius!',
                        html: `GPS Anda aktif, namun posisi Anda berjarak <b>${jarakUserSekarang} meter</b> dari <b>${activeKantor.nama}</b>.<br><span class="badge bg-danger mt-2">Batas Maksimal: ${activeKantor.radius} meter</span><br><br><small class="text-muted">Silakan mendekat ke area kantor penempatan Anda untuk melakukan presensi.</small>`,
                        confirmButtonColor: '#334EAC'
                    });
                }
            },
            function(err) {
                $btn.prop('disabled', false).html('<i class="fas fa-location-arrow me-1"></i> Coba Aktifkan GPS Lagi');
                
                var pesanError = 'Harap aktifkan GPS / Lokasi di setelan perangkat atau berikan izin akses lokasi pada browser Anda.';
                if (err.code === err.PERMISSION_DENIED) {
                    pesanError = 'Akses lokasi ditolak oleh browser/perangkat Anda. Mohon izinkan (Allow) akses lokasi pada pengaturan browser untuk melakukan absensi.';
                } else if (err.code === err.POSITION_UNAVAILABLE) {
                    pesanError = 'Sinyal GPS tidak ditemukan. Pastikan Anda berada di area terbuka atau aktifkan mode akurasi tinggi.';
                } else if (err.code === err.TIMEOUT) {
                    pesanError = 'Waktu deteksi GPS habis. Silakan coba lagi.';
                }

                // Berikan opsi Simulasi Demo bagi pengembang / tester jika GPS dimatikan di localhost
                Swal.fire({
                    icon: 'error',
                    title: 'GPS Belum Diaktifkan / Tidak Diizinkan',
                    html: `
                        <p class="small text-muted mb-3">${pesanError}</p>
                        <div class="p-2 border rounded bg-light small text-start">
                            <strong>Mode Testing / Demo di Localhost:</strong><br>
                            Ingin menggunakan titik simulasi di dekat kantor ${activeKantor.nama}?
                        </div>
                    `,
                    showCancelButton: true,
                    confirmButtonText: '<i class="fas fa-vial me-1"></i> Gunakan Titik Demo (Testing)',
                    cancelButtonText: 'Tutup & Aktifkan GPS Asli',
                    confirmButtonColor: '#334EAC',
                    cancelButtonColor: '#6c757d'
                }).then(function(res) {
                    if (res.isConfirmed) {
                        // Posisi simulasi valid 25 meter dari kantor yang dipilih
                        var demoLat = activeKantor.lat + 0.00015;
                        var demoLong = activeKantor.long + 0.00018;
                        updateUserMarker(demoLat, demoLong);
                        map.setView([demoLat, demoLong], 17);
                        Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'info',
                            title: 'Menggunakan titik simulasi demo (' + jarakUserSekarang + ' m dari kantor)',
                            showConfirmButton: false,
                            timer: 2500
                        });
                    }
                });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });


    // 3. KAMERA WEBCAM SELFIE WEBRTC 
    var video = document.getElementById('webcamVideo');
    var canvas = document.getElementById('snapshotCanvas');
    var imgSnapshot = document.getElementById('snapshotImg');
    var stream = null;
    var fotoSelfieCaptured = null;

    $('#btnNyalakanKamera').on('click', function() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
                .then(function(s) {
                    stream = s;
                    video.srcObject = stream;
                    video.style.display = 'block';
                    imgSnapshot.style.display = 'none';

                    $('#statusKameraText').text('Kamera Aktif').removeClass('text-muted').addClass('text-success fw-bold');
                    $('#btnAmbilFoto').prop('disabled', false);
                    $('#btnNyalakanKamera').hide();
                    $('#btnUlangiFoto').hide();
                })
                .catch(function(err) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Kamera Tidak Tersedia',
                        text: 'Tidak dapat mengakses webcam (' + err.message + '). Silakan gunakan input file di bawah untuk upload foto selfie.',
                        confirmButtonColor: '#334EAC'
                    });
                });
        } else {
            Swal.fire('Perhatian', 'Perangkat/Browser ini tidak mendukung akses kamera langsung.', 'info');
        }
    });

    // Ambil Snapshot Foto
    $('#btnAmbilFoto').on('click', function() {
        if (!video || !video.videoWidth) {
            // Fallback capture foto presensi lokal via canvas
            canvas.width = 300;
            canvas.height = 300;
            var ctx = canvas.getContext('2d');
            ctx.fillStyle = '#f1f5f9';
            ctx.fillRect(0, 0, 300, 300);
            ctx.fillStyle = '#334EAC';
            ctx.font = 'bold 15px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Foto Selfie Presensi', 150, 130);
            ctx.fillStyle = '#64748b';
            ctx.font = '12px Arial';
            ctx.fillText('Dinas Perhubungan Ponorogo', 150, 155);
            ctx.fillText(new Date().toLocaleTimeString('id-ID') + ' WIB', 150, 180);
            fotoSelfieCaptured = canvas.toDataURL('image/jpeg', 0.85);
        } else {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            fotoSelfieCaptured = canvas.toDataURL('image/jpeg', 0.85);
        }

        imgSnapshot.src = fotoSelfieCaptured;
        imgSnapshot.style.display = 'block';
        video.style.display = 'none';

        // Matikan stream kamera sementara
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        $('#btnAmbilFoto').prop('disabled', true).hide();
        $('#btnUlangiFoto').show();
        $('#statusKameraText').text('Foto Berhasil Diambil').removeClass('text-muted').addClass('text-primary fw-bold');
    });

    // Foto Ulang
    $('#btnUlangiFoto').on('click', function() {
        fotoSelfieCaptured = null;
        $('#btnNyalakanKamera').trigger('click');
        $('#btnAmbilFoto').show();
    });

    // Fallback Upload Foto File
    $('#fallbackFotoInput').on('change', function(e) {
        var file = e.target.files[0];
        if (file) {
            var reader = new FileReader();
            reader.onload = function(evt) {
                fotoSelfieCaptured = evt.target.result;
                imgSnapshot.src = fotoSelfieCaptured;
                imgSnapshot.style.display = 'block';
                video.style.display = 'none';

                $('#statusKameraText').text('Foto Diunggah').removeClass('text-muted').addClass('text-primary fw-bold');
                $('#btnAmbilFoto').hide();
                $('#btnNyalakanKamera').hide();
                $('#btnUlangiFoto').show();
            };
            reader.readAsDataURL(file);
        }
    });


    // 4. CHECK-IN & CHECK-OUT
    // Check-in
    $('#btnCheckIn').on('click', function() {
        // Validasi 1: Wajib Pilih Kantor Penempatan
        if (!currentLokasiKey || !activeKantor) {
            Swal.fire({
                icon: 'warning',
                title: 'Pilih Kantor Penempatan!',
                text: 'Silakan pilih lokasi kantor penempatan magang Anda terlebih dahulu pada form di atas.',
                confirmButtonColor: '#334EAC'
            });
            $('#selectLokasiKantor').focus();
            return;
        }

        // Validasi 2: Wajib Aktifkan & Deteksi GPS Perangkat
        if (!isGpsDetected || userLat === null || userLng === null) {
            Swal.fire({
                icon: 'warning',
                title: 'Lokasi GPS Belum Terdeteksi!',
                html: 'Harap aktifkan GPS perangkat Anda lalu tekan tombol <b>"Aktifkan & Deteksi Lokasi GPS Saya"</b> untuk memverifikasi posisi Anda.',
                confirmButtonColor: '#334EAC'
            });
            return;
        }

        // Validasi 3: Selfie Wajib
        if (!fotoSelfieCaptured) {
            Swal.fire({
                icon: 'warning',
                title: 'Foto Selfie Diperlukan!',
                text: 'Harap ambil foto selfie atau unggah foto wajah Anda terlebih dahulu sebelum absen.',
                confirmButtonColor: '#334EAC'
            });
            return;
        }

        // Validasi 4: Radius Kantor
        if (!isWithinRadius) {
            Swal.fire({
                icon: 'error',
                title: 'Di Luar Radius Kantor!',
                html: 'Jarak posisi GPS Anda adalah <strong>' + jarakUserSekarang + ' meter</strong>.<br>Batas radius maksimal dari <b>' + activeKantor.nama + '</b> adalah <strong>' + activeKantor.radius + ' meter</strong>.',
                confirmButtonColor: '#334EAC'
            });
            return;
        }

        var waktuSekarang = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

        Swal.fire({
            title: 'Konfirmasi Check-in Masuk?',
            html: `
                <div class="text-center mb-2">
                    <img src="${fotoSelfieCaptured}" style="width:120px;height:120px;object-fit:cover;border-radius:12px;border:2px solid #334EAC;" class="mb-2"><br>
                    <strong>Lokasi Penempatan:</strong> ${activeKantor.nama}<br>
                    <strong>Waktu Presensi:</strong> ${waktuSekarang}<br>
                    <small class="text-success"><i class="fas fa-map-pin me-1"></i>Jarak: ${jarakUserSekarang} meter dari kantor</small>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="fas fa-check me-1"></i> Ya, Kirim Absen Masuk',
            cancelButtonText: 'Batal'
        }).then(function(result) {
            if (result.isConfirmed) {
                // Template AJAX backend:
                // $.post('api/peserta/checkin.php', { foto: fotoSelfieCaptured, lat: userLat, lng: userLng, lokasi: currentLokasiKey }, function(res){ ... });
                
                $('#badgeStatusHariIni').html('<i class="fas fa-check-circle me-1"></i> Sudah Check-in (' + waktuSekarang + ' di ' + activeKantor.nama.split('-')[0].trim() + ')');
                
                Swal.fire({
                    icon: 'success',
                    title: 'Presensi Masuk Berhasil!',
                    html: 'Absensi masuk Anda di <b>' + activeKantor.nama + '</b> telah tersimpan dan menunggu verifikasi pembimbing.',
                    confirmButtonColor: '#334EAC'
                });
            }
        });
    });

    // Aksi Check-out
    $('#btnCheckOut').on('click', function() {
        if (!currentLokasiKey || !activeKantor) {
            Swal.fire({
                icon: 'warning',
                title: 'Pilih Kantor Penempatan!',
                text: 'Silakan tentukan kantor penempatan Anda terlebih dahulu.',
                confirmButtonColor: '#334EAC'
            });
            $('#selectLokasiKantor').focus();
            return;
        }

        if (!isGpsDetected || userLat === null || userLng === null) {
            Swal.fire({
                icon: 'warning',
                title: 'Lokasi GPS Belum Terdeteksi!',
                html: 'Harap aktifkan GPS perangkat Anda lalu tekan tombol <b>"Aktifkan & Deteksi Lokasi GPS Saya"</b>.',
                confirmButtonColor: '#334EAC'
            });
            return;
        }

        if (!fotoSelfieCaptured) {
            Swal.fire({
                icon: 'warning',
                title: 'Foto Selfie Diperlukan!',
                text: 'Harap ambil foto selfie sebelum melakukan check-out pulang.',
                confirmButtonColor: '#334EAC'
            });
            return;
        }

        if (!isWithinRadius) {
            Swal.fire({
                icon: 'error',
                title: 'Di Luar Radius Kantor!',
                html: 'Check-out harus dilakukan di lingkungan <b>' + activeKantor.nama + '</b> (&le; ' + activeKantor.radius + 'm).<br>Jarak Anda saat ini: <b>' + jarakUserSekarang + ' meter</b>.',
                confirmButtonColor: '#334EAC'
            });
            return;
        }

        var waktuSekarang = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

        Swal.fire({
            title: 'Konfirmasi Check-out Pulang?',
            html: `
                <div class="text-center mb-2">
                    <img src="${fotoSelfieCaptured}" style="width:120px;height:120px;object-fit:cover;border-radius:12px;border:2px solid #c82333;" class="mb-2"><br>
                    <strong>Lokasi Kantor:</strong> ${activeKantor.nama}<br>
                    <strong>Waktu Pulang:</strong> ${waktuSekarang}<br>
                    <small class="text-success"><i class="fas fa-map-pin me-1"></i>Jarak: ${jarakUserSekarang} meter dari kantor</small>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#c82333',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="fas fa-sign-out-alt me-1"></i> Ya, Kirim Absen Pulang',
            cancelButtonText: 'Batal'
        }).then(function(result) {
            if (result.isConfirmed) {
                Swal.fire({
                    icon: 'success',
                    title: 'Presensi Pulang Berhasil!',
                    html: 'Presensi kepulangan Anda di <b>' + activeKantor.nama + '</b> telah tercatat. Terima kasih atas kegiatan magang hari ini!',
                    confirmButtonColor: '#334EAC'
                });
            }
        });
    });

    // Preview Foto Selfie di Riwayat
    $(document).on('click', '.btn-preview-foto', function() {
        var src = $(this).data('src');
        Swal.fire({
            title: 'Foto Selfie Presensi',
            imageUrl: src,
            imageWidth: 280,
            imageHeight: 280,
            imageAlt: 'Selfie Presensi',
            confirmButtonColor: '#334EAC',
            confirmButtonText: 'Tutup'
        });
    });

});
