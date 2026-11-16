/* Manajemen data pembimbing lapangan melalui API Admin. */
$(document).ready(function() {
    var records = [];
    var units = [];
    var table = $('#tabelPembimbing').DataTable({
        language: {
            search: 'Cari Pembimbing:',
            lengthMenu: 'Tampilkan _MENU_ data',
            zeroRecords: 'Belum ada data',
            info: 'Menampilkan _START_ sampai _END_ dari _TOTAL_ pembimbing',
            infoEmpty: 'Menampilkan 0 data',
            infoFiltered: '(disaring dari _MAX_ total data)',
            paginate: { first: 'Awal', last: 'Akhir', next: 'Berikutnya', previous: 'Sebelumnya' }
        },
        order: [[0, 'asc']],
        columnDefs: [{ orderable: false, targets: [6] }]
    });

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    function normalize(item) {
        var unit = item.unit_kerja || item.unit || {};
        var account = item.pengguna || {};
        var participants = item.anak_bimbingan || item.peserta || item.peserta_magang || [];
        return Object.assign({}, item, {
            id: item.id,
            nip: item.nip || item.nip_pembimbing || account.username || '',
            nama_lengkap: item.nama_lengkap || account.nama_lengkap || item.nama || '',
            jabatan: item.jabatan || '',
            no_hp: item.no_hp || account.no_hp || '',
            id_unit_kerja: item.id_unit_kerja || item.unit_id || unit.id || '',
            nama_unit_kerja: item.nama_unit_kerja || unit.nama_unit || unit.nama || '',
            jumlah_bimbingan: item.jumlah_bimbingan != null ? item.jumlah_bimbingan :
                (Array.isArray(participants) ? participants.length : 0),
            anak_bimbingan: Array.isArray(participants) ? participants.map(function(row) {
                return typeof row === 'string' ? row : (row.nama_lengkap || row.nama || '-');
            }) : [],
            status_pembimbing: String(item.status_pembimbing || 'aktif').toLowerCase(),
            tanggal_mulai_tugas: item.tanggal_mulai_tugas || '',
            tanggal_selesai_tugas: item.tanggal_selesai_tugas || ''
        });
    }

    function populateUnits() {
        var $select = $('#idUnitKerjaPembimbing').empty().append(new Option('-- Pilih Unit Kerja --', ''));
        units.forEach(function(unit) {
            $select.append(new Option(unit.nama_unit || unit.nama || '-', unit.id));
        });
    }

    function renderTable() {
        table.clear();
        records.forEach(function(item, index) {
            var active = item.status_pembimbing === 'aktif';
            var unitLabel = item.nama_unit_kerja || '-';
            table.row.add([
                index + 1,
                '<div><strong>' + escapeHtml(item.nama_lengkap) + '</strong><div class="small text-muted">NIP: ' + escapeHtml(item.nip) + '</div></div>',
                escapeHtml(item.jabatan || '-'),
                '<span class="badge bg-light text-primary border">' + escapeHtml(unitLabel) + '</span>',
                '<span class="badge ' + (Number(item.jumlah_bimbingan) ? 'bg-primary' : 'bg-secondary') + '">' +
                    escapeHtml(item.jumlah_bimbingan) + ' Orang</span>',
                active ? '<span class="badge badge-approved">Aktif</span>' : '<span class="badge badge-rejected">Tidak Aktif</span>',
                '<div class="action-buttons text-center">' +
                    '<button class="btn btn-sm btn-outline-primary btn-detail-pembimbing" data-id="' + escapeHtml(item.id) + '" title="Detail"><i class="fas fa-eye"></i></button> ' +
                    '<button class="btn btn-sm btn-outline-secondary btn-edit-pembimbing" data-id="' + escapeHtml(item.id) + '" title="Edit"><i class="fas fa-edit"></i></button> ' +
                    '<button class="btn btn-sm btn-outline-secondary btn-reset-pembimbing" data-id="' + escapeHtml(item.id) + '" title="Reset Password"><i class="fas fa-key"></i></button> ' +
                    '<button class="btn btn-sm btn-outline-danger btn-hapus-pembimbing" data-id="' + escapeHtml(item.id) + '" title="Hapus"><i class="fas fa-trash"></i></button>' +
                '</div>'
            ]);
        });
        table.draw();
        $('#totalPembimbing').text(records.length);
        $('#totalAktif').text(records.filter(function(row) { return row.status_pembimbing === 'aktif'; }).length);
        $('#totalUnitTerisi').text(new Set(records.filter(function(row) {
            return row.status_pembimbing === 'aktif' && row.id_unit_kerja;
        }).map(function(row) { return String(row.id_unit_kerja); })).size + ' / ' + units.length);
    }

    function loadPage(silent) {
        $('#btnReloadTable').prop('disabled', true);
        window.apiSetTableState(table, 'loading');
        return Promise.all([
            window.adminApi.getAll('/admin/pembimbing', ['pembimbing']),
            window.adminApi.getAll('/admin/unit-kerja', ['unit_kerja', 'units']),
            window.adminApi.getAll('/admin/peserta-magang', ['peserta_magang', 'peserta'])
        ]).then(function(responses) {
            units = responses[1];
            var participants = responses[2];

            records = responses[0].map(function(item) {
                var norm = normalize(item);

                // Jika unit kerja belum terisi nama atau ID-nya, cocokkan dari daftar unit
                if (!norm.id_unit_kerja) {
                    var assignedUnit = units.find(function(u) { return String(u.id_pembimbing) === String(norm.id); });
                    if (assignedUnit) {
                        norm.id_unit_kerja = assignedUnit.id;
                        norm.nama_unit_kerja = assignedUnit.nama_unit || assignedUnit.nama || '';
                    }
                } else if (!norm.nama_unit_kerja) {
                    var u = units.find(function(row) { return String(row.id) === String(norm.id_unit_kerja); });
                    if (u) norm.nama_unit_kerja = u.nama_unit || u.nama || '';
                }

                // Cari semua ID unit yang diwakili oleh pembimbing ini
                var unitIds = units.filter(function(row) {
                    return String(row.id_pembimbing) === String(norm.id) || (norm.id_unit_kerja && String(row.id) === String(norm.id_unit_kerja));
                }).map(function(row) { return String(row.id); });
                if (norm.id_unit_kerja && unitIds.indexOf(String(norm.id_unit_kerja)) === -1) {
                    unitIds.push(String(norm.id_unit_kerja));
                }

                // Filter peserta bimbingan yang sinkron
                var myStudents = participants.filter(function(p) {
                    // Cek jika peserta langsung mencatat id pembimbing
                    var pMentorId = p.id_pembimbing || p.pembimbing_id || (p.pembimbing && p.pembimbing.id);
                    if (pMentorId && String(pMentorId) === String(norm.id)) return true;

                    // Cek jika unit kerja peserta cocok dengan unit kerja pembimbing
                    var pUnitId = p.id_unit_kerja || (p.unit_kerja && p.unit_kerja.id) || p.unit_id;
                    if (pUnitId && unitIds.indexOf(String(pUnitId)) !== -1) return true;

                    return false;
                });

                norm.jumlah_bimbingan = myStudents.length;
                norm.anak_bimbingan = myStudents.map(function(p) {
                    var acc = p.pengguna || {};
                    var name = p.nama_lengkap || acc.nama_lengkap || p.nama || '-';
                    var idNum = p.nim || p.nisn || p.username || acc.username || '';
                    return idNum ? name + ' (' + idNum + ')' : name;
                });

                return norm;
            });

            populateUnits();
            renderTable();
            window.apiSetTableState(table, 'loaded');
            return true;
        }).catch(function(error) {
            window.apiSetTableState(table, 'error');
            if (!silent) Swal.fire('Data Pembimbing Gagal Dimuat', error.message, 'error');
            return false;
        }).then(function(loaded) {
            $('#btnReloadTable').prop('disabled', false);
            return loaded;
        });
    }

    $('#btnReloadTable').on('click', loadPage);
    $('#btnTambahPembimbing').on('click', function() {
        $('#formPembimbing')[0].reset();
        $('#pembimbingId').val('');
        $('#boxPasswordPembimbing').show();
        $('#passwordPembimbing').prop('required', true);
        $('#modalPembimbingTitle').html('<i class="fas fa-user-plus me-2"></i>Tambah Pembimbing Lapangan');
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPembimbing')).show();
    });

    $('#formPembimbing').on('submit', function(event) {
        event.preventDefault();
        var id = $('#pembimbingId').val();
        var payload = {};
        new FormData(event.currentTarget).forEach(function(value, key) {
            if (key !== 'id' && value !== '') payload[key] = value;
        });
        payload.username = String($('#nipPembimbing').val()).trim();
        if (!id && !payload.password) {
            Swal.fire('Password Wajib Diisi', 'Masukkan password awal akun pembimbing.', 'warning');
            return;
        }
        var $button = $(event.currentTarget).find('button[type="submit"]').prop('disabled', true);
        var request = id
            ? window.adminApi.put('/admin/pembimbing/' + encodeURIComponent(id), payload)
            : window.adminApi.post('/admin/pembimbing', payload);
        request.then(function(responseData) {
            bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPembimbing')).hide();
            return loadPage(true).then(function(loaded) {
                Swal.fire({
                    icon: loaded ? 'success' : 'warning',
                    title: loaded ? 'Berhasil' : 'Data Tersimpan, Daftar Belum Diperbarui',
                    text: window.apiResponseMessage(responseData, 'Data pembimbing tersimpan.') +
                        (loaded ? '' : ' Daftar gagal dimuat ulang; silakan tekan tombol muat ulang.')
                });
            });
        }).catch(function(error) {
            Swal.fire('Data Pembimbing Gagal Disimpan', error.message, 'error');
        }).then(function() { $button.prop('disabled', false); });
    });

    $(document).on('click', '.btn-edit-pembimbing', function() {
        var item = records.find(function(row) { return String(row.id) === String($(this).data('id')); }.bind(this));
        if (!item) return;
        $('#formPembimbing')[0].reset();
        $('#pembimbingId').val(item.id);
        $('#nipPembimbing').val(item.nip);
        $('#usernamePembimbing').val(item.nip);
        $('#namaPembimbing').val(item.nama_lengkap);
        $('#jabatanPembimbing').val(item.jabatan);
        $('#noHpPembimbing').val(item.no_hp);
        $('#idUnitKerjaPembimbing').val(item.id_unit_kerja);
        $('#statusPembimbing').val(item.status_pembimbing);
        $('#tglMulaiTugas').val(item.tanggal_mulai_tugas);
        $('#tglSelesaiTugas').val(item.tanggal_selesai_tugas);
        $('#boxPasswordPembimbing').hide();
        $('#passwordPembimbing').prop('required', false).val('');
        $('#modalPembimbingTitle').html('<i class="fas fa-edit me-2"></i>Edit Data Pembimbing');
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPembimbing')).show();
    });

    $(document).on('click', '.btn-detail-pembimbing', function() {
        var item = records.find(function(row) { return String(row.id) === String($(this).data('id')); }.bind(this));
        if (!item) return;
        var children = item.anak_bimbingan.length
            ? '<ul class="list-group">' + item.anak_bimbingan.map(function(name) {
                return '<li class="list-group-item">' + escapeHtml(name) + '</li>';
            }).join('') + '</ul>'
            : '<p class="text-muted">Belum ada peserta bimbingan.</p>';
        $('#contentDetailPembimbing').html(
            '<dl class="row"><dt class="col-sm-4">Nama / NIP</dt><dd class="col-sm-8">' + escapeHtml(item.nama_lengkap) + ' / ' + escapeHtml(item.nip) + '</dd>' +
            '<dt class="col-sm-4">Jabatan / Unit</dt><dd class="col-sm-8">' + escapeHtml(item.jabatan) + ' / ' + escapeHtml(item.nama_unit_kerja) + '</dd>' +
            '<dt class="col-sm-4">No. HP</dt><dd class="col-sm-8">' + escapeHtml(item.no_hp) + '</dd>' +
            '<dt class="col-sm-4">Periode Tugas</dt><dd class="col-sm-8">' + escapeHtml(item.tanggal_mulai_tugas || '-') + ' s/d ' + escapeHtml(item.tanggal_selesai_tugas || '-') + '</dd></dl>' +
            '<h6>Peserta Bimbingan (' + escapeHtml(item.jumlah_bimbingan) + ')</h6>' + children
        );
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalDetailPembimbing')).show();
    });

    $(document).on('click', '.btn-hapus-pembimbing', function() {
        var item = records.find(function(row) { return String(row.id) === String($(this).data('id')); }.bind(this));
        if (!item) return;
        Swal.fire({
            title: 'Hapus Pembimbing?',
            text: 'Data ' + item.nama_lengkap + ' akan dihapus jika tidak memiliki relasi aktif.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        }).then(function(result) {
            if (!result.isConfirmed) return;
            window.adminApi.delete('/admin/pembimbing/' + encodeURIComponent(item.id))
                .then(function(responseData) {
                    return loadPage(true).then(function(loaded) {
                        Swal.fire({
                            icon: loaded ? 'success' : 'warning',
                            title: loaded ? 'Berhasil' : 'Pembimbing Dihapus, Daftar Belum Diperbarui',
                            text: window.apiResponseMessage(responseData, 'Data pembimbing dihapus.') +
                                (loaded ? '' : ' Daftar gagal dimuat ulang; silakan tekan tombol muat ulang.')
                        });
                    });
                })
                .catch(function(error) { Swal.fire('Pembimbing Gagal Dihapus', error.message, 'error'); });
        });
    });

    $(document).on('click', '.btn-reset-pembimbing', function() {
        var item = records.find(function(row) { return String(row.id) === String($(this).data('id')); }.bind(this));
        if (!item) return;
        Swal.fire({
            title: 'Reset Password?',
            text: 'Masukkan password baru untuk akun ' + item.nama_lengkap + '.',
            input: 'password',
            inputAttributes: { autocomplete: 'new-password' },
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Reset Password',
            cancelButtonText: 'Batal'
        }).then(function(result) {
            if (!result.isConfirmed || !result.value) return;
            window.adminApi.post('/reset-password/' + encodeURIComponent(item.id), { password: result.value })
                .then(function(responseData) {
                    Swal.fire('Berhasil', window.apiResponseMessage(responseData, 'Permintaan reset password berhasil diproses.'), 'success');
                })
                .catch(function(error) { Swal.fire('Reset Password Gagal', error.message, 'error'); });
        });
    });

    loadPage();
});
