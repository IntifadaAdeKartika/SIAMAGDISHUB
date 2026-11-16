/* Audit trail Admin dari backend. */
$(document).ready(function() {
    var records = [];
    var table = $('#tabelLogAktivitas').DataTable({
        responsive: true,
        language: {
            search: 'Cari Log:',
            lengthMenu: 'Tampilkan _MENU_ data',
            zeroRecords: 'Log aktivitas tidak ditemukan',
            info: 'Menampilkan _START_ s/d _END_ dari _TOTAL_ log',
            infoEmpty: 'Menampilkan 0 log',
            paginate: { first: 'Awal', last: 'Akhir', next: '→', previous: '←' }
        },
        order: [[1, 'desc']],
        columnDefs: [{ orderable: false, targets: [6] }]
    });

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    function normalize(item) {
        var user = item.pengguna && typeof item.pengguna === 'object'
            ? item.pengguna
            : (item.user && typeof item.user === 'object' ? item.user : {});
        var role = item.role || user.role || user.peran || 'peserta_magang';
        if (role && typeof role === 'object') {
            role = role.slug || role.name || role.nama_role || role.nama || 'peserta_magang';
        }
        return Object.assign({}, item, {
            id: item.id,
            waktu: item.dibuat_pada || item.created_at || item.waktu || item.timestamp || '',
            pengguna: item.nama_pengguna || item.pengguna_nama || user.nama_lengkap || user.nama || user.name || '-',
            role: String(role).toLowerCase(),
            aktivitas: item.aksi || item.aktivitas || item.action || item.event || '-',
            keterangan: item.deskripsi || item.keterangan || item.description || item.message || '-',
            ipAddress: item.ip_address || item.ip || item.client_ip || '-',
            userAgent: item.user_agent || item.userAgent || '-'
        });
    }

    function renderTable() {
        var roleFilter = $('#filterRole').val();
        var filtered = records.filter(function(item) { return !roleFilter || item.role === roleFilter; });
        table.clear();
        filtered.forEach(function(item, index) {
            var roleLabel = item.role === 'admin' ? 'Administrator' :
                (item.role === 'pembimbing' ? 'Pembimbing' : 'Peserta Magang');
            var roleClass = item.role === 'admin' ? 'bg-dark' : (item.role === 'pembimbing' ? 'bg-primary' : 'bg-secondary');
            table.row.add([
                index + 1,
                '<span class="font-monospace small">' + escapeHtml(formatTanggalJam(item.waktu)) + '</span>',
                '<div><span class="fw-bold">' + escapeHtml(item.pengguna) + '</span><div><span class="badge ' + roleClass + '">' + roleLabel + '</span></div></div>',
                '<span class="badge bg-primary">' + escapeHtml(item.aktivitas) + '</span>',
                '<div class="small text-muted text-truncate" style="max-width:280px" title="' + escapeHtml(item.keterangan) + '">' + escapeHtml(item.keterangan) + '</div>',
                '<span class="badge bg-light text-dark font-monospace border">' + escapeHtml(item.ipAddress) + '</span>',
                '<button class="btn btn-sm btn-outline-info btn-detail-audit" data-id="' + escapeHtml(item.id) + '" title="Detail Audit"><i class="fas fa-search-plus"></i></button>'
            ]);
        });
        table.draw();
        $('#statTotalAudit').text(filtered.length);
    }

    function loadAudit() {
        $('#btnExportLog').prop('disabled', true);
        window.apiSetTableState(table, 'loading');
        return window.apiRequestAll('/admin/log-aktivitas', ['audit', 'logs', 'activities']).then(function(rows) {
            records = rows.map(normalize);
            renderTable();
            window.apiSetTableState(table, 'loaded');
            $('#btnExportLog').prop('disabled', false);
            return true;
        }).catch(function(error) {
            window.apiSetTableState(table, 'error');
            Swal.fire('Log Aktivitas Gagal Dimuat', error.message, 'error');
            return false;
        }).then(function() {
            $('#btnExportLog').prop('disabled', records.length === 0);
        });
    }

    $('#filterRole').on('change', renderTable);
    $(document).on('click', '.btn-detail-audit', function() {
        var item = records.find(function(row) { return String(row.id) === String($(this).data('id')); }.bind(this));
        if (!item) return;
        Swal.fire({
            title: 'Detail Audit Trail',
            html: '<div class="text-start bg-light p-3 rounded small">' +
                '<p><b>Waktu:</b> ' + escapeHtml(formatTanggalJam(item.waktu)) + '</p>' +
                '<p><b>Pengguna:</b> ' + escapeHtml(item.pengguna) + ' (' + escapeHtml(item.role) + ')</p>' +
                '<p><b>Aktivitas:</b> ' + escapeHtml(item.aktivitas) + '</p>' +
                '<p><b>IP Address:</b> ' + escapeHtml(item.ipAddress) + '</p>' +
                '<p><b>User Agent:</b><br>' + escapeHtml(item.userAgent) + '</p>' +
                '<hr><p class="mb-0"><b>Keterangan:</b><br>' + escapeHtml(item.keterangan) + '</p></div>',
            confirmButtonText: 'Tutup'
        });
    });

    $('#btnExportLog').on('click', function() {
        var rows = records.filter(function(item) { return !$('#filterRole').val() || item.role === $('#filterRole').val(); });
        var csv = [['Waktu', 'Pengguna', 'Role', 'Aktivitas', 'Keterangan', 'IP Address']]
            .concat(rows.map(function(item) {
                return [item.waktu, item.pengguna, item.role, item.aktivitas, item.keterangan, item.ipAddress];
            }))
            .map(function(row) {
                return row.map(function(value) { return '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"'; }).join(',');
            }).join('\r\n');
        var url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
        var link = document.createElement('a');
        link.href = url;
        link.download = 'log_aktivitas_' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    });

    loadAudit();
});
