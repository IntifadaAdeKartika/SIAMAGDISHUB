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
    function resolvePembimbing(u) {
        if (!u || typeof u !== 'object') return '';
        var root = u.data && typeof u.data === 'object' && !u.peserta_magang ? u.data : u;
        if (root.user && typeof root.user === 'object' && !root.peserta_magang) {
            root = root.user;
        }

        var peserta = root.peserta_magang || root.peserta || root.profile || root;
        var unit = (peserta && peserta.unit_kerja) || (root && root.unit_kerja) || (peserta && peserta.unit) || (root && root.unit);
        if (Array.isArray(unit)) unit = unit[0];

        // 1. Jalur utama dari user.peserta_magang.unit_kerja.pembimbing.pengguna.nama_lengkap
        if (unit && typeof unit === 'object') {
            var mentor = unit.pembimbing || unit.pembimbing_lapangan || unit.mentor;
            if (Array.isArray(mentor)) mentor = mentor[0];

            if (mentor && typeof mentor === 'object') {
                var acc = mentor.pengguna || mentor.user || mentor.account;
                var mentorName = (acc && (acc.nama_lengkap || acc.nama || acc.name)) ||
                    mentor.nama_lengkap || mentor.nama || mentor.name;
                if (mentorName) return String(mentorName).trim();
            } else if (typeof mentor === 'string' && mentor.trim()) {
                return mentor.trim();
            }
            if (unit.nama_pembimbing) return String(unit.nama_pembimbing).trim();
            if (unit.nama_pembimbing_lapangan) return String(unit.nama_pembimbing_lapangan).trim();
        }

        // 2. Jalur alternatif langsung dari peserta_magang.pembimbing
        if (peserta && typeof peserta === 'object') {
            var pMentor = peserta.pembimbing || peserta.pembimbing_lapangan || peserta.mentor;
            if (Array.isArray(pMentor)) pMentor = pMentor[0];
            if (pMentor && typeof pMentor === 'object') {
                var pAcc = pMentor.pengguna || pMentor.user || pMentor.account;
                var pMentorName = (pAcc && (pAcc.nama_lengkap || pAcc.nama || pAcc.name)) ||
                    pMentor.nama_lengkap || pMentor.nama || pMentor.name;
                if (pMentorName) return String(pMentorName).trim();
            } else if (typeof pMentor === 'string' && pMentor.trim()) {
                return pMentor.trim();
            }
            if (peserta.nama_pembimbing) return String(peserta.nama_pembimbing).trim();
            if (peserta.nama_pembimbing_lapangan) return String(peserta.nama_pembimbing_lapangan).trim();
        }

        if (root && root.nama_pembimbing) return String(root.nama_pembimbing).trim();

        return '';
    }

    var pembimbing = resolvePembimbing(user);
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
    var remainingDaysRendered = renderRemainingDays(user);
    if (!remainingDaysRendered || !pembimbing) {
        window.apiRequest('/me').then(function(response) {
            var profile = responseData(response, ['tanggal_selesai', 'peserta_magang', 'peserta', 'profile', 'user']);
            if (!renderRemainingDays(profile)) $('#statSisaHariMagang').text('-');
            var mentorFromApi = resolvePembimbing(profile) || resolvePembimbing(response);
            if (mentorFromApi) {
                $('#pembimbingLapanganText').text(mentorFromApi);
            }
            var unitFromApi = profile && (profile.nama_unit_kerja ||
                (profile.unit_kerja && profile.unit_kerja.nama_unit) ||
                (profile.peserta_magang && profile.peserta_magang.unit_kerja && profile.peserta_magang.unit_kerja.nama_unit));
            if (unitFromApi && !$('#participantUnit').text().trim()) {
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
