$(document).ready(function() {
    var records = [];
    var table = $('#tabelMonitoringIzin').DataTable({
        responsive: true,
        language: {
            search: 'Cari Pengajuan:',
            lengthMenu: 'Tampilkan _MENU_ data',
            zeroRecords: 'Belum ada data',
            info: 'Menampilkan _START_ s/d _END_ dari _TOTAL_ izin',
            infoEmpty: 'Menampilkan 0 data',
            paginate: { first: 'Awal', last: 'Akhir', next: '→', previous: '←' }
        },
        order: [[1, 'desc']]
    });

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    function participant(item) {
        var person = item.peserta_magang || item.peserta || {};
        var account = person.pengguna || {};
        var placement = person.penempatan || item.penempatan || {};
        var unit = item.unit_kerja || person.unit_kerja || placement.unit_kerja || {};
        var mentor = item.pembimbing || item.pembimbing_lapangan || person.pembimbing ||
            person.pembimbing_lapangan || unit.pembimbing || placement.pembimbing || {};
        var mentorAccount = mentor.pengguna || mentor.user || {};
        return {
            name: item.nama_peserta || account.nama_lengkap || person.nama_lengkap || person.nama || '-',
            nim: item.nim || account.username || person.nim || '-',
            school: item.asal_sekolah_kampus || person.asal_sekolah_kampus || person.instansi || '-',
            unit: item.nama_unit_kerja || unit.nama_unit || unit.nama || '-',
            unitId: item.id_unit_kerja || person.id_unit_kerja || unit.id || '',
            mentor: item.nama_pembimbing || mentor.nama_lengkap || mentor.nama ||
                mentorAccount.nama_lengkap || '-'
        };
    }

    function render() {
        var unitFilter = String($('#filterUnit').val() || '');
        var jenisFilter = $('#filterJenis').val();
        var statusFilter = $('#filterStatus').val();
        var visible = records.filter(function(item) {
            var person = participant(item);
            return (!unitFilter || String(person.unitId) === unitFilter) &&
                (!jenisFilter || String(item.jenis || '').toLowerCase() === jenisFilter) &&
                (!statusFilter || String(item.status || '').toLowerCase() === statusFilter);
        });
        table.clear();
        visible.forEach(function(item, index) {
            var person = participant(item);
            var status = String(item.status || 'pending').toLowerCase();
            var start = item.tanggal_mulai || '';
            var end = item.tanggal_selesai || '';
            var duration = start && end ? Math.round((new Date(end) - new Date(start)) / 86400000) + 1 : '-';
            var statusClass = status === 'approved' ? 'bg-success' :
                status === 'rejected' ? 'bg-danger' : 'bg-warning text-dark';
            var typeClass = String(item.jenis).toLowerCase() === 'sakit' ? 'bg-danger' : 'bg-info text-dark';
            table.row.add([
                index + 1,
                escapeHtml(item.created_at ? formatTanggalJam(item.created_at) : formatTanggal(start)),
                '<div class="fw-bold">' + escapeHtml(person.name) + '</div><div class="small text-muted">' +
                    escapeHtml(person.school) + '</div>',
                '<div class="small fw-semibold text-primary">' + escapeHtml(person.unit) +
                    '</div><div class="small text-muted">Pembimbing: ' + escapeHtml(person.mentor) + '</div>',
                '<span class="badge ' + typeClass + '">' + escapeHtml(item.jenis || '-') + '</span>',
                '<div>' + escapeHtml(formatTanggal(start)) + ' s/d ' + escapeHtml(formatTanggal(end)) +
                    '</div><small class="badge bg-light text-dark border">' +
                    escapeHtml(duration) + ' Hari</small>',
                '<span class="badge ' + statusClass + '">' + escapeHtml(status) + '</span>',
                '<button class="btn btn-sm btn-outline-primary btn-detail-izin" data-id="' +
                    escapeHtml(item.id || item.id_pengajuan_izin) + '"><i class="fas fa-eye"></i> Detail</button>'
            ]);
        });
        table.draw();
        $('#statTotalIzin').text(records.length);
        $('#statMenungguIzin').text(records.filter(function(row) {
            return String(row.status).toLowerCase() === 'pending';
        }).length);
        $('#statDisetujuiIzin').text(records.filter(function(row) {
            return String(row.status).toLowerCase() === 'approved';
        }).length);
    }

    function load() {
        $('#btnReloadTable').prop('disabled', true);
        window.apiSetTableState(table, 'loading');
        return window.apiRequestAll('/admin/pengajuan-izin', ['pengajuan_izin', 'pengajuan_izins']).then(function(rows) {
            records = rows;
            render();
            window.apiSetTableState(table, 'loaded');
            return true;
        }).catch(function(error) {
            window.apiSetTableState(table, 'error');
            Swal.fire('Data Pengajuan Izin Gagal Dimuat', error.message, 'error');
            return false;
        }).then(function() {
            $('#btnReloadTable').prop('disabled', false);
        });
    }

    function loadUnits() {
        var $filter = $('#filterUnit').prop('disabled', true).empty()
            .append(new Option('Semua Unit Kerja', ''));
        return window.apiRequestAll('/admin/unit-kerja', ['unit_kerja', 'units']).then(function(units) {
            units.forEach(function(unit) {
                var id = unit.id || unit.id_unit_kerja;
                var name = unit.nama_unit || unit.nama_unit_kerja || unit.nama || unit.name;
                if (id != null && name) $filter.append(new Option(name, id));
            });
            $filter.prop('disabled', false).removeAttr('title');
        }).catch(function(error) {
            $filter.prop('disabled', false);
            Swal.fire('Unit Kerja Gagal Dimuat', error.message, 'error');
        });
    }

    $('#filterJenis, #filterStatus, #filterUnit').on('change', render);
    $('#btnResetFilter').on('click', function() {
        $('#filterUnit, #filterJenis, #filterStatus').val('');
        render();
    });
    $('#btnReloadTable').on('click', load);
    $(document).on('click', '.btn-detail-izin', function() {
        var item = records.find(function(row) {
            return String(row.id || row.id_pengajuan_izin) === String($(this).data('id'));
        }.bind(this));
        if (!item) return;
        var person = participant(item);
        $('#modalNama').text(person.name);
        $('#modalNimInstansi').text(person.nim + ' - ' + person.school);
        $('#modalUnit').text(person.unit);
        $('#modalPembimbing').text('Pembimbing: ' + person.mentor);
        $('#modalJenis').text(item.jenis || '-');
        $('#modalPeriode').text('(' + formatTanggal(item.tanggal_mulai) + ' s/d ' +
            formatTanggal(item.tanggal_selesai) + ')');
        $('#modalAlasan').text(item.keterangan || '-');
        $('#modalStatus').text(item.status || '-');
        $('#modalCatatan').text(item.catatan_pembimbing || '-');
        var file = item.file_surat_url || item.file_surat || '';

        if (file) {
            $('#modalBuktiNama')
                .empty()
                .append(
                    $('<a>', {
                        href: file,
                        target: '_blank',
                        rel: 'noopener noreferrer',
                        text: 'Lihat / Unduh Lampiran'
                    })
                );

            $('#modalBuktiBox').show();
            $('#modalNoBukti').hide();
        } else {
            $('#modalBuktiNama').empty();
            $('#modalBuktiBox').hide();
            $('#modalNoBukti').show();
        }
        var modal = document.getElementById('modalDetailIzin');
        if (modal) bootstrap.Modal.getOrCreateInstance(modal).show();
    });
    loadUnits();
    load();
});
