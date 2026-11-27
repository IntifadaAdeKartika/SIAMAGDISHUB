/* peserta-absensi.js
   Presensi peserta dengan geolocation, kamera perangkat, dan alur revisi.
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
    var perbaikanParamHandled = false;
    var revisiParamHandled = false;
    var activeRevisions = [];
    var waitingRevisions = [];
    var revisionGroups = [];
    var revisionMode = { checkIn: null, checkOut: null };
    var revisionSelected = { masuk: null, keluar: null };
    var revisionLoadError = null;
    var revisionSubmitActive = false;
    var $video = $('#webcamVideo');
    var $canvas = $('#snapshotCanvas');
    var $snapshot = $('#snapshotImg');

    function apiUrl(path) {
        if (typeof window.apiUrl === 'function') return window.apiUrl(path);
        var base = (window.API_BASE || 'https://siamagdishub-backend.vercel.app/backend-api/').replace(/\/+$/, '');
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

    function statusOf(record) {
        return String(record && record.status_verifikasi || '').toLowerCase();
    }

    function recordRejected(record) {
        return Boolean(record) && statusOf(record) === 'rejected';
    }

    function revisionPartLabel(rowStatus) {
        return rowStatus === 'keluar' ? 'Check-out' : 'Check-in';
    }

    function revisionLastEntry(row) {
        var list = row && Array.isArray(row.riwayat_revisi) ? row.riwayat_revisi : [];
        return list.length ? list[list.length - 1] : null;
    }

    function revisionRepaired(row) {
        var last = revisionLastEntry(row);
        return Boolean(last) && last.status === 'siap_dikirim';
    }

    function revisionTimestamp(value) {
        if (!value) return '-';
        return window.apiFormatDateTime(value).full;
    }

    function revisionTimeLabel(row) {
        var formatted = window.apiFormatDateTime(row && row.tanggal_jam);
        return formatted.dateLabel + ' ' + formatted.time;
    }

    function revisionDateKey(row) {
        return window.apiFormatDateTime(row && row.tanggal_jam).date;
    }

    function isTodayValue(value) {
        var formatted = window.apiFormatDateTime(value).date;
        var now = new Date();
        var today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
        return formatted === today;
    }

    function selectedRevisionRow(target) {
        var key = target === 'keluar' ? 'keluar' : 'masuk';
        var rows = activeRevisions.filter(function(row) { return String(row.status) === target; });
        if (!rows.length) return null;
        var selectedId = revisionSelected[key];
        var selected = rows.find(function(row) { return String(row.id) === String(selectedId); });
        return selected || rows[0];
    }

    function setAttendanceButtonLabels(checkInRejected, checkOutRejected) {
        var revIn = revisionMode.checkIn;
        var revOut = revisionMode.checkOut;
        $('#btnCheckIn').html(revIn
            ? '<i class="fas fa-sync-alt me-1"></i> Check-in Ulang'
            : checkInRejected
                ? '<i class="fas fa-sync-alt me-1"></i> Perbaiki Check-in'
                : '<i class="fas fa-sign-in-alt me-1"></i> Check-in Masuk');
        $('#btnCheckOut').html(revOut
            ? '<i class="fas fa-sync-alt me-1"></i> Check-out Ulang'
            : checkOutRejected
                ? '<i class="fas fa-sync-alt me-1"></i> Perbaiki Check-out'
                : '<i class="fas fa-sign-out-alt me-1"></i> Check-out Pulang');
    }

    function syncAttendanceControls() {
        var checkInRejected = recordRejected(currentCheckIn);
        var checkOutRejected = recordRejected(currentCheckOut);
        setAttendanceButtonLabels(checkInRejected, checkOutRejected);
        $('#btnCheckIn').prop('disabled', !attendanceLoaded ||
            !(revisionMode.checkIn || checkInRejected || !hasCheckedInToday));
        $('#btnCheckOut').prop('disabled', !attendanceLoaded ||
            !(revisionMode.checkOut || checkOutRejected || (hasCheckedInToday && !currentCheckOut)));
    }

    function loadRevisionRows() {
        return window.apiRequestAll('/absensi/revisi?per_page=100', ['absensi']).then(function(rows) {
            var list = Array.isArray(rows) ? rows.slice() : [];
            list.sort(function(a, b) {
                return new Date(b.tanggal_jam || 0) - new Date(a.tanggal_jam || 0);
            });
            activeRevisions = list.filter(function(row) {
                return statusOf(row) === 'pending' && row.revisi_diminta;
            });
            waitingRevisions = list.filter(function(row) {
                return statusOf(row) === 'pending' && !row.revisi_diminta && Boolean(row.revisi_dikirim_pada);
            });
            revisionMode.checkIn = activeRevisions.filter(function(row) { return row.status === 'masuk'; })[0] || null;
            revisionMode.checkOut = activeRevisions.filter(function(row) { return row.status === 'keluar'; })[0] || null;
            ['masuk', 'keluar'].forEach(function(target) {
                var id = revisionSelected[target];
                if (id && !activeRevisions.some(function(row) {
                    return String(row.status) === target && String(row.id) === String(id);
                })) {
                    revisionSelected[target] = null;
                }
            });
            revisionGroups = [];
            activeRevisions.forEach(function(row) {
                var key = revisionDateKey(row);
                var group = revisionGroups.find(function(item) { return item.key === key; });
                if (!group) {
                    group = { key: key, label: revisionTimeLabel(row), rows: [], checkIn: null, checkOut: null };
                    revisionGroups.push(group);
                }
                group.rows.push(row);
                if (row.status === 'masuk') group.checkIn = row;
                if (row.status === 'keluar') group.checkOut = row;
            });
            revisionGroups.sort(function(a, b) { return a.key < b.key ? 1 : (a.key > b.key ? -1 : 0); });
            revisionLoadError = null;
            return list;
        }).catch(function(error) {
            revisionLoadError = error;
            activeRevisions = [];
            waitingRevisions = [];
            revisionGroups = [];
            revisionMode.checkIn = null;
            revisionMode.checkOut = null;
            return [];
        });
    }

    function renderPerbaikanNotice() {
        var items = [];
        if (recordRejected(currentCheckIn)) {
            items.push({ target: 'masuk', label: 'Check-in', record: currentCheckIn });
        }
        if (recordRejected(currentCheckOut)) {
            items.push({ target: 'keluar', label: 'Check-out', record: currentCheckOut });
        }

        var $container = $('#boxPerbaikanPresensi');
        if (!items.length) {
            $container.remove();
            return;
        }

        if (!$container.length) {
            $container = $('<div id="boxPerbaikanPresensi" class="mb-3"></div>');
            $('.attendance-layout').first().before($container);
        }

        $container.html(items.map(function(item) {
            var alasan = item.record.alasan_penolakan
                ? escapeHtml(item.record.alasan_penolakan)
                : '-';
            return '<div class="alert alert-danger d-flex flex-wrap align-items-center gap-2 mb-2" role="alert">' +
                '<i class="fas fa-exclamation-triangle"></i>' +
                '<div class="flex-grow-1 small">' +
                    '<strong>Presensi ' + item.label + ' Ditolak.</strong> ' +
                    'Silakan perbaiki presensi sesuai keterangan berikut.' +
                    '<div><em>Alasan penolakan: ' + alasan + '</em></div>' +
                '</div>' +
                '<button type="button" class="btn btn-sm btn-danger btn-perbaiki-presensi" data-target="' + item.target + '">' +
                    '<i class="fas fa-sync-alt me-1"></i> Perbaiki Presensi' +
                '</button>' +
            '</div>';
        }).join(''));
    }

    function renderRevisiNotice() {
        var html = '';

        if (revisionLoadError) {
            html += '<div class="alert alert-warning py-2 small mb-2">' +
                '<i class="fas fa-triangle-exclamation me-1"></i>Data permintaan revisi gagal dimuat. ' +
                '<button type="button" class="btn btn-sm btn-outline-warning py-0 ms-2" id="btnRetryRevisi">Coba lagi</button>' +
                '</div>';
        }

        revisionGroups.forEach(function(group, groupIndex) {
            var rowsHtml = group.rows.map(function(row) {
                var last = revisionLastEntry(row);
                var catatan = (last && last.catatan) || row.catatan_pembimbing || '-';
                var pembimbing = (last && last.pembimbing_nama) || 'Pembimbing';
                var diminta = (last && last.diminta_pada) || row.revisi_diminta_pada;
                var repaired = revisionRepaired(row);
                var target = row.status === 'keluar' ? 'keluar' : 'masuk';
                return '<div class="border rounded p-2 mb-2 bg-white" data-revisi-id="' + escapeHtml(row.id) + '">' +
                    '<div class="d-flex justify-content-between align-items-center flex-wrap gap-1">' +
                        '<div class="small fw-semibold">' + revisionPartLabel(row.status) + '</div>' +
                        '<span class="badge ' + (repaired ? 'badge-approved' : 'badge-revisi') + '">' +
                            (repaired ? '<i class="fas fa-check me-1"></i>Sudah diperbaiki' : '<i class="fas fa-rotate-left me-1"></i>Perlu diperbaiki') +
                        '</span>' +
                    '</div>' +
                    '<div class="small mt-1">Catatan pembimbing: <em>' + escapeHtml(catatan) + '</em></div>' +
                    '<div class="small text-muted">Diminta oleh ' + escapeHtml(pembimbing) + ' · ' +
                        escapeHtml(revisionTimestamp(diminta)) + '</div>' +
                    '<div class="mt-2">' +
                        '<button type="button" class="btn btn-sm btn-warning btn-revisi-presensi" data-target="' + target +
                            '" data-id="' + escapeHtml(row.id) + '">' +
                            '<i class="fas fa-sync-alt me-1"></i> ' + (row.status === 'keluar' ? 'Check-out Ulang' : 'Check-in Ulang') +
                        '</button>' +
                    '</div>' +
                    '</div>';
            }).join('');

            var belum = group.rows.filter(function(row) { return !revisionRepaired(row); });
            var canSubmit = belum.length === 0 && !revisionSubmitActive;
            var hint = canSubmit
                ? 'Semua bagian yang diminta sudah diperbaiki. Kirim hasil revisi untuk diverifikasi pembimbing.'
                : 'Lakukan ' + belum.map(function(row) {
                    return revisionPartLabel(row.status).toLowerCase() + ' ulang';
                }).join(' dan ') + ' terlebih dahulu, lalu kirim hasil revisi.';

            html += '<div class="card border-warning mb-2" data-revisi-group="' + groupIndex + '">' +
                '<div class="card-body p-3">' +
                    '<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">' +
                        '<div class="fw-semibold"><i class="fas fa-rotate-left me-1"></i>Presensi Perlu Direvisi</div>' +
                        '<span class="badge badge-revisi">Revisi Diminta</span>' +
                    '</div>' +
                    '<div class="small mb-2">Tanggal presensi: <strong>' + escapeHtml(group.label) + '</strong></div>' +
                    rowsHtml +
                    '<div class="d-flex justify-content-end mt-2">' +
                        '<button type="button" class="btn btn-sm btn-primary btn-kirim-hasil-revisi" data-group="' + groupIndex + '"' +
                            (canSubmit ? '' : ' disabled') + '>' +
                            '<i class="fas fa-paper-plane me-1"></i> Kirim Hasil Revisi' +
                        '</button>' +
                    '</div>' +
                    '<div class="small text-muted mt-1 text-end">' + escapeHtml(hint) + '</div>' +
                '</div>' +
            '</div>';
        });

        waitingRevisions.forEach(function(row) {
            var last = revisionLastEntry(row);
            var catatan = (last && last.catatan) || row.catatan_pembimbing || '';
            html += '<div class="alert alert-info py-2 small mb-2" data-revisi-id="' + escapeHtml(row.id) + '">' +
                '<div class="d-flex justify-content-between align-items-center flex-wrap gap-1">' +
                    '<div><i class="fas fa-paper-plane me-1"></i><strong>Hasil revisi ' + revisionPartLabel(row.status) + '</strong> ' +
                        escapeHtml(revisionTimeLabel(row)) + ' sudah dikirim.</div>' +
                    '<span class="badge badge-pending">Menunggu Verifikasi Pembimbing</span>' +
                '</div>' +
                '<div class="text-muted mt-1">Dikirim: ' + escapeHtml(revisionTimestamp(row.revisi_dikirim_pada)) + '</div>' +
                (catatan ? '<div class="mt-1">Catatan pembimbing: <em>' + escapeHtml(catatan) + '</em></div>' : '') +
                '</div>';
        });

        var $container = $('#boxRevisiPresensi');
        if (!html) {
            $container.remove();
            return;
        }
        if (!$container.length) {
            $container = $('<div id="boxRevisiPresensi" class="mb-3"></div>');
            $('.attendance-layout').first().before($container);
        }
        $container.html(html);
    }

    function fokuskanFormPerbaikan(target) {
        var $button = target === 'keluar' ? $('#btnCheckOut') : $('#btnCheckIn');
        var form = document.querySelector('.attendance-layout');
        if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.setTimeout(function() {
            $button.trigger('focus').css('box-shadow', '0 0 0 .25rem rgba(220,53,69,.35)');
            window.setTimeout(function() {
                $button.css('box-shadow', '');
            }, 2500);
        }, 350);
    }

    function handlePerbaikanParam() {
        if (perbaikanParamHandled) return;
        var id = new URLSearchParams(window.location.search).get('perbaikan');
        if (!id) return;
        perbaikanParamHandled = true;
        if (window.history && typeof window.history.replaceState === 'function') {
            window.history.replaceState(null, '', window.location.pathname);
        }

        if (currentCheckIn && String(currentCheckIn.id) === String(id) && recordRejected(currentCheckIn)) {
            fokuskanFormPerbaikan('masuk');
            return;
        }
        if (currentCheckOut && String(currentCheckOut.id) === String(id) && recordRejected(currentCheckOut)) {
            fokuskanFormPerbaikan('keluar');
            return;
        }

        Swal.fire({
            icon: 'info',
            title: 'Presensi Tidak Dapat Diperbaiki',
            text: 'Presensi pada notifikasi tersebut sudah diperbaiki atau tidak tersedia untuk hari ini.',
            confirmButtonText: 'Tutup'
        });
    }

    function handleRevisiParam() {
        if (revisiParamHandled) return;
        var id = new URLSearchParams(window.location.search).get('revisi');
        if (!id) return;
        revisiParamHandled = true;
        if (window.history && typeof window.history.replaceState === 'function') {
            try {
                var url = new URL(window.location.href);
                url.searchParams.delete('revisi');
                window.history.replaceState(null, '', url.pathname + (url.search ? url.search : '') + url.hash);
            } catch (error) {
                window.history.replaceState(null, '', window.location.pathname);
            }
        }

        var $target = $('#boxRevisiPresensi [data-revisi-id]').filter(function() {
            return String($(this).data('revisi-id')) === String(id);
        });
        if (!$target.length) {
            if (revisionLoadError) return;
            Swal.fire({
                icon: 'info',
                title: 'Revisi Tidak Dapat Dikerjakan',
                text: 'Permintaan revisi pada notifikasi tersebut sudah dikirim atau tidak lagi aktif.',
                confirmButtonText: 'Tutup'
            });
            return;
        }

        $target[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        $target.addClass('shadow-sm border-warning');
        window.setTimeout(function() { $target.removeClass('shadow-sm'); }, 4000);
        var row = activeRevisions.concat(waitingRevisions).find(function(item) {
            return String(item.id) === String(id);
        });
        if (row && row.revisi_diminta) {
            revisionSelected[row.status === 'keluar' ? 'keluar' : 'masuk'] = row.id;
            syncAttendanceControls();
            fokuskanFormPerbaikan(row.status === 'keluar' ? 'keluar' : 'masuk');
        }
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

        var checkInStatus = statusOf(currentCheckIn) || 'pending';
        var checkInRejected = recordRejected(currentCheckIn);
        var checkOutRejected = recordRejected(currentCheckOut);
        var revTodayIn = revisionMode.checkIn && isTodayValue(revisionMode.checkIn.tanggal_jam);
        var revTodayOut = revisionMode.checkOut && isTodayValue(revisionMode.checkOut.tanggal_jam);
        var waitingToday = waitingRevisions.some(function(row) { return isTodayValue(row.tanggal_jam); });

        $('#badgeStatusHariIni')
            .removeClass('bg-secondary bg-success bg-warning bg-danger bg-info text-dark')
            .addClass(!hasCheckedInToday && !revTodayIn ? 'bg-secondary' :
                revTodayOut || revTodayIn ? 'bg-warning text-dark' :
                checkOutRejected || checkInRejected ? 'bg-danger' :
                checkInStatus === 'approved' ? 'bg-success' :
                    waitingToday && checkInStatus === 'pending' ? 'bg-info text-dark' :
                        checkInStatus === 'rejected' ? 'bg-danger' : 'bg-warning text-dark')
            .text(!hasCheckedInToday && !revTodayIn
                ? 'Belum Check-in'
                : revTodayOut || revTodayIn
                    ? 'Presensi Hari Ini Perlu Direvisi'
                    : checkOutRejected
                        ? 'Check-out Ditolak · Perlu Perbaikan'
                        : checkInRejected
                            ? 'Check-in Ditolak · Perlu Perbaikan'
                            : waitingToday && checkInStatus === 'pending'
                                ? 'Revisi Terkirim · Menunggu Verifikasi'
                                : checkInStatus === 'pending'
                                    ? 'Masuk Tercatat · Menunggu Verifikasi'
                                    : 'Masuk Tercatat · ' + checkInStatus);

        syncAttendanceControls();
        renderPerbaikanNotice();
        renderRevisiNotice();
        handlePerbaikanParam();
        handleRevisiParam();
    }

    $(document).on('click', '.btn-perbaiki-presensi', function() {
        fokuskanFormPerbaikan(String($(this).data('target')));
    });

    $(document).on('click', '.btn-revisi-presensi', function() {
        var target = String($(this).data('target'));
        revisionSelected[target] = $(this).data('id');
        syncAttendanceControls();
        fokuskanFormPerbaikan(target);
    });

    $(document).on('click', '#btnRetryRevisi', function() {
        refreshAttendanceState().catch(function(error) {
            showError(error, 'Data Revisi Gagal Dimuat');
        });
    });

    function kirimHasilRevisi(groupIndex) {
        var group = revisionGroups[Number(groupIndex)];
        if (!group || revisionSubmitActive) return;
        var belum = group.rows.filter(function(row) { return !revisionRepaired(row); });
        if (belum.length) {
            Swal.fire('Perbaikan Belum Lengkap',
                'Selesaikan ' + belum.map(function(row) { return revisionPartLabel(row.status).toLowerCase(); }).join(' dan ') +
                ' ulang terlebih dahulu.', 'warning');
            return;
        }

        var labels = group.rows.map(function(row) { return revisionPartLabel(row.status); }).join(' dan ');
        Swal.fire({
            title: 'Kirim Hasil Revisi?',
            html: '<p class="small mb-2">Hasil revisi <strong>' + escapeHtml(labels) + '</strong> tanggal <strong>' +
                escapeHtml(group.label) + '</strong> akan dikirim ke pembimbing.</p>' +
                '<p class="small text-muted mb-0">Setelah dikirim, status presensi menjadi menunggu verifikasi pembimbing.</p>',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Kirim Hasil Revisi',
            cancelButtonText: 'Batal'
        }).then(function(result) {
            if (!result.isConfirmed) return;
            revisionSubmitActive = true;
            renderRevisiNotice();
            var anchorId = group.rows[0].id;
            return window.apiRequest('/absensi/revisi/' + encodeURIComponent(anchorId) + '/kirim', {
                method: 'POST'
            }).then(function(payload) {
                return refreshAttendanceState().then(function() {
                    Swal.fire({
                        icon: 'success',
                        title: 'Hasil Revisi Terkirim',
                        text: responseMessage(payload, 'Hasil revisi berhasil dikirim dan menunggu verifikasi pembimbing.')
                    });
                }, function(refreshError) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Revisi Terkirim, Data Belum Diperbarui',
                        text: responseMessage(payload, 'Hasil revisi berhasil dikirim.') + ' ' + refreshError.message
                    });
                });
            }).catch(function(error) {
                showError(error, 'Gagal Mengirim Hasil Revisi');
            }).then(function() {
                revisionSubmitActive = false;
                renderRevisiNotice();
            });
        });
    }

    $(document).on('click', '.btn-kirim-hasil-revisi', function() {
        kirimHasilRevisi($(this).data('group'));
    });

    function refreshAttendanceState() {
        return Promise.all([
            window.apiRequest('/absensi/today'),
            window.apiRequest('/riwayat'),
            loadRevisionRows()
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
            var foto = item.foto_selfie_url || item.url_foto_selfie || item.foto_selfie || item.foto || '';
            var photoUrl = fileUrl(foto);
            var photoCell = photoUrl
                ? '<a href="' + escapeHtml(photoUrl) + '" target="_blank" rel="noopener noreferrer" class="link-lihat-foto text-primary text-decoration-underline fw-medium">Lihat foto</a>'
                : '-';
            var coordinates = item.latitude != null && item.longitude != null
                ? item.latitude + ', ' + item.longitude : '-';
            var statusVerif = String(item.status_verifikasi || 'pending').toLowerCase();
            var statusCell = escapeHtml(statusVerif);
            if (statusVerif === 'rejected' && item.alasan_penolakan) {
                statusCell += '<div class="small text-danger mt-1">' + escapeHtml(item.alasan_penolakan) + '</div>';
            }
            if (Number(item.jumlah_resubmit || 0) > 0) {
                statusCell += '<div class="small text-muted">Perbaikan ke-' + escapeHtml(item.jumlah_resubmit) + '</div>';
            }
            if (item.revisi_diminta) {
                statusCell += '<div class="small text-warning-emphasis">Revisi diminta pembimbing</div>';
            } else if (statusVerif === 'pending' && item.revisi_dikirim_pada) {
                statusCell += '<div class="small text-info-emphasis">Menunggu verifikasi revisi</div>';
            }
            return '<tr><td>' + escapeHtml(formattedDateTime.dateLabel + ' ' + formattedDateTime.time) + '</td><td>' +
                escapeHtml(item.status || '-') + '</td><td>' + escapeHtml(item.lokasi || '-') + '</td><td>' +
                escapeHtml(coordinates) + '</td><td>' + photoCell + '</td><td>' +
                statusCell + '</td><td>' +
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
        if (typeof path === 'string') {
            var trimmed = path.trim();
            if (/^data:image\//i.test(trimmed) || /^blob:/i.test(trimmed)) {
                return trimmed;
            }
        }
        try {
            var url = /^https?:/i.test(path)
                ? new URL(path)
                : new URL(String(path).replace(/^\//, ''), new URL(apiUrl('/')).origin + '/');
            return (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'data:' || url.protocol === 'blob:')
                ? url.href
                : '';
        } catch (error) {
            return typeof path === 'string' && /^data:image\//i.test(path.trim()) ? path.trim() : '';
        }
    }

    function submitAttendance(endpoint, actionLabel) {
        if (!attendanceLoaded) {
            Swal.fire('Status Belum Tersedia', 'Tunggu sampai status presensi hari ini berhasil dimuat.', 'warning');
            return;
        }

        var target = endpoint === '/check-in' ? 'masuk' : 'keluar';
        var rejected = target === 'masuk' ? recordRejected(currentCheckIn) : recordRejected(currentCheckOut);
        var revisionRecord = rejected ? null : selectedRevisionRow(target);
        var isRevision = Boolean(revisionRecord);
        var repairing = !isRevision && rejected;

        if (!isRevision && !repairing && endpoint === '/check-in' && hasCheckedInToday) {
            Swal.fire('Aksi Presensi Tidak Tersedia', 'Status presensi hari ini sudah berubah. Muat ulang data sebelum mencoba lagi.', 'warning');
            return;
        }
        if (!isRevision && !repairing && endpoint === '/check-out' && (!hasCheckedInToday || currentCheckOut)) {
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

        var repairRecord = target === 'masuk' ? currentCheckIn : currentCheckOut;
        var requestUrl = repairing
            ? apiUrl('/absensi/' + encodeURIComponent(repairRecord.id) + '/perbaikan')
            : apiUrl(endpoint);
        var keterangan = String($('#keterangan').val() || '').trim();
        var $button = target === 'masuk' ? $('#btnCheckIn') : $('#btnCheckOut');
        $button.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-1"></i>Mengirim...');

        detectLocation().then(function(coords) {
            if (!isWithinRadius) {
                throw new Error('Posisi di luar radius kantor (' + jarakUserSekarang + ' m; batas ' + activeKantor.radius + ' m).');
            }
            var formData = new FormData();
            formData.append('status', target);
            formData.append('latitude', coords.latitude);
            formData.append('longitude', coords.longitude);
            formData.append('lokasi', activeKantor.nama);
            formData.append('foto_selfie', fotoSelfie, fotoSelfie.name);
            if (keterangan) formData.append('keterangan', keterangan);
            if (isRevision) formData.append('id_absensi', revisionRecord.id);
            var token = localStorage.getItem('token') || localStorage.getItem('siamag_token') || '';
            return fetch(requestUrl, {
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
                    title: isRevision
                        ? (target === 'masuk' ? 'Check-in Ulang Tersimpan' : 'Check-out Ulang Tersimpan')
                        : repairing ? 'Perbaikan Presensi Terkirim' : 'Presensi Berhasil',
                    text: responseMessage(payload, isRevision
                        ? 'Perbaikan tersimpan. Silakan kirim hasil revisi untuk diverifikasi pembimbing.'
                        : repairing
                            ? 'Perbaikan presensi berhasil dikirim dan menunggu verifikasi pembimbing.'
                            : actionLabel + ' berhasil dicatat.')
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
            syncAttendanceControls();
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

    // Handler foto dipusatkan di app.js — blok duplikat dihapus.