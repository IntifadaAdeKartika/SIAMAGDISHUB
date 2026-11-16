/* Manajemen unit kerja melalui API Admin. */
$(document).ready(function() {
    var records = [];
    var mentors = [];
    var table = $('#tabelUnitKerja').DataTable({
        language: {
            search: 'Cari Unit Kerja:',
            lengthMenu: 'Tampilkan _MENU_ data',
            zeroRecords: 'Belum ada data',
            info: 'Menampilkan _START_ sampai _END_ dari _TOTAL_ unit kerja',
            infoEmpty: 'Menampilkan 0 data',
            infoFiltered: '(disaring dari _MAX_ total data)',
            paginate: { first: 'Awal', last: 'Akhir', next: 'Berikutnya', previous: 'Sebelumnya' }
        },
        pageLength: 12,
        order: [[0, 'asc']],
        columnDefs: [{ orderable: false, targets: [8] }]
    });

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    function normalize(item) {
        var parent = item.induk || item.parent || item.unit_induk || {};
        var mentor = item.pembimbing || item.pembimbing_lapangan || {};
        var mentorAccount = mentor.pengguna || {};
        var participants = item.peserta_magang || item.peserta || [];
        return Object.assign({}, item, {
            id: item.id,
            kode_unit: item.kode_unit || item.kode || '',
            nama_unit: item.nama_unit || item.nama || '',
            tipe: String(item.tipe || item.tipe_unit || '').toLowerCase(),
            id_induk: item.id_induk || item.parent_id || parent.id || '',
            nama_induk: item.nama_induk || parent.nama_unit || parent.nama || 'Dinas Perhubungan',
            id_pembimbing: item.id_pembimbing || item.pembimbing_id || mentor.id || '',
            nama_pembimbing: item.nama_pembimbing || mentor.nama_lengkap || mentorAccount.nama_lengkap || mentor.nama || '',
            jumlah_peserta: item.jumlah_peserta != null ? item.jumlah_peserta :
                (Array.isArray(participants) ? participants.length : 0),
            status: String(item.status || 'aktif').toLowerCase()
        });
    }

    function typeLabel(value) {
        var labels = {
            sekretariat: 'Sekretariat',
            sub_bagian: 'Sub Bagian',
            bidang: 'Bidang',
            seksi: 'Seksi',
            upt: 'UPT'
        };
        return labels[value] || value || '-';
    }

    function typeBadge(value) {
        var colors = {
            sekretariat: 'bg-primary',
            sub_bagian: 'bg-info text-dark',
            bidang: 'bg-primary',
            seksi: 'bg-secondary',
            upt: 'bg-warning text-dark'
        };
        return '<span class="badge ' + (colors[value] || 'bg-secondary') + '">' + escapeHtml(typeLabel(value)) + '</span>';
    }

    function populateMentors() {
        var $select = $('#id_pembimbing, #pembimbingUnit').empty().append(new Option('-- Belum Ditentukan --', ''));
        mentors.forEach(function(mentor) {
            var unit = mentor.unit_kerja || mentor.unit || {};
            var account = mentor.pengguna || {};
            $select.append(new Option(
                (mentor.nama_lengkap || account.nama_lengkap || mentor.nama || '-') +
                    (unit.kode_unit || unit.kode ? ' (' + (unit.kode_unit || unit.kode) + ')' : ''),
                mentor.id
            ));
        });
    }

    function populateParents() {
        var current = String($('#unitId').val() || '');
        var $select = $('#idIndukUnit').empty().append(new Option('-- Tidak Ada Induk (Top Level) --', ''));
        records.forEach(function(unit) {
            if (String(unit.id) !== current) {
                $select.append(new Option(unit.nama_unit + ' (' + unit.kode_unit + ')', unit.id));
            }
        });
    }

    function renderTable() {
        table.clear();
        records.forEach(function(item, index) {
            table.row.add([
                index + 1,
                '<code>' + escapeHtml(item.kode_unit) + '</code>',
                '<strong>' + escapeHtml(item.nama_unit) + '</strong>',
                typeBadge(item.tipe),
                '<span class="small text-muted">' + escapeHtml(item.nama_induk) + '</span>',
                escapeHtml(item.nama_pembimbing || 'Belum ada'),
                '<span class="badge ' + (Number(item.jumlah_peserta) ? 'bg-primary' : 'bg-secondary') + '">' +
                    escapeHtml(item.jumlah_peserta) + ' Orang</span>',
                item.status === 'aktif' ? '<span class="badge badge-approved">Aktif</span>' : '<span class="badge badge-rejected">Nonaktif</span>',
                '<div class="action-buttons text-center">' +
                    '<button class="btn btn-sm btn-outline-primary btn-detail-unit" data-id="' + escapeHtml(item.id) + '" title="Detail"><i class="fas fa-eye"></i></button> ' +
                    '<button class="btn btn-sm btn-outline-secondary btn-edit-unit" data-id="' + escapeHtml(item.id) + '" title="Edit"><i class="fas fa-edit"></i></button> ' +
                    '<button class="btn btn-sm btn-outline-danger btn-hapus-unit" data-id="' + escapeHtml(item.id) + '" title="Hapus"><i class="fas fa-trash"></i></button>' +
                '</div>'
            ]);
        });
        table.draw();
    }

    function loadPage(silent) {
        $('#btnReloadTable').prop('disabled', true);
        window.apiSetTableState(table, 'loading');
        return Promise.all([
            window.adminApi.getAll('/admin/unit-kerja', ['unit_kerja', 'units']),
            window.adminApi.getAll('/admin/pembimbing', ['pembimbing']),
            window.adminApi.getAll('/admin/peserta-magang', ['peserta_magang', 'peserta'])
        ]).then(function(responses) {
            mentors = responses[1];
            var participants = responses[2];

            records = responses[0].map(function(raw) {
                var unit = normalize(raw);
                // Jika unit kerja belum terdata nama pembimbingnya, cocokkan dari daftar pembimbing (relasi dua arah)
                if (!unit.id_pembimbing || !unit.nama_pembimbing || unit.nama_pembimbing === 'Belum ada') {
                    var assignedMentor = mentors.find(function(m) {
                        var mUnitId = m.id_unit_kerja || (m.unit_kerja && m.unit_kerja.id) || m.unit_id;
                        return String(mUnitId) === String(unit.id) || (unit.id_pembimbing && String(unit.id_pembimbing) === String(m.id));
                    });
                    if (assignedMentor) {
                        var acc = assignedMentor.pengguna || {};
                        unit.id_pembimbing = assignedMentor.id;
                        unit.nama_pembimbing = assignedMentor.nama_lengkap || acc.nama_lengkap || assignedMentor.nama || '-';
                    }
                }

                // Hitung peserta magang yang ditempatkan di unit ini
                var unitParticipants = participants.filter(function(p) {
                    var pUnitId = p.id_unit_kerja || (p.unit_kerja && p.unit_kerja.id) || p.unit_id;
                    return String(pUnitId) === String(unit.id);
                });
                unit.jumlah_peserta = unitParticipants.length;
                unit.peserta_list = unitParticipants;

                return unit;
            });
            populateMentors();
            populateParents();
            renderTable();
            window.apiSetTableState(table, 'loaded');
            return true;
        }).catch(function(error) {
            window.apiSetTableState(table, 'error');
            if (!silent) Swal.fire('Data Unit Kerja Gagal Dimuat', error.message, 'error');
            return false;
        }).then(function(loaded) {
            $('#btnReloadTable').prop('disabled', false);
            return loaded;
        });
    }

    $('#filterTipeUnit').on('change', function() {
        var value = $(this).val();
        var normalized = value ? value.toLowerCase().replace(/ /g, '_') : '';
        table.column(3).search(normalized ? typeLabel(normalized) : '').draw();
    });
    $('#filterStatusUnit').on('change', function() {
        var value = $(this).val();
        table.column(7).search(value ? '^' + (value.toLowerCase() === 'aktif' ? 'Aktif' : 'Nonaktif') + '$' : '', true, false).draw();
    });
    $('#btnResetFilterUnit').on('click', function() {
        $('#filterTipeUnit, #filterStatusUnit').val('');
        table.search('').columns().search('').draw();
    });
    $('#btnReloadTable').on('click', loadPage);

    $('#btnTambahUnit').on('click', function() {
        $('#formUnitKerja')[0].reset();
        $('#unitId').val('');
        $('#id_pembimbing, #pembimbingUnit').val('');
        populateParents();
        $('#modalUnitTitle').html('<i class="fas fa-building me-2"></i>Tambah Unit Kerja');
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalUnitKerja')).show();
    });

    $('#formUnitKerja').on('submit', function(event) {
        event.preventDefault();
        var id = $('#unitId').val();
        var payload = {};
        new FormData(event.currentTarget).forEach(function(value, key) {
            if (key !== 'id') payload[key] = value === '' ? null : value;
        });

        // Ambil nilai id_pembimbing secara eksplisit sesuai instruksi
        var idPembimbing = $('#id_pembimbing').length ? $('#id_pembimbing').val() : $('#pembimbingUnit').val();
        if (idPembimbing !== undefined && idPembimbing !== '' && idPembimbing !== 'null') {
            payload.id_pembimbing = idPembimbing;
        } else {
            payload.id_pembimbing = null;
        }

        payload.kode_unit = String(payload.kode_unit || '').trim().toUpperCase();
        payload.nama_unit = String(payload.nama_unit || '').trim();
        var duplicate = records.find(function(unit) {
            return unit.kode_unit.toUpperCase() === payload.kode_unit.toUpperCase() && String(unit.id) !== String(id);
        });
        if (duplicate) {
            Swal.fire('Kode Sudah Digunakan', 'Kode unit sudah terdaftar untuk ' + duplicate.nama_unit + '.', 'warning');
            return;
        }
        var $button = $(event.currentTarget).find('button[type="submit"]').prop('disabled', true);
        var request = id
            ? window.adminApi.put('/admin/unit-kerja/' + encodeURIComponent(id), payload)
            : window.adminApi.post('/admin/unit-kerja', payload);
        request.then(function(responseData) {
            bootstrap.Modal.getOrCreateInstance(document.getElementById('modalUnitKerja')).hide();
            return loadPage(true).then(function(loaded) {
                Swal.fire({
                    icon: loaded ? 'success' : 'warning',
                    title: loaded ? 'Berhasil' : 'Data Tersimpan, Daftar Belum Diperbarui',
                    text: window.apiResponseMessage(responseData, 'Data unit kerja tersimpan.') +
                        (loaded ? '' : ' Daftar gagal dimuat ulang; silakan tekan tombol muat ulang.')
                });
            });
        }).catch(function(error) {
            Swal.fire('Data Unit Kerja Gagal Disimpan', error.message, 'error');
        }).then(function() { $button.prop('disabled', false); });
    });

    $(document).on('click', '.btn-edit-unit', function() {
        var item = records.find(function(unit) { return String(unit.id) === String($(this).data('id')); }.bind(this));
        if (!item) return;
        $('#formUnitKerja')[0].reset();
        $('#unitId').val(item.id);
        $('#kodeUnit').val(item.kode_unit);
        $('#namaUnit').val(item.nama_unit);
        $('#tipeUnit').val(item.tipe);
        populateParents();
        $('#idIndukUnit').val(item.id_induk || '');
        $('#id_pembimbing, #pembimbingUnit').val(item.id_pembimbing || '');
        $('#statusUnit').val(/nonaktif|tidak aktif/.test(item.status) ? 'nonaktif' : 'aktif');
        $('#modalUnitTitle').html('<i class="fas fa-edit me-2"></i>Edit Unit Kerja');
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalUnitKerja')).show();
    });

    $(document).on('click', '.btn-detail-unit', function() {
        var item = records.find(function(unit) { return String(unit.id) === String($(this).data('id')); }.bind(this));
        if (!item) return;
        var participantsList = item.peserta_list && item.peserta_list.length
            ? '<ul class="list-group list-group-flush border rounded mt-1">' + item.peserta_list.map(function(p) {
                var pAcc = p.pengguna || {};
                var name = p.nama_lengkap || pAcc.nama_lengkap || p.nama || '-';
                var idNum = p.nim || p.nisn || p.username || pAcc.username || '';
                return '<li class="list-group-item py-1 small d-flex justify-content-between align-items-center">' +
                    '<span>' + escapeHtml(name) + '</span>' +
                    (idNum ? '<span class="text-muted">' + escapeHtml(idNum) + '</span>' : '') +
                '</li>';
            }).join('') + '</ul>'
            : '<span class="text-muted small">Belum ada peserta magang</span>';

        $('#contentDetailUnit').html(
            '<dl class="row mb-0"><dt class="col-sm-5">Kode / Nama</dt><dd class="col-sm-7">' + escapeHtml(item.kode_unit) + ' / ' + escapeHtml(item.nama_unit) + '</dd>' +
            '<dt class="col-sm-5">Tipe / Status</dt><dd class="col-sm-7">' + escapeHtml(typeLabel(item.tipe)) + ' / ' + escapeHtml(item.status) + '</dd>' +
            '<dt class="col-sm-5">Unit Induk</dt><dd class="col-sm-7">' + escapeHtml(item.nama_induk) + '</dd>' +
            '<dt class="col-sm-5">Pembimbing</dt><dd class="col-sm-7">' + escapeHtml(item.nama_pembimbing || '-') + '</dd>' +
            '<dt class="col-sm-5">Jumlah Peserta</dt><dd class="col-sm-7">' + escapeHtml(item.jumlah_peserta) + ' Orang</dd>' +
            '<dt class="col-sm-5 mt-2">Daftar Peserta</dt><dd class="col-sm-7 mt-2">' + participantsList + '</dd></dl>'
        );
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalDetailUnit')).show();
    });

    $(document).on('click', '.btn-hapus-unit', function() {
        var item = records.find(function(unit) { return String(unit.id) === String($(this).data('id')); }.bind(this));
        if (!item) return;
        Swal.fire({
            title: 'Hapus Unit Kerja?',
            text: 'Unit ' + item.nama_unit + ' akan dihapus jika tidak memiliki relasi aktif.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        }).then(function(result) {
            if (!result.isConfirmed) return;
            window.adminApi.delete('/admin/unit-kerja/' + encodeURIComponent(item.id))
                .then(function(responseData) {
                    return loadPage(true).then(function(loaded) {
                        Swal.fire({
                            icon: loaded ? 'success' : 'warning',
                            title: loaded ? 'Berhasil' : 'Unit Dihapus, Daftar Belum Diperbarui',
                            text: window.apiResponseMessage(responseData, 'Unit kerja dihapus.') +
                                (loaded ? '' : ' Daftar gagal dimuat ulang; silakan tekan tombol muat ulang.')
                        });
                    });
                })
                .catch(function(error) { Swal.fire('Unit Kerja Gagal Dihapus', error.message, 'error'); });
        });
    });

    loadPage();
});
