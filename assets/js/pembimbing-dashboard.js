
$(document).ready(function() {
    var user = null;

    try {
        user = JSON.parse(localStorage.getItem('siamag_user') || 'null');
    } catch (error) {
        user = null;
    }

    window.setUserTopbar(user, 'pembimbing');

    // ==============================
    // HELPER FUNCTIONS
    // ==============================

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[character];
        });
    }

    // Mengambil nama unit tanpa menghasilkan [object Object]
    function getUnitName(value) {
        if (!value) return '';

        if (typeof value === 'string' || typeof value === 'number') {
            return String(value);
        }

        if (typeof value === 'object' && !Array.isArray(value)) {
            var name = value.nama_unit ||
                value.nama_bidang ||
                value.nama ||
                value.name ||
                value.label;

            if (typeof name === 'string' || typeof name === 'number') {
                return String(name);
            }

            return '';
        }

        return '';
    }

    function responseRows(response, keys) {
        return window.apiList(response, keys);
    }

    function personData(item) {
        var participant = item.peserta_magang || item.peserta || item;
        var account = participant.pengguna || item.pengguna || {};

        return {
            name: item.nama_lengkap ||
                item.nama_peserta ||
                account.nama_lengkap ||
                participant.nama_lengkap ||
                participant.nama ||
                '-',

            nisn: account.username ||
                participant.username ||
                item.username ||
                item.nisn ||
                '-',

            school: item.asal_sekolah_kampus ||
                participant.asal_sekolah_kampus ||
                participant.instansi ||
                item.instansi ||
                '-'
        };
    }

    function isPending(value) {
        return String(value || '').trim().toLowerCase() === 'pending';
    }

    function formatQueueDate(value) {
        if (!value) return '-';
        var str = String(value).trim();
        if (!str) return '-';
        // Gunakan string asli (termasuk suffix Z) agar new Date() di formatTanggalJam
        // mengkonversi UTC ke zona waktu lokal browser (WIB = UTC+7) secara benar.
        // Contoh: "2026-11-24T02:15:00.000000Z" (UTC) → new Date().getHours() = 9 (WIB)
        return /[T ]\d{2}:\d{2}/.test(str)
            ? formatTanggalJam(str)
            : formatTanggal(str);
    }

    // ==============================
    // RENDER VERIFICATION QUEUE
    // ==============================

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
                date: formatQueueDate(row.tanggal_jam_absensi),
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
            tbody.html(
                '<tr><td colspan="5" class="text-center py-4 text-muted">' +
                'Belum ada data</td></tr>'
            );
            return;
        }

        pending.forEach(function(row) {
            var isAttendance = row.type === 'Absensi';

            var badgeType = isAttendance
                ? 'bg-primary'
                : row.type === 'Logbook'
                    ? 'bg-info text-dark'
                    : 'bg-warning text-dark';

            tbody.append(
                '<tr>' +
                    '<td><strong>' + escapeHtml(row.name) + '</strong>' +
                        '<div class="small text-muted">' +
                            escapeHtml(row.school) +
                        '</div>' +
                    '</td>' +
                    '<td><span class="badge ' + badgeType + '">' +
                        escapeHtml(row.type) +
                    '</span></td>' +
                    '<td>' + escapeHtml(row.date) + '</td>' +
                    '<td><span class="badge badge-pending">Pending</span></td>' +
                    '<td><a class="btn btn-sm btn-outline-primary" href="' +
                        row.link + '">Lihat Semua</a></td>' +
                '</tr>'
            );
        });
    }

    // ==============================
    // INITIAL DISPLAY
    // ==============================

    $('#countAnakBimbingan, #countPendingIzin, #countPendingAbsen, #countPendingLogbook')
        .text('—');

    $('#emptyAnakBimbingan').hide();

    $('#listAnakBimbingan').html(
        '<li class="list-group-item px-0 text-muted">Memuat data...</li>'
    );

    $('#tabelMenungguVerifikasi tbody').html(
        '<tr><td colspan="5" class="text-center py-4 text-muted">' +
        'Memuat data...</td></tr>'
    );

    // ==============================
    // LOAD DASHBOARD DATA
    // ==============================

    Promise.all([
        window.apiRequest('/monitoring'),
        window.apiRequest('/pembimbing/logbook'),
        window.apiRequest('/pembimbing/pengajuan-izin')
    ]).then(function(results) {

        var monitoring = responseRows(results[0], [
            'data',
            'monitoring',
            'anak_bimbingan',
            'peserta_bimbingan'
        ]);

        var logbookRows = responseRows(results[1], [
            'data',
            'logbook',
            'logbooks'
        ]);

        var leaveRows = responseRows(results[2], [
            'data',
            'pengajuan_izin',
            'pengajuan_izins',
            'izin'
        ]);

        // ==============================
        // UNIT PEMBIMBING
        // ==============================

        var unitName = getUnitName(user && user.unit_kerja) ||
            getUnitName(user && user.unit);

        $('#unitDashboard').text(
            unitName || 'Monitoring bimbingan'
        );

        // ==============================
        // COUNT PARTICIPANTS
        // ==============================

        $('#countAnakBimbingan').text(monitoring.length);

        // ==============================
        // EMPTY STATE
        // ==============================

        $('#emptyAnakBimbingan').toggle(monitoring.length === 0);

        // ==============================
        // RENDER PARTICIPANTS
        // ==============================

        $('#listAnakBimbingan').html(
            monitoring.map(function(item) {
                var person = personData(item);

                return (
                    '<li class="list-group-item px-0 small">' +
                        '<i class="fas fa-user-graduate me-2 text-primary"></i>' +
                        '<strong>' + escapeHtml(person.name) + '</strong>' +
                        '<div class="text-muted ms-4">' +
                            'NISN: ' + escapeHtml(person.nisn) +
                            ' · ' + escapeHtml(person.school) +
                        '</div>' +
                    '</li>'
                );
            }).join('')
        );

        // ==============================
        // RENDER PENDING VERIFICATION
        // ==============================

        renderQueue(monitoring, logbookRows, leaveRows);

    }).catch(function(error) {

        $('#tabelMenungguVerifikasi tbody').html(
            '<tr><td colspan="5" class="text-center text-danger py-4">' +
            escapeHtml(error.message) +
            '</td></tr>'
        );

        $('#listAnakBimbingan').html(
            '<li class="list-group-item px-0 text-danger">' +
            escapeHtml(error.message) +
            '</li>'
        );

        $('#emptyAnakBimbingan').hide();

        Swal.fire(
            'Dashboard Gagal Dimuat',
            error.message,
            'error'
        );
    });
});
