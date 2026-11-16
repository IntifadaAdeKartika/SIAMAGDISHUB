/* peserta-absensi.js
   Presensi peserta dengan geolocation dan kamera perangkat.
 */

$(document).ready(function() {
    var user;
    try {
        user = JSON.parse(localStorage.getItem('user') || localStorage.getItem('siamag_user') || 'null');
    } catch (error) {
        user = null;
    }

    var p = user && (user.peserta_magang || user.peserta || user.profile || {});
    var displayName = user && (user.nama_lengkap || p.nama_lengkap || user.nama || p.nama || user.name || p.name) ||
        'Pengguna';
    var initialMatch = String(displayName).match(/[a-zA-Z]/);
    var initial = initialMatch ? initialMatch[0].toUpperCase() : 'P';

    $('#userName').text(displayName);
    $('#userRole').text('Peserta Magang');
    $('#userInitial').text(initial);

    var DAFTAR_LOKASI_KANTOR = {
        sekretariat: {
            nama: 'Kantor Sekretariat Dishub Ponorogo',
            alamat: 'Jl. Diponegoro No.14, Temengungan, Kec. Ponorogo',
            lat: -7.867828,
            long: 111.462034,
            radius: 70
        },
        upt_pkb: {
            nama: 'Kantor Dinas Perhubungan - UPT PKB',
            alamat: 'Jl. Arif Rahman Hakim, Keniten / Cekok, Kec. Ponorogo',
            lat: -7.838971,
            long: 111.480587,
            radius: 70
        }
    };

    var currentLokasiKey = null;
    var activeKantor = null;
    var map = null;
    var userMarker = null;
    var officeMarker = null;
    var officeCircle = null;
    var stream = null;
    var fotoSelfie = null;
    var jarakUserSekarang = null;
    var isWithinRadius = false;
    var attendanceLoaded = false;
    var hasCheckedInToday = false;
    var currentCheckIn = null;
    var currentCheckOut = null;
    var $video = $('#webcamVideo');
    var $canvas = $('#snapshotCanvas');
    var $snapshot = $('#snapshotImg');

    function apiUrl(path) {
        if (typeof window.apiUrl === 'function') return window.apiUrl(path);
        var base = (window.API_BASE || 'http://localhost:8000/backend-api/').replace(/\/+$/, '');
        var cleanPath = String(path || '').replace(/^\/+/, '');
        return cleanPath ? base + '/' + cleanPath : base;
    }

    function responseMessage(payload, fallback) {
        return window.apiResponseMessage(payload, fallback);
    }

    function parseResponse(response) {
        return response.text().then(function(text) {
            var payload = null;
            if (text) {
                try {
                    payload = JSON.parse(text);
                } catch (error) {
                    if (!response.ok) throw new Error('Permintaan gagal (HTTP ' + response.status + ').');
                    throw new Error('Server mengembalikan respons yang tidak valid.');
                }
            }
            if (!response.ok) {
                throw new Error(responseMessage(payload, 'Permintaan gagal (HTTP ' + response.status + ').'));
            }
            if (payload && payload.success === false) {
                throw new Error(responseMessage(payload, 'Permintaan gagal.'));
            }
            return payload;
        });
    }

    function showError(error, title) {
        Swal.fire({
            icon: 'error',
            title: title || 'Presensi gagal',
            text: error && error.message ? error.message : 'Terjadi kesalahan saat menghubungi server.'
        });
    }

    function updateClock() {
        var now = new Date();
        $('#liveJam').text(
            String(now.getHours()).padStart(2, '0') + ':' +
            String(now.getMinutes()).padStart(2, '0') + ':' +
            String(now.getSeconds()).padStart(2, '0') + ' WIB'
        );
        $('#liveTanggal').text(now.toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        }));
    }
    updateClock();
    window.setInterval(updateClock, 1000);

    function getDistance(lat1, long1, lat2, long2) {
        var earthRadius = 6371e3;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLong = (long2 - long1) * Math.PI / 180;
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLong / 2) * Math.sin(dLong / 2);
        return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    }

    if ($('#mapPresensi').length && window.L) {
        map = L.map('mapPresensi').setView([-7.870102, 111.462300], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);
    }

    function updateUserPosition(latitude, longitude) {
        if (map) {
            if (userMarker) {
                userMarker.setLatLng([latitude, longitude]);
            } else {
                userMarker = L.marker([latitude, longitude]).addTo(map).bindPopup('Posisi GPS Anda');
            }
            map.setView([latitude, longitude], 17);
        }

        $('#badgeGpsStatus').removeClass('bg-light text-muted bg-danger')
            .addClass('bg-success text-white')
            .html('<i class="fas fa-satellite-dish me-1"></i>GPS Terhubung');
        $('#textKoordinat').html('Koordinat GPS Anda: <code>' +
            latitude.toFixed(6) + ', ' + longitude.toFixed(6) + '</code>');

        if (activeKantor) {
            jarakUserSekarang = getDistance(activeKantor.lat, activeKantor.long, latitude, longitude);
            isWithinRadius = jarakUserSekarang <= activeKantor.radius;
            $('#jarakMeter').text(jarakUserSekarang + ' meter')
                .toggleClass('text-success', isWithinRadius)
                .toggleClass('text-danger', !isWithinRadius);
            $('#badgeRadius').toggleClass('badge-approved', isWithinRadius)
                .toggleClass('badge-rejected', !isWithinRadius)
                .html((isWithinRadius
                    ? '<i class="fas fa-check-circle me-1"></i>Di Dalam Radius ('
                    : '<i class="fas fa-times-circle me-1"></i>Di Luar Radius (') +
                    jarakUserSekarang + 'm)');
        }
    }

    function selectOffice(key) {
        currentLokasiKey = key;
        activeKantor = DAFTAR_LOKASI_KANTOR[key] || null;
        jarakUserSekarang = null;
        isWithinRadius = false;

        if (!activeKantor) {
            $('#namaLokasiKantor').text('-');
            $('#alamatLokasiKantor').text('Pilih kantor penempatan terlebih dahulu.');
            $('#badgeRadiusMaks').text('Radius Maks: -');
            return;
        }

        $('#namaLokasiKantor').text(activeKantor.nama);
        $('#alamatLokasiKantor').text(activeKantor.alamat);
        $('#badgeRadiusMaks').text('Radius Maks: ' + activeKantor.radius + ' Meter');
        $('#badgeRadius').removeClass('badge-approved badge-rejected')
            .addClass('bg-secondary').text('Menunggu Deteksi GPS');
        $('#badgeGpsStatus').removeClass('bg-success text-white').addClass('bg-light text-muted')
            .text('GPS Belum Aktif');
        $('#jarakMeter').removeClass('text-success text-danger').addClass('text-muted').text('-');
        $('#textKoordinat').html('Koordinat Anda: <code>Belum terdeteksi</code>');

        if (map) {
            if (officeMarker) {
                officeMarker.setLatLng([activeKantor.lat, activeKantor.long]);
            } else {
                officeMarker = L.marker([activeKantor.lat, activeKantor.long]).addTo(map);
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
        }
    }

    $('#selectLokasiKantor').on('change', function() {
        selectOffice($(this).val());
    });

    function detectLocation() {
        return new Promise(function(resolve, reject) {
            if (!navigator.geolocation) {
                reject(new Error('Browser/perangkat tidak mendukung geolokasi.'));
                return;
            }
            navigator.geolocation.getCurrentPosition(function(position) {
                updateUserPosition(position.coords.latitude, position.coords.longitude);
                resolve(position.coords);
            }, function(error) {
                var message = 'Tidak dapat memperoleh lokasi perangkat.';
                if (error.code === error.PERMISSION_DENIED) {
                    message = 'Akses lokasi ditolak. Izinkan akses lokasi pada browser untuk melakukan presensi.';
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    message = 'Lokasi perangkat tidak tersedia. Periksa GPS dan coba lagi.';
                } else if (error.code === error.TIMEOUT) {
                    message = 'Waktu deteksi lokasi habis. Silakan coba lagi.';
                }
                reject(new Error(message));
            }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
        });
    }

    $('#btnCekLokasi').on('click', function() {
        if (!activeKantor) {
            Swal.fire('Pilih Kantor', 'Pilih lokasi kantor penempatan terlebih dahulu.', 'warning');
            return;
        }
        var $button = $(this);
        $button.prop('disabled', true);
        detectLocation().then(function() {
            Swal.fire({
                icon: isWithinRadius ? 'success' : 'warning',
                title: isWithinRadius ? 'Lokasi Terdeteksi' : 'Posisi di Luar Radius',
                text: 'Jarak ke kantor ' + jarakUserSekarang + ' meter. Batas ' + activeKantor.radius + ' meter.'
            });
        }).catch(function(error) {
            showError(error, 'Lokasi tidak tersedia');
        }).then(function() {
            $button.prop('disabled', false);
        });
    });

    $('#btnNyalakanKamera').on('click', function() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            Swal.fire('Kamera Tidak Tersedia', 'Browser tidak mendukung akses kamera. Anda dapat memilih foto asli melalui input file.', 'warning');
            return;
        }
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
            .then(function(cameraStream) {
                stopCamera();
                stream = cameraStream;
                $video[0].srcObject = stream;
                $video.show();
                $snapshot.hide();
                $('#statusKameraText').text('Kamera Aktif').removeClass('text-muted').addClass('text-success fw-bold');
                $('#btnAmbilFoto').prop('disabled', false).show();
                $('#btnNyalakanKamera').hide();
                $('#btnUlangiFoto').hide();
            }).catch(function(error) {
                Swal.fire('Kamera Tidak Tersedia', 'Akses kamera gagal: ' + error.message, 'warning');
            });
    });

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(function(track) { track.stop(); });
            stream = null;
        }
    }

    $('#btnAmbilFoto').on('click', function() {
        var video = $video[0];
        var canvas = $canvas[0];
        if (!video || !video.videoWidth) {
            Swal.fire('Kamera Belum Siap', 'Aktifkan kamera dan tunggu sampai gambar tampil sebelum mengambil foto.', 'warning');
            return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function(blob) {
            if (!blob) {
                Swal.fire('Foto Gagal', 'Browser tidak dapat memproses foto. Silakan ambil ulang.', 'error');
                return;
            }
            fotoSelfie = new File([blob], 'selfie-' + Date.now() + '.jpg', { type: 'image/jpeg' });
            $snapshot.attr('src', URL.createObjectURL(fotoSelfie)).show();
            $video.hide();
            stopCamera();
            $('#btnAmbilFoto').prop('disabled', true).hide();
            $('#btnUlangiFoto').show();
            $('#statusKameraText').text('Foto Berhasil Diambil').removeClass('text-muted').addClass('text-primary fw-bold');
        }, 'image/jpeg', 0.9);
    });

    $('#btnUlangiFoto').on('click', function() {
        fotoSelfie = null;
        $('#fallbackFotoInput').val('');
        $snapshot.hide().attr('src', '');
        $('#btnNyalakanKamera').show().trigger('click');
    });

    $('#fallbackFotoInput').on('change', function() {
        var file = this.files && this.files[0];
        if (!file) return;
        if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
            this.value = '';
            Swal.fire('Format Tidak Valid', 'Pilih foto berformat JPG, PNG, atau WEBP.', 'warning');
            return;
        }
        fotoSelfie = file;
        $snapshot.attr('src', URL.createObjectURL(file)).show();
        $video.hide();
        stopCamera();
        $('#statusKameraText').text('Foto Diunggah').removeClass('text-muted').addClass('text-primary fw-bold');
        $('#btnAmbilFoto').hide();
        $('#btnNyalakanKamera').hide();
        $('#btnUlangiFoto').show();
    });

    function responseData(payload, expectedKeys) {
        var data = window.apiResponseData(payload);
        for (var depth = 0; depth < 3 && data && typeof data === 'object'; depth++) {
            var hasExpectedKey = expectedKeys.some(function(key) {
                return Object.prototype.hasOwnProperty.call(data, key);
            });
            if (hasExpectedKey || !data.data || typeof data.data !== 'object') break;
            data = data.data;
        }
        return data;
    }

    function updateTodayStatus(today) {
        if (!today || typeof today.has_checked_in === 'undefined') {
            throw new Error('Format status presensi hari ini dari server tidak valid.');
        }
        hasCheckedInToday = today.has_checked_in === true || today.has_checked_in === 1 ||
            String(today.has_checked_in).toLowerCase() === 'true';
        currentCheckIn = today.check_in || null;
        currentCheckOut = today.check_out || null;
        attendanceLoaded = true;

        var checkInStatus = String(currentCheckIn && currentCheckIn.status_verifikasi || 'pending').toLowerCase();
        $('#badgeStatusHariIni')
            .removeClass('bg-secondary bg-success bg-warning bg-danger text-dark')
            .addClass(!hasCheckedInToday ? 'bg-secondary' :
                checkInStatus === 'approved' ? 'bg-success' :
                    checkInStatus === 'rejected' ? 'bg-danger' : 'bg-warning text-dark')
            .text(!hasCheckedInToday
                ? 'Belum Check-in'
                : checkInStatus === 'pending'
                    ? 'Masuk Tercatat · Menunggu Verifikasi'
                    : 'Masuk Tercatat · ' + checkInStatus);
        $('#btnCheckIn').prop('disabled', hasCheckedInToday);
        $('#btnCheckOut').prop('disabled', !hasCheckedInToday || Boolean(currentCheckOut));
    }

    function refreshAttendanceState() {
        return Promise.all([
            window.apiRequest('/absensi/today'),
            window.apiRequest('/riwayat')
        ]).then(function(responses) {
            var today = responseData(responses[0], ['has_checked_in', 'check_in', 'check_out']);
            var historyData = responseData(responses[1], ['riwayat_absensi', 'riwayat_logbook', 'riwayat_izin']);
            if (!historyData || !Array.isArray(historyData.riwayat_absensi)) {
                throw new Error('Format data riwayat presensi dari server tidak valid.');
            }
            updateTodayStatus(today);
            renderAttendanceHistory(historyData.riwayat_absensi);
        });
    }

    function renderAttendanceHistory(rows) {
        var html = rows.map(function(item) {
            var dateValue = item.tanggal_jam || '';
            var formattedDateTime = window.apiFormatDateTime(dateValue);
            var foto = item.foto_selfie_url || item.foto_selfie || '';
            var photoUrl = fileUrl(foto);
            var photoCell = photoUrl
                ? '<a href="' + escapeHtml(photoUrl) + '" target="_blank" rel="noopener">Lihat foto</a>'
                : '-';
            var coordinates = item.latitude != null && item.longitude != null
                ? item.latitude + ', ' + item.longitude : '-';
            return '<tr><td>' + escapeHtml(formattedDateTime.dateLabel + ' ' + formattedDateTime.time) + '</td><td>' +
                escapeHtml(item.status || '-') + '</td><td>' + escapeHtml(item.lokasi || '-') + '</td><td>' +
                escapeHtml(coordinates) + '</td><td>' + photoCell + '</td><td>' +
                escapeHtml(item.status_verifikasi || 'pending') + '</td><td>' +
                escapeHtml(item.keterangan || '-') + '</td></tr>';
        }).join('');
        $('#tabelRiwayatSingkat tbody').html(html ||
            '<tr><td colspan="7" class="text-center py-4 text-muted">Belum ada riwayat presensi.</td></tr>');
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    function fileUrl(path) {
        if (!path) return '';
        try {
            var url = /^https?:/i.test(path)
                ? new URL(path)
                : new URL(String(path).replace(/^\//, ''), new URL(apiUrl('/')).origin + '/');
            return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
        } catch (error) {
            return '';
        }
    }

    function submitAttendance(endpoint, actionLabel) {
        if (!attendanceLoaded) {
            Swal.fire('Status Belum Tersedia', 'Tunggu sampai status presensi hari ini berhasil dimuat.', 'warning');
            return;
        }
        if ((endpoint === '/check-in' && hasCheckedInToday) ||
            (endpoint === '/check-out' && (!hasCheckedInToday || currentCheckOut))) {
            Swal.fire('Aksi Presensi Tidak Tersedia', 'Status presensi hari ini sudah berubah. Muat ulang data sebelum mencoba lagi.', 'warning');
            return;
        }
        if (!activeKantor) {
            Swal.fire('Pilih Kantor', 'Pilih lokasi kantor penempatan terlebih dahulu.', 'warning');
            return;
        }
        if (!fotoSelfie) {
            Swal.fire('Foto Selfie Diperlukan', 'Ambil foto menggunakan kamera atau pilih foto asli sebelum presensi.', 'warning');
            return;
        }

        var keterangan = String($('#keterangan').val() || '').trim();
        var $button = endpoint === '/check-in' ? $('#btnCheckIn') : $('#btnCheckOut');
        var originalHtml = $button.html();
        $button.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-1"></i>Mengirim...');

        detectLocation().then(function(coords) {
            if (!isWithinRadius) {
                throw new Error('Posisi di luar radius kantor (' + jarakUserSekarang + ' m; batas ' + activeKantor.radius + ' m).');
            }
            var formData = new FormData();
            formData.append('status', endpoint === '/check-in' ? 'masuk' : 'keluar');
            formData.append('latitude', coords.latitude);
            formData.append('longitude', coords.longitude);
            formData.append('lokasi', activeKantor.nama);
            formData.append('foto_selfie', fotoSelfie, fotoSelfie.name);
            if (keterangan) formData.append('keterangan', keterangan);
            var token = localStorage.getItem('token') || localStorage.getItem('siamag_token') || '';
            return fetch(apiUrl(endpoint), {
                method: 'POST',
                body: formData,
                headers: {
                    Accept: 'application/json',
                    Authorization: 'Bearer ' + token
                }
            }).then(parseResponse);
        }).then(function(payload) {
            fotoSelfie = null;
            $('#keterangan').val('');
            $('#fallbackFotoInput').val('');
            $snapshot.hide().attr('src', '');
            $('#statusKameraText').text('Foto belum diambil').removeClass('text-success text-primary fw-bold').addClass('text-muted');
            $('#btnNyalakanKamera').show();
            $('#btnAmbilFoto').prop('disabled', true).show();
            $('#btnUlangiFoto').hide();
            return refreshAttendanceState().then(function() {
                Swal.fire({
                    icon: 'success',
                    title: 'Presensi Berhasil',
                    text: responseMessage(payload, actionLabel + ' berhasil dicatat.')
                });
            }, function(refreshError) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Presensi Tersimpan, Data Belum Diperbarui',
                    text: responseMessage(payload, actionLabel + ' berhasil dicatat.') + ' ' + refreshError.message
                });
            });
        }).catch(function(error) {
            showError(error, 'Presensi ditolak');
        }).then(function() {
            $button.prop('disabled', false).html(originalHtml);
        });
    }

    $('#btnCheckIn').on('click', function() {
        submitAttendance('/check-in', 'Check-in');
    });

    $('#btnCheckOut').on('click', function() {
        submitAttendance('/check-out', 'Check-out');
    });

    $(window).on('beforeunload', stopCamera);
    $('#btnCheckIn, #btnCheckOut').prop('disabled', true);
    $('#badgeStatusHariIni').text('Memuat status presensi...');
    $('#tabelRiwayatSingkat tbody').html(
        '<tr><td colspan="7" class="text-center py-4 text-muted">Memuat riwayat presensi...</td></tr>');
    refreshAttendanceState().catch(function(error) {
        $('#badgeStatusHariIni').removeClass('bg-secondary bg-success bg-warning').addClass('bg-danger')
            .text('Status Gagal Dimuat');
        $('#tabelRiwayatSingkat tbody').html(
            '<tr><td colspan="7" class="text-center text-danger py-4">' + escapeHtml(error.message) + '</td></tr>');
        Swal.fire('Data Presensi Gagal Dimuat', error.message, 'error');
    });
});
