$(document).ready(function() {
    var user = null;
    try { user = JSON.parse(localStorage.getItem('user') || localStorage.getItem('siamag_user') || 'null'); } catch (error) {}
    var p = user && (user.peserta_magang || user.peserta || user.profile || {});
    var name = user && (user.nama_lengkap || p.nama_lengkap || user.nama || p.nama || user.name || p.name) ||
        'Pengguna';
    var initialMatch = String(name).match(/[a-zA-Z]/);
    var initial = initialMatch ? initialMatch[0].toUpperCase() : 'P';
    $('#userName, #greetingName').text(name);
    $('#userInitial').text(initial);
    $('#participantUnit').text(user && (user.nama_unit_kerja || user.unit_kerja || user.unit || p.nama_unit_kerja || (p.unit_kerja && p.unit_kerja.nama_unit)) || '');
    var peserta = user && user.peserta_magang;
    var unit = peserta && peserta.unit_kerja;
    var pembimbing = unit && unit.pembimbing && unit.pembimbing.pengguna &&
        unit.pembimbing.pengguna.nama_lengkap;
    $('#pembimbingLapanganText').text(pembimbing || '-');

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    function dateTime(value) {
        return window.apiFormatDateTime(value).full;
    }

    function responseData(response, expectedKeys) {
        var data = window.apiResponseData(response);
        for (var depth = 0; depth < 3 && data && typeof data === 'object'; depth++) {
            var hasExpectedKey = expectedKeys.some(function(key) {
                return Object.prototype.hasOwnProperty.call(data, key);
            });
            if (hasExpectedKey || !data.data || typeof data.data !== 'object') break;
            data = data.data;
        }
        return data;
    }

    function findInternshipEndDate(profile) {
        var candidates = [profile];
        for (var index = 0; index < candidates.length && index < 20; index++) {
            var candidate = candidates[index];
            if (!candidate || typeof candidate !== 'object') continue;
            if (candidate.tanggal_selesai) return candidate.tanggal_selesai;
            ['data', 'user', 'peserta_magang', 'peserta', 'profile'].forEach(function(key) {
                if (candidate[key] && typeof candidate[key] === 'object') candidates.push(candidate[key]);
            });
        }
        return '';
    }

    function calculateRemainingDays(endDate) {
        if (typeof endDate !== 'string' || !endDate.trim()) return null;
        var end = new Date(endDate);
        if (isNaN(end.getTime())) return null;
        return Math.max(0, Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24)));
    }

    function renderRemainingDays(profile) {
        var days = calculateRemainingDays(findInternshipEndDate(profile));
        if (days === null) return false;
        $('#statSisaHariMagang').text(days);
        return true;
    }

    $('#statSisaHariMagang').text('-');
    if (!renderRemainingDays(user)) {
        window.apiRequest('/me').then(function(response) {
            var profile = responseData(response, ['tanggal_selesai', 'peserta_magang', 'peserta', 'profile', 'user']);
            if (!renderRemainingDays(profile)) $('#statSisaHariMagang').text('-');
        }).catch(function(error) {
            $('#statSisaHariMagang').text('-');
            console.warn('Gagal memuat tanggal selesai magang dari profil peserta:', error.message);
        });
    }

    $('#statHariHadir, #statLogbookDiisi, #statIzinSakit').text('—');
    $('#statusHariIniBadge').text('Memuat...');
    $('#dashboardAttendanceRows').html(
        '<tr><td colspan="5" class="text-center py-4 text-muted">Memuat data...</td></tr>');
    $('#latestLogbookEmpty').hide();
    $('#latestLogbookContent').hide();

    Promise.all([
        window.apiRequest('/absensi/today'),
        window.apiRequest('/riwayat')
    ]).then(function(results) {
        var today = responseData(results[0], ['has_checked_in', 'check_in', 'check_out']);
        var historyData = responseData(results[1], ['riwayat_absensi', 'riwayat_logbook', 'riwayat_izin']);
        if (!today || typeof today.has_checked_in === 'undefined' ||
            !historyData || !Array.isArray(historyData.riwayat_absensi) ||
            !Array.isArray(historyData.riwayat_logbook) || !Array.isArray(historyData.riwayat_izin)) {
            throw new Error('Format data dashboard dari server tidak valid.');
        }
        var history = historyData.riwayat_absensi.slice().sort(function(left, right) {
            return String(right.tanggal_jam || '').localeCompare(String(left.tanggal_jam || ''));
        });
        var logs = historyData.riwayat_logbook.slice().sort(function(left, right) {
            return String(right.tanggal || '').localeCompare(String(left.tanggal || ''));
        });
        var leaves = historyData.riwayat_izin;
        var checkIn = today.check_in;
        var hasCheckedIn = today.has_checked_in === true || today.has_checked_in === 1 ||
            String(today.has_checked_in).toLowerCase() === 'true';
        if (hasCheckedIn || checkIn) {
            var verificationStatus = String(checkIn && checkIn.status_verifikasi || 'pending').toLowerCase();
            $('#statusHariIniText').text(verificationStatus === 'pending'
                ? 'Presensi masuk tercatat dan menunggu verifikasi' +
                    (checkIn && checkIn.tanggal_jam ? ': ' + dateTime(checkIn.tanggal_jam) : '.')
                : 'Presensi hari ini tercatat' +
                    (checkIn && checkIn.tanggal_jam ? ': ' + dateTime(checkIn.tanggal_jam) : '.'));
            $('#statusHariIniBadge').removeClass('bg-secondary').addClass(
                verificationStatus === 'approved' ? 'bg-success' :
                    verificationStatus === 'rejected' ? 'bg-danger' : 'bg-warning text-dark'
            ).text(verificationStatus);
        } else {
            $('#statusHariIniText').text('Belum melakukan presensi masuk hari ini.');
            $('#statusHariIniBadge').text('Belum Absen');
        }
        $('#latestAttendanceDate').text(history.length
            ? 'Presensi terakhir: ' + dateTime(history[0].tanggal_jam)
            : 'Belum ada riwayat presensi.');
        $('#statHariHadir').text(history.length);
        $('#statLogbookDiisi').text(logs.length);
        $('#statIzinSakit').text(leaves.length);
        $('#dashboardAttendanceRows').html(history.slice(0, 5).map(function(item) {
            var status = String(item.status || '').toLowerCase();
            return '<tr><td>' + escapeHtml(dateTime(item.tanggal_jam)) + '</td><td>' +
                escapeHtml(status === 'masuk' ? 'Masuk' : 'Keluar') + '</td><td>' +
                escapeHtml(item.status_verifikasi || 'pending') + '</td><td>' +
                escapeHtml(item.lokasi || '-') + '</td></tr>';
        }).join('') || '<tr><td colspan="5" class="text-center py-4 text-muted">Belum ada riwayat presensi.</td></tr>');
        if (logs.length) {
            var latest = logs[0];
            $('#latestLogbookEmpty').hide();
            $('#latestLogbookContent').show().html(
                '<div class="fw-semibold mb-1">' + escapeHtml(latest.tanggal || '-') + '</div>' +
                '<p class="small mb-2">' + escapeHtml(latest.kegiatan || '-') + '</p>' +
                '<span class="badge ' + (String(latest.status_verifikasi).toLowerCase() === 'approved' ? 'badge-approved' : 'badge-pending') + '">' +
                escapeHtml(latest.status_verifikasi || 'pending') + '</span>'
            );
        } else {
            $('#latestLogbookEmpty').show();
            $('#latestLogbookContent').empty();
        }
    }).catch(function(error) {
        $('#statusHariIniText').text('Data presensi gagal dimuat.');
        $('#latestAttendanceDate').text('');
        $('#statHariHadir, #statLogbookDiisi, #statIzinSakit').text('—');
        $('#dashboardAttendanceRows').html('<tr><td colspan="5" class="text-center text-danger py-4">' +
            escapeHtml(error.message) + '</td></tr>');
        $('#latestLogbookEmpty').show().text('Data dashboard gagal dimuat.');
        Swal.fire('Dashboard Gagal Dimuat', error.message, 'error');
    });
});
