/* Manajemen data peserta magang melalui API Admin. */
$(document).ready(function() {
    var records = [];
    var listUnitKerja = [];
    var table = $('#tabelPeserta').DataTable({
        language: {
            search: 'Cari Peserta:',
            lengthMenu: 'Tampilkan _MENU_ data',
            zeroRecords: 'Belum ada data',
            info: 'Menampilkan _START_ sampai _END_ dari _TOTAL_ peserta',
            infoEmpty: 'Menampilkan 0 data',
            infoFiltered: '(disaring dari _MAX_ total data)',
            paginate: { first: 'Awal', last: 'Akhir', next: 'Berikutnya', previous: 'Sebelumnya' }
        },
        order: [[0, 'asc']],
        columnDefs: [{ orderable: false, targets: [8] }]
    });

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    function resolveMentorName(source) {
        if (!source || typeof source !== 'object') return '';

        // Coba semua kemungkinan path relasi dari backend
        var candidates = [
            source,
            source.unit_kerja,
            source.unit
        ].filter(Boolean);

        for (var c = 0; c < candidates.length; c++) {
            var obj = candidates[c];
            var mentor = obj.pembimbing || obj.pembimbing_lapangan;
            if (mentor) {
                var userAcc = mentor.pengguna || mentor.user || mentor.account;
                var n = (userAcc && (userAcc.nama_lengkap || userAcc.nama)) ||
                        mentor.nama_lengkap || mentor.nama || '';
                if (n) return String(n).trim();
            }
            // Field langsung (denormalized)
            var flat = obj.nama_pembimbing || obj.nama_pembimbing_lapangan;
            if (flat) return String(flat).trim();
        }

        return '';
    }

    function normalize(item) {
        var unit = item.unit_kerja || item.unit || {};
        var account = item.pengguna || {};
        var unitId = item.id_unit_kerja || item.unit_id || unit.id || '';

        // Prioritaskan relasi unit_kerja.pembimbing.pengguna.nama_lengkap
        var mentorName = resolveMentorName(item);
        if (!mentorName && unitId && Array.isArray(listUnitKerja) && listUnitKerja.length > 0) {
            var matchedUnit = listUnitKerja.find(function(u) { return String(u.id) === String(unitId); });
            if (matchedUnit && matchedUnit.nama_pembimbing) {
                mentorName = matchedUnit.nama_pembimbing;
            }
        }

        var unitName = item.nama_unit_kerja || unit.nama_unit || unit.nama || '';
        if (!unitName && unitId && Array.isArray(listUnitKerja) && listUnitKerja.length > 0) {
            var matchedUnitForName = listUnitKerja.find(function(u) { return String(u.id) === String(unitId); });
            if (matchedUnitForName && matchedUnitForName.nama_unit) {
                unitName = matchedUnitForName.nama_unit;
            }
        }

        return Object.assign({}, item, {
            id: item.id,
            jenis_peserta: String(item.jenis_peserta || item.jenis || 'mahasiswa').toLowerCase(),
            username: item.username || account.username || item.nim || item.nisn || '',
            nama_lengkap: item.nama_lengkap || account.nama_lengkap || item.nama || '',
            no_hp: item.no_hp || account.no_hp || '',
            asal_sekolah_kampus: item.asal_sekolah_kampus || item.instansi || item.asal_instansi || '',
            prodi_jurusan: item.prodi_jurusan || item.jurusan || '',
            kelas_semester: item.kelas_semester || item.kelas || item.semester || '',
            pembimbing_akademik: item.pembimbing_akademik || '',
            nip_pembimbing_akademik: item.nip_pembimbing_akademik || '',
            no_hp_pembimbing_akademik: item.no_hp_pembimbing_akademik || '',
            id_unit_kerja: unitId,
            nama_unit_kerja: unitName,
            nama_pembimbing: mentorName || '',
            tanggal_mulai: item.tanggal_mulai || '',
            tanggal_selesai: item.tanggal_selesai || '',
            status_peserta: String(item.status_peserta || item.status || 'aktif').toLowerCase(),
            status_dokumen: String(item.status_dokumen || 'pending').toLowerCase()
        });
    }

    function populateUnits() {
        var $unitForm = $('#id_unit_kerja, #idUnitKerja').empty().append(new Option('-- Pilih Unit Kerja --', ''));
        var $unitFilter = $('#filterUnit').empty().append(new Option('Semua Unit Kerja', ''));
        listUnitKerja.forEach(function(unit) {
            var name = unit.nama_unit || '-';
            $unitForm.append(new Option(name, unit.id));
            $unitFilter.append(new Option(name, name));
        });
    }

    function renderTable() {
        table.clear();
        records.forEach(function(item, index) {
            var typeBadge = item.jenis_peserta === 'siswa'
                ? '<span class="badge" style="background:#e8daef;color:#8e44ad;">Siswa</span>'
                : '<span class="badge" style="background:#dbeafe;color:#2563eb;">Mahasiswa</span>';
            var statusLabels = { aktif: 'Aktif', 'belum mulai': 'Belum Mulai', 'tidak aktif': 'Tidak Aktif' };
            var statusLabel = statusLabels[item.status_peserta] || item.status_peserta;
            var statusClass = item.status_peserta === 'aktif' ? 'badge-approved' :
                (item.status_peserta === 'belum mulai' ? 'badge-pending' : 'badge-rejected');
            var status = '<span class="badge ' + statusClass + '">' + escapeHtml(statusLabel) + '</span>';
            var documentStatus = item.status_dokumen === 'lengkap'
                ? '<span class="badge bg-success">Lengkap</span>'
                : '<span class="badge bg-secondary">Pending</span>';
            table.row.add([
                index + 1,
                '<div><strong>' + escapeHtml(item.nama_lengkap) + '</strong><div class="small text-muted">' +
                    escapeHtml(item.username) + ' · ' + typeBadge + '</div></div>',
                '<div><strong>' + escapeHtml(item.asal_sekolah_kampus) + '</strong><div class="small text-muted">' +
                    escapeHtml(item.prodi_jurusan || '-') + ' (' + escapeHtml(item.kelas_semester || '-') + ')</div>' +
                    '<div class="small text-primary"><i class="fas fa-chalkboard-teacher me-1"></i>' + escapeHtml(item.pembimbing_akademik || '-') + '</div></div>',
                escapeHtml(item.nama_unit_kerja || '-'),
                escapeHtml(item.nama_pembimbing || '-'),
                escapeHtml(item.tanggal_mulai) + '<br>' + escapeHtml(item.tanggal_selesai),
                status,
                documentStatus,
                '<div class="action-buttons text-center">' +
                    '<button class="btn btn-sm btn-outline-primary btn-detail" data-id="' + escapeHtml(item.id) + '" title="Detail"><i class="fas fa-eye"></i></button> ' +
                    '<button class="btn btn-sm btn-outline-secondary btn-edit" data-id="' + escapeHtml(item.id) + '" title="Edit"><i class="fas fa-edit"></i></button> ' +
                    '<button class="btn btn-sm btn-outline-secondary btn-reset-pass" data-id="' + escapeHtml(item.id) + '" title="Reset Password"><i class="fas fa-key"></i></button> ' +
                    '<button class="btn btn-sm btn-outline-danger btn-hapus" data-id="' + escapeHtml(item.id) + '" title="Hapus"><i class="fas fa-trash"></i></button>' +
                '</div>'
            ]);
        });
        table.draw();
    }

    function loadPage(silent) {
        $('#btnReloadTable').prop('disabled', true);
        window.apiSetTableState(table, 'loading');
        return Promise.all([
            window.adminApi.getAll('/admin/peserta-magang', ['peserta_magang', 'peserta']),
            window.adminApi.getAll('/admin/unit-kerja', ['unit_kerja', 'units']),
            window.adminApi.getAll('/admin/pembimbing', ['pembimbing'])
        ]).then(function(responses) {
            var rawUnits = responses[1];

            // Buat lookup pembimbing by id dari daftar pembimbing
            var rawPembimbing = responses[2];
            var pembimbingById = {};
            rawPembimbing.forEach(function(p) {
                var nama = '';
                var akun = p.pengguna || p.user || p.account;
                if (akun) nama = akun.nama_lengkap || akun.nama || '';
                if (!nama) nama = p.nama_lengkap || p.nama || '';
                if (p.id && nama) pembimbingById[String(p.id)] = nama;
            });

            listUnitKerja = rawUnits.map(function(unit) {
                // Coba resolve dari relasi dulu
                var nm = resolveMentorName(unit);
                // Fallback 1: jika kosong tapi id_pembimbing ada, cari dari lookup
                if (!nm && unit.id_pembimbing) {
                    nm = pembimbingById[String(unit.id_pembimbing)] || '';
                }
                // Fallback 2: jika masih belum ketemu, cari pembimbing yang ditugaskan di unit ini (p.id_unit_kerja == unit.id)
                if (!nm) {
                    var assigned = rawPembimbing.find(function(p) {
                        var pUnitId = p.id_unit_kerja || (p.unit_kerja && p.unit_kerja.id) || p.unit_id;
                        return String(pUnitId) === String(unit.id);
                    });
                    if (assigned) {
                        var acc = assigned.pengguna || assigned.user || {};
                        nm = acc.nama_lengkap || acc.nama || assigned.nama_lengkap || assigned.nama || '';
                    }
                }
                return {
                    id: unit.id,
                    nama_unit: unit.nama_unit || unit.nama || '',
                    nama_pembimbing: nm,
                    raw: unit
                };
            });

            records = responses[0].map(normalize);
            populateUnits();
            renderTable();
            window.apiSetTableState(table, 'loaded');
            return true;
        }).catch(function(error) {
            window.apiSetTableState(table, 'error');
            if (!silent) Swal.fire('Data Peserta Gagal Dimuat', error.message, 'error');
            return false;
        }).then(function(loaded) {
            $('#btnReloadTable').prop('disabled', false);
            return loaded;
        });
    }

    $('#filterJenis').on('change', function() {
        table.column(1).search($(this).val() ? ($(this).val() === 'Siswa' ? 'Siswa' : 'Mahasiswa') : '').draw();
    });
    $('#filterUnit').on('change', function() { table.column(3).search($(this).val()).draw(); });
    $('#filterStatus').on('change', function() {
        var value = $(this).val();
        var labels = { aktif: 'Aktif', 'belum mulai': 'Belum Mulai', 'tidak aktif': 'Tidak Aktif' };
        table.column(6).search(value ? '^' + (labels[value] || value) + '$' : '', true, false).draw();
    });
    $('#btnResetFilter').on('click', function() {
        $('#filterJenis, #filterUnit, #filterStatus').val('');
        table.search('').columns().search('').draw();
    });
    $('#btnReloadTable').on('click', loadPage);
    $('#jenisPeserta').on('change', function() {
        var student = $(this).val() === 'siswa';
        $('#labelUsername').html((student ? 'Username / NISN' : 'Username (Kode Kampus + NIM)') + ' <span class="text-danger">*</span>');
        $('#usernamePeserta').attr('placeholder', student ? 'Contoh: 0054321980' : 'Contoh: UMP-202151001');
        $('#hintUsername').text(student ? 'Untuk siswa: NISN sebagai username login.' : 'Untuk mahasiswa: Kode Kampus + NIM sebagai username.');
    });
    $('#id_unit_kerja, #idUnitKerja').on('change', function() {
        var selectedId = $(this).val();
        if (!selectedId) {
            $('#previewPembimbing').text('-');
            return;
        }
        var foundUnit = listUnitKerja.find(function(unit) {
            return String(unit.id) === String(selectedId);
        });
        var namaPembimbing = foundUnit && foundUnit.nama_pembimbing ? foundUnit.nama_pembimbing : '-';
        $('#previewPembimbing').text(namaPembimbing);
    });
    $('#btnTambahPeserta').on('click', function() {
        $('#formPeserta')[0].reset();
        $('#pesertaId').val('');
        $('#boxPassword').show();
        $('#passwordPeserta').prop('required', true);
        $('#modalPesertaTitle').html('<i class="fas fa-user-plus me-2"></i>Tambah Peserta Magang');
        $('#previewPembimbing').text('-');
        $('#id_unit_kerja, #idUnitKerja').val('').trigger('change');
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPeserta')).show();
    });

    $('#formPeserta').on('submit', function(event) {
        event.preventDefault();
        var form = event.currentTarget;
        var id = $('#pesertaId').val();
        var payload = {};
        new FormData(form).forEach(function(value, key) {
            if (key !== 'id' && value !== '') payload[key] = value;
        });
        if (!id && !payload.password) {
            Swal.fire('Password Wajib Diisi', 'Masukkan password awal akun peserta.', 'warning');
            return;
        }
        if (new Date(payload.tanggal_mulai) > new Date(payload.tanggal_selesai)) {
            Swal.fire('Validasi Gagal', 'Tanggal selesai magang harus setelah tanggal mulai.', 'warning');
            return;
        }
        var $button = $('#btnSimpanPeserta').prop('disabled', true);
        var request = id
            ? window.adminApi.put('/admin/peserta-magang/' + encodeURIComponent(id), payload)
            : window.adminApi.post('/admin/peserta-magang', payload);
        request.then(function(responseData) {
            bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPeserta')).hide();
            return loadPage(true).then(function(loaded) {
                Swal.fire({
                    icon: loaded ? 'success' : 'warning',
                    title: loaded ? 'Berhasil' : 'Data Tersimpan, Daftar Belum Diperbarui',
                    text: window.apiResponseMessage(responseData, id ? 'Data peserta diperbarui.' : 'Peserta berhasil ditambahkan.') +
                        (loaded ? '' : ' Daftar gagal dimuat ulang; silakan tekan tombol muat ulang.')
                });
            });
        }).catch(function(error) {
            Swal.fire('Data Peserta Gagal Disimpan', error.message, 'error');
        }).then(function() { $button.prop('disabled', false); });
    });

    $(document).on('click', '.btn-edit', function() {
        var item = records.find(function(record) { return String(record.id) === String($(this).data('id')); }.bind(this));
        if (!item) return;
        $('#formPeserta')[0].reset();
        $('#pesertaId').val(item.id);
        $('#jenisPeserta').val(item.jenis_peserta).trigger('change');
        $('#usernamePeserta').val(item.username);
        $('#namaLengkap').val(item.nama_lengkap);
        $('#noHp').val(item.no_hp);
        $('#asalSekolahKampus').val(item.asal_sekolah_kampus);
        $('#prodiJurusan').val(item.prodi_jurusan);
        $('#kelasSemester').val(item.kelas_semester);
        $('#pembimbingAkademik').val(item.pembimbing_akademik);
        $('#nipPembimbingAkademik').val(item.nip_pembimbing_akademik);
        $('#noHpPembimbingAkademik').val(item.no_hp_pembimbing_akademik);
        $('#id_unit_kerja, #idUnitKerja').val(item.id_unit_kerja).trigger('change');
        if ($('#previewPembimbing').text() === '-' && item.nama_pembimbing) {
            $('#previewPembimbing').text(item.nama_pembimbing);
        }
        $('#statusPeserta').val(item.status_peserta);
        $('#tanggalMulai').val(item.tanggal_mulai);
        $('#tanggalSelesai').val(item.tanggal_selesai);
        $('#boxPassword').hide();
        $('#passwordPeserta').prop('required', false).val('');
        $('#modalPesertaTitle').html('<i class="fas fa-user-edit me-2"></i>Edit Data Peserta');
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPeserta')).show();
    });

    $(document).on('click', '.btn-detail', function() {
        var item = records.find(function(record) { return String(record.id) === String($(this).data('id')); }.bind(this));
        if (!item) return;
        $('#contentDetailPeserta').html(
            '<dl class="row mb-0">' +
            '<dt class="col-sm-5">Nama / Username</dt><dd class="col-sm-7">' + escapeHtml(item.nama_lengkap) + ' / ' + escapeHtml(item.username) + '</dd>' +
            '<dt class="col-sm-5">Asal / Prodi</dt><dd class="col-sm-7">' + escapeHtml(item.asal_sekolah_kampus) + ' / ' + escapeHtml(item.prodi_jurusan || '-') + '</dd>' +
            '<dt class="col-sm-5">No. HP</dt><dd class="col-sm-7">' + escapeHtml(item.no_hp) + '</dd>' +
            '<dt class="col-sm-5">Pembimbing Akademik</dt><dd class="col-sm-7">' + escapeHtml(item.pembimbing_akademik) + '</dd>' +
            '<dt class="col-sm-5">NIDN/NIP</dt><dd class="col-sm-7">' + escapeHtml(item.nip_pembimbing_akademik) + '</dd>' +
            '<dt class="col-sm-5">HP Pembimbing Akademik</dt><dd class="col-sm-7">' + escapeHtml(item.no_hp_pembimbing_akademik) + '</dd>' +
            '<dt class="col-sm-5">Unit / Pembimbing Lapangan</dt><dd class="col-sm-7">' + escapeHtml(item.nama_unit_kerja) + ' / ' + escapeHtml(item.nama_pembimbing) + '</dd>' +
            '<dt class="col-sm-5">Periode</dt><dd class="col-sm-7">' + escapeHtml(item.tanggal_mulai) + ' s/d ' + escapeHtml(item.tanggal_selesai) + '</dd>' +
            '<dt class="col-sm-5">Status / Dokumen</dt><dd class="col-sm-7">' + escapeHtml(item.status_peserta) + ' / ' + escapeHtml(item.status_dokumen) + '</dd></dl>'
        );
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalDetailPeserta')).show();
    });

    $(document).on('click', '.btn-hapus', function() {
        var item = records.find(function(record) { return String(record.id) === String($(this).data('id')); }.bind(this));
        if (!item) return;
        Swal.fire({
            title: 'Hapus Peserta Magang?',
            text: 'Data ' + item.nama_lengkap + ' akan dihapus. Tindakan ini mengikuti kebijakan backend.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        }).then(function(result) {
            if (!result.isConfirmed) return;
            window.adminApi.delete('/admin/peserta-magang/' + encodeURIComponent(item.id))
                .then(function(responseData) {
                    return loadPage(true).then(function(loaded) {
                        Swal.fire({
                            icon: loaded ? 'success' : 'warning',
                            title: loaded ? 'Berhasil' : 'Peserta Dihapus, Daftar Belum Diperbarui',
                            text: window.apiResponseMessage(responseData, 'Data peserta dihapus.') +
                                (loaded ? '' : ' Daftar gagal dimuat ulang; silakan tekan tombol muat ulang.')
                        });
                    });
                })
                .catch(function(error) { Swal.fire('Peserta Gagal Dihapus', error.message, 'error'); });
        });
    });

    $(document).on('click', '.btn-reset-pass', function() {
        var item = records.find(function(record) { return String(record.id) === String($(this).data('id')); }.bind(this));
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
