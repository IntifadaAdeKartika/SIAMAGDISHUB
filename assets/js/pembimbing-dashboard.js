$(document).ready(function() {
    var user = null;
    try { user = JSON.parse(localStorage.getItem('siamag_user') || 'null'); } catch (error) {}
    window.setUserTopbar(user, 'pembimbing');

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    function responseRows(response, keys) {
        return window.apiList(response, keys);
    }

    function personData(item) {
        var participant = item.peserta_magang || item.peserta || item;
        var account = participant.pengguna || item.pengguna || {};
        return {
            name: item.nama_lengkap || item.nama_peserta || account.nama_lengkap ||
                participant.nama_lengkap || participant.nama || '-',
            nisn: account.username || participant.username || item.username || item.nisn || '-',
            school: item.asal_sekolah_kampus || participant.asal_sekolah_kampus ||
                participant.instansi || item.instansi || '-'
        };
    }

    function isPending(value) {
        return String(value || '').trim().toLowerCase() === 'pending';
    }

    function formatQueueDate(value) {
        if (!value) return '-';
        return /[T ]\d{2}:\d{2}/.test(String(value))
            ? formatTanggalJam(value)
            : formatTanggal(value);
    }

    function renderQueue(monitoring, logs, leaves) {
        var pendingAttendance = monitoring.filter(function(row) {
            return isPending(row.status_verifikasi_presensi_hari_ini);
        });
        var pendingLogs = logs.filter(function(row) {
            return isPending(row.status_verifikasi);
        });
        var pendingLeaves = leaves.filter(function(row) {
            return isPending(row.status);
        });
        var tbody = $('#tabelMenungguVerifikasi tbody').empty();
        $('#countPendingAbsen').text(pendingAttendance.length);
        $('#countPendingLogbook').text(pendingLogs.length);
        $('#countPendingIzin').text(pendingLeaves.length);
        var pending = pendingAttendance.map(function(row) {
            var person = personData(row);
            return {
                name: person.name,
                school: person.school,
                type: 'Absensi',
                date: formatQueueDate(row.tanggal_jam || row.tanggal_presensi_hari_ini ||
                    row.waktu_presensi_hari_ini),
                link: 'absensi.html'
            };
        }).concat(pendingLogs.map(function(row) {
            var person = personData(row);
            return {
                name: person.name,
                school: person.school,
                type: 'Logbook',
                date: formatQueueDate(row.tanggal || row.created_at),
                link: 'logbook.html'
            };
        })).concat(pendingLeaves.map(function(row) {
            var person = personData(row);
            return {
                name: person.name,
                school: person.school,
                type: 'Izin',
                date: formatQueueDate(row.tanggal_mulai || row.created_at),
                link: 'pengajuan-izin.html'
            };
        })).slice(0, 10);
        if (!pending.length) {
            tbody.html('<tr><td colspan="5" class="text-center py-4 text-muted">Belum ada data</td></tr>');
            return;
        }
        pending.forEach(function(row) {
            var isAttendance = row.type === 'Absensi';
            tbody.append('<tr><td><strong>' + escapeHtml(row.name) + '</strong><div class="small text-muted">' +
                escapeHtml(row.school) + '</div></td><td><span class="badge ' +
                (isAttendance ? 'bg-primary' : row.type === 'Logbook' ? 'bg-info text-dark' : 'bg-warning text-dark') + '">' + row.type +
                '</span></td><td>' + escapeHtml(row.date) + '</td><td><span class="badge badge-pending">Pending</span></td>' +
                '<td><a class="btn btn-sm btn-outline-primary" href="' + row.link + '">Lihat Semua</a></td></tr>');
        });
    }

    $('#countAnakBimbingan, #countPendingIzin, #countPendingAbsen, #countPendingLogbook').text('—');
    $('#emptyAnakBimbingan').hide();
    $('#listAnakBimbingan').html('<li class="list-group-item px-0 text-muted">Memuat data...</li>');
    $('#tabelMenungguVerifikasi tbody').html(
        '<tr><td colspan="5" class="text-center py-4 text-muted">Memuat data...</td></tr>');

    Promise.all([
        window.apiRequest('/monitoring'),
        window.apiRequest('/pembimbing/logbook'),
        window.apiRequest('/pembimbing/pengajuan-izin')
    ]).then(function(results) {
        var monitoring = responseRows(results[0], ['data', 'monitoring', 'anak_bimbingan', 'peserta_bimbingan']);
        var logbookRows = responseRows(results[1], ['data', 'logbook', 'logbooks']);
        var leaveRows = responseRows(results[2], ['data', 'pengajuan_izin', 'pengajuan_izins', 'izin']);
        $('#countAnakBimbingan').text(monitoring.length);
        $('#unitDashboard').text(user && (user.unit_kerja || user.unit) || 'Monitoring bimbingan');
        $('#emptyAnakBimbingan').toggle(monitoring.length === 0);
        $('#listAnakBimbingan').html(monitoring.map(function(item) {
            var person = personData(item);
            return '<li class="list-group-item px-0 small"><i class="fas fa-user-graduate me-2 text-primary"></i>' +
                '<strong>' + escapeHtml(person.name) + '</strong><div class="text-muted ms-4">' +
                'NISN: ' + escapeHtml(person.nisn) + ' · ' + escapeHtml(person.school) + '</div></li>';
        }).join(''));
        renderQueue(monitoring, logbookRows, leaveRows);
    }).catch(function(error) {
        $('#tabelMenungguVerifikasi tbody').html('<tr><td colspan="5" class="text-center text-danger py-4">' +
            escapeHtml(error.message) + '</td></tr>');
        $('#listAnakBimbingan').html('<li class="list-group-item px-0 text-danger">' +
            escapeHtml(error.message) + '</li>');
        $('#emptyAnakBimbingan').hide();
        Swal.fire('Dashboard Gagal Dimuat', error.message, 'error');
    });
});
