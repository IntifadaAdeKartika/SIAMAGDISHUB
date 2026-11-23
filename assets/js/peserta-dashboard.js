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
    // 1. Tampilkan nama unit kerja (string saja, hindari [object Object])
    var unitKerjaNama = user?.peserta_magang?.unit_kerja?.nama_unit ||
                        user?.unit_kerja?.nama_unit ||
                        (typeof user?.peserta_magang?.nama_unit_kerja === 'string' ? user.peserta_magang.nama_unit_kerja : '') ||
                        (typeof user?.nama_unit_kerja === 'string' ? user.nama_unit_kerja : '') ||
                        '';
    $('#participantUnit').text(unitKerjaNama);

    // 2. Tampilkan nama pembimbing lapangan dengan optional chaining
    var pembimbing = user?.peserta_magang?.unit_kerja?.pembimbing?.pengguna?.nama_lengkap ||
                     user?.peserta_magang?.unit_kerja?.pembimbing?.[0]?.pengguna?.nama_lengkap ||
                     user?.peserta_magang?.unit_kerja?.pembimbing?.nama_lengkap ||
                     user?.peserta_magang?.pembimbing?.pengguna?.nama_lengkap ||
                     user?.peserta_magang?.nama_pembimbing ||
                     '-';
    $('#pembimbingLapanganText').text(pembimbing);

    function resolvePembimbing(u) {
        if (!u || typeof u !== 'object') return '';
        var mentorName = u?.peserta_magang?.unit_kerja?.pembimbing?.pengguna?.nama_lengkap ||
                         u?.peserta_magang?.unit_kerja?.pembimbing?.[0]?.pengguna?.nama_lengkap ||
                         u?.data?.peserta_magang?.unit_kerja?.pembimbing?.pengguna?.nama_lengkap ||
                         u?.data?.peserta_magang?.unit_kerja?.pembimbing?.[0]?.pengguna?.nama_lengkap ||
                         u?.peserta_magang?.unit_kerja?.pembimbing?.nama_lengkap ||
                         u?.peserta_magang?.pembimbing?.pengguna?.nama_lengkap ||
                         u?.peserta_magang?.nama_pembimbing ||
                         '';
        return mentorName ? String(mentorName).trim() : '';
    }

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
    var remainingDaysRendered = renderRemainingDays(user);
    if (!remainingDaysRendered || pembimbing === '-' || !pembimbing) {
        window.apiRequest('/me').then(function(response) {
            var profile = responseData(response, ['tanggal_selesai', 'peserta_magang', 'peserta', 'profile', 'user']);
            if (!renderRemainingDays(profile)) $('#statSisaHariMagang').text('-');
            var mentorFromApi = resolvePembimbing(profile) || resolvePembimbing(response);
            if (mentorFromApi && ($('#pembimbingLapanganText').text() === '-' || !$('#pembimbingLapanganText').text())) {
                $('#pembimbingLapanganText').text(mentorFromApi);
            }
            var unitFromApi = profile?.peserta_magang?.unit_kerja?.nama_unit ||
                              response?.data?.peserta_magang?.unit_kerja?.nama_unit ||
                              profile?.unit_kerja?.nama_unit;
            if (unitFromApi && (!$('#participantUnit').text().trim() || $('#participantUnit').text().trim() === '[object Object]')) {
                $('#participantUnit').text(unitFromApi);
            }
            if (profile && typeof profile === 'object') {
                try {
                    var storedUser = JSON.parse(localStorage.getItem('user') || '{}') || {};
                    var mergedUser = Object.assign({}, storedUser, profile);
                    if (profile.peserta_magang && storedUser.peserta_magang) {
                        mergedUser.peserta_magang = Object.assign({}, storedUser.peserta_magang, profile.peserta_magang);
                    }
                    localStorage.setItem('user', JSON.stringify(mergedUser));
                    localStorage.setItem('siamag_user', JSON.stringify(mergedUser));
                } catch (e) {}
            }
        }).catch(function(error) {
            if (!$('#statSisaHariMagang').text() || $('#statSisaHariMagang').text() === '—') {
                $('#statSisaHariMagang').text('-');
            }
            console.warn('Gagal memuat data profil peserta dari /me:', error.message);
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
