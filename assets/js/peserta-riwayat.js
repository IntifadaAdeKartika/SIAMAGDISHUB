$(document).ready(function() {
    var records = [];
    var logbookRecords = [];
    var leaveRecords = [];
    var user = null;
    try { user = JSON.parse(localStorage.getItem('user') || localStorage.getItem('siamag_user') || 'null'); } catch (error) {}
    var p = user && (user.peserta_magang || user.peserta || user.profile || {});
    var name = user && (user.nama_lengkap || p.nama_lengkap || user.nama || p.nama || user.name || p.name) ||
        'Pengguna';
    var initialMatch = String(name).match(/[a-zA-Z]/);
    var initial = initialMatch ? initialMatch[0].toUpperCase() : 'P';
    $('#userName').text(name);
    $('#userRole').text('Peserta Magang');
    $('#userInitial').text(initial);

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    function apiUrl(path) {
        if (typeof window.apiUrl === 'function') return window.apiUrl(path);
        var base = (window.API_BASE || 'http://localhost:8000/backend-api').replace(/\/+$/, '');
        var cleanPath = String(path || '').replace(/^\/+/, '');
        return cleanPath ? base + '/' + cleanPath : base;
    }

    function fileUrl(path) {
        if (!path) return '';
        if (/^data:image\//i.test(path)) return path;
        try {
            var url = /^https?:/i.test(path)
                ? new URL(path)
                : new URL(String(path).replace(/^\//, ''), new URL(apiUrl('/')).origin + '/');
            return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
        } catch (error) {
            return path;
        }
    }

    function datePart(value) {
        return window.apiFormatDateTime(value).date;
    }

    function timePart(value) {
        return window.apiFormatDateTime(value).time;
    }

    function safeFormatTanggalJam(val) {
        if (!val) return '-';
        if (typeof formatTanggalJam === 'function') return formatTanggalJam(val);
        return String(val).replace('T', ' ').slice(0, 19);
    }

    function safeFormatTanggal(val) {
        if (!val) return '-';
        if (typeof formatTanggal === 'function') return formatTanggal(val);
        return String(val).slice(0, 10);
    }

    var table = $('#tabelRiwayatLengkap').DataTable({
        language: {
            search: 'Cari Presensi:',
            lengthMenu: 'Tampilkan _MENU_ data',
            zeroRecords: 'Belum ada data',
            info: 'Menampilkan _START_ sampai _END_ dari _TOTAL_ presensi',
            infoEmpty: 'Menampilkan 0 data',
            infoFiltered: '(disaring dari _MAX_ total data)',
            paginate: { first: 'Awal', last: 'Akhir', next: 'Berikutnya', previous: 'Sebelumnya' }
        },
        order: [[1, 'desc']],
        columnDefs: [{ orderable: false, targets: [0, 4, 5, 7] }]
    });
    var logbookTable = $('#tabelRiwayatLogbook').DataTable({
        language: {
            search: 'Cari Logbook:',
            lengthMenu: 'Tampilkan _MENU_ data',
            zeroRecords: 'Data tidak ditemukan',
            emptyTable: 'Memuat data...',
            info: 'Menampilkan _START_ sampai _END_ dari _TOTAL_ logbook',
            infoEmpty: 'Menampilkan 0 logbook',
            paginate: { first: 'Awal', last: 'Akhir', next: 'Berikutnya', previous: 'Sebelumnya' }
        },
        order: [[1, 'desc']],
        columnDefs: [{ orderable: false, targets: [0, 4, 6] }]
    });
    var leaveTable = $('#tabelRiwayatIzin').DataTable({
        language: {
            search: 'Cari Izin:',
            lengthMenu: 'Tampilkan _MENU_ data',
            zeroRecords: 'Data tidak ditemukan',
            emptyTable: 'Memuat data...',
            info: 'Menampilkan _START_ sampai _END_ dari _TOTAL_ pengajuan',
            infoEmpty: 'Menampilkan 0 pengajuan',
            paginate: { first: 'Awal', last: 'Akhir', next: 'Berikutnya', previous: 'Sebelumnya' }
        },
        order: [[2, 'desc']],
        columnDefs: [{ orderable: false, targets: [0, 3] }]
    });

    function render() {
        table.clear();
        records.forEach(function(item, index) {
            var status = String(item.status_verifikasi || 'pending').toLowerCase();
            var event = String(item.status || '').toLowerCase();
            var statusClass = status === 'approved' ? 'badge-approved' :
                status === 'rejected' ? 'badge-rejected' : 'badge-pending';
            var eventBadge = event === 'masuk'
                ? '<span class="badge bg-primary">Masuk</span>'
                : (event === 'keluar' ? '<span class="badge bg-secondary">Keluar</span>' : '<span class="badge bg-light text-dark border">' + escapeHtml(event || '-') + '</span>');
            var coordStr = (item.latitude != null && item.longitude != null)
                ? '<span class="small font-monospace">' + escapeHtml(item.latitude) + ', ' + escapeHtml(item.longitude) + '</span>'
                : '-';
            var parafPath = item.paraf_pembimbing_url || item.paraf_pembimbing || '';
            var parafUrl = fileUrl(parafPath);
            var parafHtml = parafUrl
                ? '<img src="' + escapeHtml(parafUrl) + '" alt="Paraf" style="height: 35px; object-fit: contain;">'
                : '-';

            table.row.add([
                index + 1,
                '<div><strong>' + escapeHtml(safeFormatTanggalJam(item.tanggal_jam)) + '</strong><span class="d-none">' + escapeHtml(String(item.tanggal_jam || '').slice(0, 10)) + '</span></div>',
                eventBadge,
                escapeHtml(item.lokasi || '-'),
                coordStr,
                escapeHtml(item.keterangan || '-'),
                '<span class="badge ' + statusClass + '">' + escapeHtml(status) + '</span>',
                parafHtml
            ]);
        });
        table.draw();
        $('#statHadir').text(records.filter(function(row) {
            return String(row.status).toLowerCase() === 'masuk';
        }).length);
        $('#statTerlambat').text(records.filter(function(row) {
            return String(row.status).toLowerCase() === 'keluar';
        }).length);
        $('#statIzin').text(records.filter(function(row) {
            return String(row.status_verifikasi).toLowerCase() === 'pending';
        }).length);
        $('#statSakit').text(records.filter(function(row) {
            return String(row.status_verifikasi).toLowerCase() === 'approved';
        }).length);
        $('#statAlpha').text(records.filter(function(row) {
            return String(row.status_verifikasi).toLowerCase() === 'rejected';
        }).length);
        $('#statPersentase').text(records.length);

        logbookTable.clear();
        logbookRecords.forEach(function(item, index) {
            var logbookStatus = String(item.status_verifikasi || item.status || 'pending').toLowerCase();
            var logbookStatusClass = logbookStatus === 'approved' ? 'badge-approved' :
                logbookStatus === 'rejected' ? 'badge-rejected' : 'badge-pending';
            var waktuStr = (item.jam_mulai || '-') + (item.jam_selesai ? ' s/d ' + item.jam_selesai : '');
            var logbookParafPath = item.paraf_pembimbing_url || item.paraf_pembimbing || '';
            var logbookParafUrl = fileUrl(logbookParafPath);
            var logbookParafHtml = logbookParafUrl
                ? '<img src="' + escapeHtml(logbookParafUrl) + '" alt="Paraf" style="height: 35px; object-fit: contain;">'
                : '-';

            logbookTable.row.add([
                index + 1,
                escapeHtml(safeFormatTanggal(item.tanggal)),
                escapeHtml(waktuStr),
                '<div class="small">' + escapeHtml(item.kegiatan || '-') + '</div>',
                '<div class="small text-muted">' + escapeHtml(item.catatan_pembimbing || item.catatan || '-') + '</div>',
                '<span class="badge ' + logbookStatusClass + '">' + escapeHtml(logbookStatus) + '</span>',
                logbookParafHtml
            ]);
        });
        logbookTable.draw();

        leaveTable.clear();
        leaveRecords.forEach(function(item, index) {
            var jenis = String(item.jenis || '-').toLowerCase();
            var badgeJenis = jenis === 'sakit'
                ? '<span class="badge" style="background:#fce4ec;color:#c62828;">Sakit</span>'
                : (jenis === 'izin' ? '<span class="badge" style="background:#e0f2fe;color:#0369a1;">Izin</span>' : '<span class="badge bg-light text-dark border">' + escapeHtml(item.jenis || '-') + '</span>');
            var start = item.tanggal_mulai || '';
            var end = item.tanggal_selesai || '';
            var periodeStr = start && end && start !== end
                ? safeFormatTanggal(start) + ' s/d ' + safeFormatTanggal(end)
                : safeFormatTanggal(start || end);

            var status = String(item.status || 'pending').toLowerCase();
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

            leaveTable.row.add([
                index + 1,
                badgeJenis,
                escapeHtml(periodeStr),
                '<div class="small">' + escapeHtml(item.keterangan || '-') + '</div>',
                '<span class="badge ' + badgeClass + '">' + escapeHtml(status) + '</span>'
            ]);
        });
        leaveTable.draw();
    }

    function loadHistory() {
        $('#btnReloadTable').prop('disabled', true);
        [table, logbookTable, leaveTable].forEach(function(instance) {
            window.apiSetTableState(instance, 'loading');
        });
        return window.apiRequest('/riwayat').then(function(response) {
            var data = window.apiResponseData(response);
            if (data && !Array.isArray(data.riwayat_absensi) && data.data && typeof data.data === 'object') {
                data = data.data;
            }
            if (!data || !Array.isArray(data.riwayat_absensi) ||
                !Array.isArray(data.riwayat_logbook) || !Array.isArray(data.riwayat_izin)) {
                throw new Error('Format data riwayat dari server tidak valid.');
            }
            records = data.riwayat_absensi;
            logbookRecords = data.riwayat_logbook;
            leaveRecords = data.riwayat_izin;
            render();
            [table, logbookTable, leaveTable].forEach(function(instance) {
                window.apiSetTableState(instance, 'loaded');
            });
        }).catch(function(error) {
            [table, logbookTable, leaveTable].forEach(function(instance) {
                window.apiSetTableState(instance, 'error');
            });
            Swal.fire('Riwayat Gagal Dimuat', error.message, 'error');
        }).then(function() {
            $('#btnReloadTable').prop('disabled', false);
        });
    }

    $('#filterTanggal').on('change input', function() {
        table.column(1).search($(this).val()).draw();
    });
    $('#filterStatusRiwayat').on('change', function() {
        table.column(2).search($(this).val() ? '^' + $(this).val() + '$' : '', true, false).draw();
    });
    $('#btnResetFilterRiwayat').on('click', function() {
        $('#filterTanggal, #filterStatusRiwayat').val('');
        table.search('').columns().search('').draw();
    });
    $('button[data-bs-toggle="tab"]').on('shown.bs.tab', function() {
        $.fn.dataTable.tables({ visible: true, api: true }).columns.adjust();
    });

    $('#btnReloadTable').on('click', loadHistory);
    $('#btnCetakRekap').on('click', function() { window.print(); });
    loadHistory();
});
