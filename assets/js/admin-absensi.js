$(document).ready(function() {
    var records = [];
    var table = $('#tabelMonitoringAbsen').DataTable({
        responsive: true,
        language: {
            search: 'Cari Peserta:',
            lengthMenu: 'Tampilkan _MENU_ data',
            zeroRecords: 'Belum ada data',
            info: 'Menampilkan _START_ s/d _END_ dari _TOTAL_ presensi',
            infoEmpty: 'Menampilkan 0 data',
            paginate: { first: 'Awal', last: 'Akhir', next: '→', previous: '←' }
        },
        order: [[3, 'desc']]
    });

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    function participant(item) {
        var person = item.peserta_magang || item.peserta || {};
        var account = person.pengguna || {};
        var placement = item.penempatan || person.penempatan || {};
        var personUnit = person.unit_kerja || {};
        var recordUnit = item.unit_kerja || {};
        var unit = item.unit_kerja || person.unit_kerja || placement.unit_kerja || {};
        var mentor = personUnit.pembimbing || recordUnit.pembimbing ||
            (placement.unit_kerja && placement.unit_kerja.pembimbing) ||
            item.pembimbing || item.pembimbing_lapangan || person.pembimbing ||
            person.pembimbing_lapangan || placement.pembimbing ||
            (placement.unit_kerja && placement.unit_kerja.pembimbing) || {};
        var mentorAccount = mentor.pengguna || mentor.user || {};
        var mentorName = mentorAccount.nama_lengkap || item.nama_pembimbing ||
            mentor.nama_lengkap || mentor.nama || '';
        return {
            name: item.nama_peserta || account.nama_lengkap || person.nama_lengkap || person.nama || '-',
            nim: item.nim || account.username || person.nim || person.username || '-',
            school: item.asal_sekolah_kampus || person.asal_sekolah_kampus || person.instansi || '-',
            unit: item.nama_unit_kerja || unit.nama_unit || unit.nama || '-',
            unitId: item.id_unit_kerja || person.id_unit_kerja || unit.id || '',
            mentor: mentorName
        };
    }

    function render() {
        var statusFilter = $('#filterStatus').val();
        var unitFilter = String($('#filterUnit').val() || '');
        var visible = records.filter(function(item) {
            var person = participant(item);
            return (!statusFilter || String(item.status || '').toLowerCase() === statusFilter) &&
                (!unitFilter || String(person.unitId) === unitFilter);
        });
        table.clear();
        var counts = { masuk: 0, keluar: 0, pending: 0, rejected: 0 };
        visible.forEach(function(item, index) {
            var person = participant(item);
            var status = String(item.status || '').toLowerCase();
            var verification = String(item.status_verifikasi || 'pending').toLowerCase();
            if (status in counts) counts[status]++;
            if (verification === 'pending') counts.pending++;
            if (verification === 'rejected') counts.rejected++;
            var eventBadge = status === 'masuk'
                ? '<span class="badge bg-primary">Masuk</span>'
                : '<span class="badge bg-info text-dark">Keluar</span>';
            var verificationBadge = verification === 'approved'
                ? '<span class="badge bg-success">Approved</span>'
                : verification === 'rejected'
                    ? '<span class="badge bg-danger">Rejected</span>'
                    : '<span class="badge bg-warning text-dark">Pending</span>';
            table.row.add([
                index + 1,
                '<div class="fw-bold">' + escapeHtml(person.name) + '</div><div class="small text-muted">' +
                    escapeHtml(person.nim + ' - ' + person.school) + '</div>',
                '<div class="small fw-semibold text-primary">' + escapeHtml(person.unit) +
                    '</div><div class="small text-muted">Pembimbing: ' + escapeHtml(person.mentor || '-') + '</div>',
                '<span class="font-monospace">' + escapeHtml(formatTanggalJam(item.tanggal_jam)) + '</span>',
                eventBadge,
                '<div>' + escapeHtml(item.lokasi || '-') + '</div><small class="text-muted">' +
                    escapeHtml(item.latitude) + ', ' + escapeHtml(item.longitude) + '</small>',
                verificationBadge,
                '<button class="btn btn-sm btn-outline-primary btn-detail-absen" data-id="' +
                    escapeHtml(item.id || item.id_absensi) + '"><i class="fas fa-eye"></i> Detail</button>'
            ]);
        });
        table.draw();
        $('#statHadir').text(counts.masuk);
        $('#statTerlambat').text(counts.keluar);
        $('#statLuarRadius').text(counts.pending);
        $('#statIzinSakit').text(counts.rejected);
    }

    function load() {
        $('#btnReloadTable').prop('disabled', true);
        window.apiSetTableState(table, 'loading');
        return window.apiRequestAll('/admin/absensi', ['absensi']).then(function(rows) {
                records = rows;
                render();
                window.apiSetTableState(table, 'loaded');
                return true;
            }).catch(function(error) {
                window.apiSetTableState(table, 'error');
                Swal.fire('Data Absensi Gagal Dimuat', error.message, 'error');
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

    $('#filterStatus').on('change', render);
    $('#filterUnit').on('change', render);
    $('#btnResetFilter').on('click', function() {
        $('#filterUnit, #filterStatus').val('');
        render();
    });
    $('#btnReloadTable').on('click', load);
    $(document).on('click', '.btn-detail-absen', function() {
        var item = records.find(function(row) {
            return String(row.id || row.id_absensi) === String($(this).data('id'));
        }.bind(this));
        if (!item) return;
        var person = participant(item);
        $('#modalNama').text(person.name);
        $('#modalNimInstansi').text(person.nim + ' - ' + person.school);
        $('#modalUnit').text(person.unit);
        $('#modalPembimbing').text(person.mentor || '-');
        $('#modalWaktu').text(formatTanggalJam(item.tanggal_jam));
        $('#modalLokasiKantor').text(item.lokasi || '-');
        $('#modalRadius').text(item.latitude != null && item.longitude != null
            ? item.latitude + ', ' + item.longitude : '-');
        $('#modalVerif').text(item.status_verifikasi || '-');
        var photoUrl = item.foto_selfie_url || item.url_foto_selfie || item.foto_selfie || item.foto || '';
        if (typeof photoUrl === 'string' && photoUrl.trim()) {
            $('#modalFoto').attr('src', photoUrl.trim());
            $('#modalFotoBox').show();
            $('#modalNoFoto').hide();
        } else {
            $('#modalFoto').removeAttr('src');
            $('#modalFotoBox').hide();
            $('#modalNoFoto').show();
        }
        var modal = document.getElementById('modalDetailAbsen');
        if (modal) bootstrap.Modal.getOrCreateInstance(modal).show();
    });

    loadUnits();
    load();
});
