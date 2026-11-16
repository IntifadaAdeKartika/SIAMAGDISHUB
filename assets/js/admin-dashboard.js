$(document).ready(function() {
    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    function participant(item) {
        var person = item.peserta_magang || item.peserta || {};
        var account = person.pengguna || {};
        var unit = item.unit_kerja || person.unit_kerja || {};
        return {
            name: (account && account.nama_lengkap) ? account.nama_lengkap : (person.nama_lengkap || item.nama_peserta || person.nama || '-'),
            unit: (unit && unit.nama_unit) ? unit.nama_unit : '-'
        };
    }

    function statValue(stats, keys, fallback) {
        for (var index = 0; index < keys.length; index++) {
            var value = stats[keys[index]];
            if (value !== undefined && value !== null) {
                if (typeof value === 'object') {
                    var nestedValue = value.total;
                    if (nestedValue == null) nestedValue = value.count;
                    if (nestedValue == null) nestedValue = value.jumlah;
                    if (nestedValue == null) nestedValue = value.value;
                    value = nestedValue;
                }
                if (value !== undefined && value !== null) return value;
            }
        }
        return fallback;
    }

    function dashboardRows(dashboard, keys) {
        for (var index = 0; index < keys.length; index++) {
            var value = dashboard[keys[index]];
            if (Array.isArray(value)) return value;
            if (value && typeof value === 'object') {
                var rows = window.apiList(value, []);
                if (Array.isArray(rows) && rows.length) return rows;
            }
        }
        return [];
    }

    function renderAttendance(rows, stats) {
        $('#statMasukHariIni').text(statValue(stats, [
            'total_absensi_hari_ini', 'absensi_hari_ini', 'event_masuk_hari_ini',
            'total_masuk_hari_ini', 'total_absensi_masuk_hari_ini',
            'jumlah_masuk_hari_ini', 'absensi_masuk_hari_ini', 'masuk_hari_ini',
            'total_absensi_masuk'
        ], rows.length));
        $('#statPending').text(statValue(stats, [
            'verifikasi_pending', 'total_verifikasi_pending', 'pending_verifikasi',
            'jumlah_pending', 'total_pending', 'pending'
        ], rows.filter(function(row) {
            return String(row.status_verifikasi || '').toLowerCase() === 'pending';
        }).length));
        var tbody = $('#dashboardAbsensiRows').empty();
        if (!rows.length) {
            tbody.append('<tr><td colspan="5" class="text-center text-muted py-4">Belum ada data</td></tr>');
            return;
        }
        rows.slice(0, 8).forEach(function(row) {
            var person = participant(row);
            var event = String(row.status || '').toLowerCase();
            var verification = String(row.status_verifikasi || 'pending').toLowerCase();
            var badge = verification === 'approved' ? 'bg-success' :
                verification === 'rejected' ? 'bg-danger' : 'bg-warning text-dark';
            tbody.append('<tr><td><strong>' + escapeHtml(person.name) + '</strong></td>' +
                '<td>' + escapeHtml(person.unit) + '</td><td>' + escapeHtml(formatTanggalJam(row.tanggal_jam)) + '</td>' +
                '<td><span class="badge ' + (event === 'masuk' ? 'bg-primary' : 'bg-info text-dark') + '">' +
                escapeHtml(event || '-') + '</span></td><td><span class="badge ' + badge + '">' +
                escapeHtml(verification) + '</span></td></tr>');
        });
    }

    function renderLeave(data) {
        var container = $('#dashboardIzinRows').empty();
        var rows = [];
        if (Array.isArray(data)) {
            rows = data;
        } else if (data && typeof data === 'object') {
            rows = Array.isArray(data.izin_terbaru) ? data.izin_terbaru :
                   (data.data && Array.isArray(data.data.izin_terbaru) ? data.data.izin_terbaru :
                   dashboardRows(data, ['izin_terbaru', 'pengajuan_izin_terbaru', 'latest_leaves', 'recent_leaves', 'pengajuan_izin', 'izin']));
        }

        if (!rows || !rows.length) {
            container.html('<div class="text-center text-muted py-4">Belum ada pengajuan izin.</div>');
            return;
        }

        rows.slice(0, 5).forEach(function(row) {
            var personName = (row.peserta_magang && row.peserta_magang.pengguna && row.peserta_magang.pengguna.nama_lengkap) ||
                             (row.peserta_magang && row.peserta_magang.nama_lengkap) ||
                             row.nama_peserta ||
                             (participant(row) && participant(row).name) ||
                             '-';
            var status = String(row.status || 'pending').toLowerCase();
            var badgeClass = 'badge-pending';
            if (status === 'approved') {
                badgeClass = 'badge-approved';
            } else if (status === 'rejected') {
                badgeClass = 'badge-rejected';
            } else if (status === 'cancelled' || status === 'canceled') {
                badgeClass = 'bg-secondary text-white';
            } else {
                badgeClass = 'badge-pending';
            }

            var tanggalPengajuan = row.created_at
                ? formatTanggal(row.created_at)
                : (row.tanggal_mulai ? formatTanggal(row.tanggal_mulai) : '-');

            var jenisLabel = row.jenis
                ? (row.jenis.charAt(0).toUpperCase() + row.jenis.slice(1).toLowerCase())
                : 'Izin';
            var keterangan = row.keterangan ? ' - ' + row.keterangan : '';

            container.append(
                '<div class="list-item">' +
                    '<div class="stat-icon bg-orange m-0" style="width:38px;height:38px;font-size:.85rem;margin-bottom:0">' +
                        '<i class="fas fa-user"></i>' +
                    '</div>' +
                    '<div class="flex-grow-1 min-w-0">' +
                        '<div class="fw-semibold small text-truncate">' + escapeHtml(personName) + '</div>' +
                        '<div class="text-muted small text-truncate">' + escapeHtml(jenisLabel + keterangan) + '</div>' +
                        '<div class="text-muted mt-1" style="font-size:.72rem">' + escapeHtml(tanggalPengajuan) + '</div>' +
                    '</div>' +
                    '<span class="badge ' + badgeClass + '">' + escapeHtml(status) + '</span>' +
                '</div>'
            );
        });
    }

    function unwrapDashboard(payload) {
        var current = payload;
        var dashboardKeys = [
            'statistik', 'statistics', 'stats', 'summary', 'counts', 'ringkasan', 'absensi_hari_ini',
            'total_absensi_hari_ini', 'detail_absensi_hari_ini', 'izin_terbaru',
            'pengajuan_izin_terbaru', 'attendance_today', 'recent_leaves'
        ];
        for (var depth = 0; depth < 5 && current && typeof current === 'object'; depth++) {
            var hasDashboardData = dashboardKeys.some(function(key) {
                return current[key] !== undefined;
            });
            if (hasDashboardData || !current.data || typeof current.data !== 'object') break;
            current = current.data;
        }
        return current && typeof current === 'object' ? current : {};
    }

    $('#statPeserta, #statPembimbing').text('—');
    $('#dashboardAbsensiRows').html(
        '<tr><td colspan="5" class="text-center text-muted py-4">Memuat data...</td></tr>');
    $('#dashboardIzinRows').html('<div class="text-center text-muted py-4">Memuat data...</div>');

    window.apiRequest('/admin/dashboard', { method: 'GET' }).then(function(payload) {
        var dashboard = unwrapDashboard(payload);
        var stats = dashboard.statistik || dashboard.statistics || dashboard.stats ||
            dashboard.summary || dashboard.counts || dashboard.ringkasan || dashboard;
        var attendanceRows = dashboardRows(dashboard, [
            'detail_absensi_hari_ini', 'attendance_today', 'today_attendance',
            'absensi_hari_ini', 'absensi'
        ]);
        var leaveRows = (dashboard && Array.isArray(dashboard.izin_terbaru))
            ? dashboard.izin_terbaru
            : (payload && Array.isArray(payload.izin_terbaru)
                ? payload.izin_terbaru
                : (payload && payload.data && Array.isArray(payload.data.izin_terbaru)
                    ? payload.data.izin_terbaru
                    : dashboardRows(dashboard, [
                        'izin_terbaru', 'pengajuan_izin_terbaru', 'latest_leaves', 'recent_leaves',
                        'latest_leave_requests', 'pengajuan_izin', 'izin'
                    ])));
        $('#statPeserta').text(statValue(stats, [
            'total_peserta', 'total_peserta_magang', 'jumlah_peserta', 'jumlah_peserta_magang',
            'peserta_magang_count', 'peserta_magang', 'peserta'
        ], '—'));
        $('#statPembimbing').text(statValue(stats, [
            'total_pembimbing', 'jumlah_pembimbing', 'pembimbing_count', 'pembimbing'
        ], '—'));
        renderAttendance(attendanceRows, stats);
        renderLeave(leaveRows);
    }).catch(function(error) {
        $('#dashboardAbsensiRows').html('<tr><td colspan="5" class="text-center text-danger py-4">' +
            escapeHtml(error.message) + '</td></tr>');
        $('#dashboardIzinRows').html('<div class="text-center text-danger py-4">' +
            escapeHtml(error.message) + '</div>');
        Swal.fire('Dashboard Gagal Dimuat', error.message, 'error');
    });
});
