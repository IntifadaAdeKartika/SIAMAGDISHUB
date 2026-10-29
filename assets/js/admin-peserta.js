/* admin-peserta.js 
   Manajemen CRUD Peserta Magang (Siswa & Mahasiswa)
   Menggunakan jQuery, DataTables, dan SweetAlert2 
*/

$(document).ready(function() {

    // Data peserta magang
    var dataPeserta = window.masterPeserta.map(function(peserta) {
        var penempatan = window.getMasterPenempatanPeserta(peserta.id);
        var isSiswa = /^(SMK|SMA)/i.test(peserta.instansi);
        var prodiDefault = isSiswa ? "Teknik Kendaraan Ringan" : "Teknik Informatika";
        var kelasDefault = isSiswa ? "Kelas XII" : "Semester 7";
        var hpDefault = "0812345" + (67800 + peserta.id);

        return {
            id: peserta.id,
            jenis_peserta: isSiswa ? "siswa" : "mahasiswa",
            username: peserta.nim,
            nama_lengkap: peserta.nama,
            no_hp: hpDefault,
            asal_sekolah_kampus: peserta.instansi,
            prodi_jurusan: prodiDefault,
            kelas_semester: kelasDefault,
            id_unit_kerja: peserta.unitId,
            nama_unit_kerja: penempatan.unit.nama,
            nama_pembimbing: penempatan.namaPembimbing,
            tanggal_mulai: "2026-08-01",
            tanggal_selesai: "2026-11-30",
            status_peserta: "aktif"
        };
    });
    
    // Inisialisasi DataTable
    var table = $('#tabelPeserta').DataTable({
        language: {
            search: "Cari Peserta:",
            lengthMenu: "Tampilkan _MENU_ data",
            zeroRecords: "Data tidak ditemukan",
            info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ peserta",
            infoEmpty: "Menampilkan 0 data",
            infoFiltered: "(disaring dari _MAX_ total data)",
            paginate: {
                first: "Awal",
                last: "Akhir",
                next: "Berikutnya",
                previous: "Sebelumnya"
            }
        },
        order: [[0, 'asc']],
        columnDefs: [
            { orderable: false, targets: [7] }
        ]
    });

    // Fungsi Render Baris Tabel
    function renderTable() {
        table.clear();
        dataPeserta.forEach(function(item, idx) {
            var badgeStatus = '';
            if (item.status_peserta === 'aktif') {
                badgeStatus = '<span class="badge badge-approved">Aktif</span>';
            } else if (item.status_peserta === 'belum mulai') {
                badgeStatus = '<span class="badge badge-pending">Belum Mulai</span>';
            } else {
                badgeStatus = '<span class="badge badge-rejected">Tidak Aktif</span>';
            }

            var badgeJenis = item.jenis_peserta === 'siswa' 
                ? '<span class="badge" style="background:#e8daef; color:#8e44ad; font-size:0.7rem;">Siswa</span>' 
                : '<span class="badge" style="background:#dbeafe; color:#2563eb; font-size:0.7rem;">Mahasiswa</span>';

            var colIdentitas = `
                <div>
                    <strong style="color:var(--primary-dark);">${item.nama_lengkap}</strong>
                    <div style="font-size:0.76rem; color:#777;">
                        <i class="fas fa-id-badge me-1"></i>${item.username} &bull; ${badgeJenis}
                    </div>
                </div>
            `;

            var colAsal = `
                <div>
                    <div style="font-size:0.84rem; font-weight:500;">${item.asal_sekolah_kampus}</div>
                    <div style="font-size:0.75rem; color:#888;">${item.prodi_jurusan || '-'} (${item.kelas_semester || '-'})</div>
                </div>
            `;

            var colUnit = `<span style="font-size:0.83rem; font-weight:500;">${item.nama_unit_kerja}</span>`;
            var colPembimbing = `<div style="font-size:0.82rem; color:#444;"><i class="fas fa-user-tie me-1 text-primary"></i>${item.nama_pembimbing}</div>`;
            var colPeriode = `<div style="font-size:0.76rem; color:#666;">${item.tanggal_mulai}<br>&rarr; ${item.tanggal_selesai}</div>`;

            var colAksi = `
                <div class="action-buttons text-center">
                    <button class="btn btn-sm btn-outline-primary btn-aksi btn-detail" data-id="${item.id}" title="Detail">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary btn-aksi btn-edit" data-id="${item.id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary btn-aksi btn-reset-pass" data-id="${item.id}" title="Reset Password">
                        <i class="fas fa-key"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger btn-aksi btn-hapus" data-id="${item.id}" title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            table.row.add([
                idx + 1,
                colIdentitas,
                colAsal,
                colUnit,
                colPembimbing,
                colPeriode,
                badgeStatus,
                colAksi
            ]);
        });
        table.draw();
    }

    // Render data awal
    renderTable();

    // Event Filter Jenis
    $('#filterJenis').on('change', function() {
        var val = $(this).val();
        table.column(1).search(val).draw();
    });

    // Event Filter Unit Kerja
    $('#filterUnit').on('change', function() {
        var val = $(this).val();
        table.column(3).search(val).draw();
    });

    // Event Filter Status
    $('#filterStatus').on('change', function() {
        var val = $(this).val();
        table.column(6).search(val).draw();
    });

    // Reset Filter
    $('#btnResetFilter').on('click', function() {
        $('#filterJenis').val('');
        $('#filterUnit').val('');
        $('#filterStatus').val('');
        table.search('').columns().search('').draw();
    });

    // Refresh Table
    $('#btnReloadTable').on('click', function() {
        renderTable();
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Data berhasil diperbarui',
            showConfirmButton: false,
            timer: 1500
        });
    });

    // Ubah label Username & Hint sesuai jenis peserta
    $('#jenisPeserta').on('change', function() {
        var jenis = $(this).val();
        if (jenis === 'siswa') {
            $('#labelUsername').html('Username / NISN <span class="text-danger">*</span>');
            $('#usernamePeserta').attr('placeholder', 'Contoh: 0054321980 (10 Digit NISN)');
            $('#hintUsername').text('Untuk siswa: NISN sebagai username login.');
        } else {
            $('#labelUsername').html('Username (Kode Kampus + NIM) <span class="text-danger">*</span>');
            $('#usernamePeserta').attr('placeholder', 'Contoh: UMP-202151001');
            $('#hintUsername').text('Untuk mahasiswa: Kode Kampus + NIM sebagai username.');
        }
    });

    // Auto update pembimbing saat unit kerja dipilih
    $('#idUnitKerja').on('change', function() {
        var pembimbing = window.getMasterPembimbingForUnit($(this).val());
        pembimbing = pembimbing ? pembimbing.nama : '-';
        $('#previewPembimbing').text(pembimbing);
    });

    $('#idUnitKerja option').not('[value=""]').remove();
    window.masterUnitKerja.forEach(function(unit) {
        $('#idUnitKerja').append(new Option(
            unit.nama + ' (' + unit.kode + ')',
            unit.id
        ));
    });

    // Buka Modal Tambah
    $('#btnTambahPeserta').on('click', function() {
        $('#formPeserta')[0].reset();
        $('#pesertaId').val('');
        $('#modalPesertaTitle').html('<i class="fas fa-user-plus me-2"></i>Tambah Peserta Magang');
        $('#previewPembimbing').text('-');
        $('#boxPassword').show();
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPeserta')).show();
    });

    // Submit Form (Tambah / Edit)
    $('#formPeserta').on('submit', function(e) {
        e.preventDefault();

        var id = $('#pesertaId').val();
        var jenis = $('#jenisPeserta').val();
        var username = $('#usernamePeserta').val().trim();
        var nama = $('#namaLengkap').val().trim();
        var noHp = $('#noHp').val().trim();
        var asal = $('#asalSekolahKampus').val().trim();
        var prodi = $('#prodiJurusan').val().trim();
        var kelas = $('#kelasSemester').val().trim();
        var unitId = $('#idUnitKerja').val();
        var unitNama = $('#idUnitKerja option:selected').text().split('(')[0].trim();
        var pembimbing = window.getMasterPembimbingForUnit(unitId);
        var pembimbingNama = pembimbing ? pembimbing.nama : '-';
        var status = $('#statusPeserta').val();
        var tglMulai = $('#tanggalMulai').val();
        var tglSelesai = $('#tanggalSelesai').val();

        if (new Date(tglMulai) > new Date(tglSelesai)) {
            Swal.fire('Validasi Gagal', 'Tanggal selesai magang harus setelah tanggal mulai!', 'warning');
            return;
        }

        if (id) {
            // Mode EDIT
            var idx = dataPeserta.findIndex(p => p.id == id);
            if (idx !== -1) {
                dataPeserta[idx] = {
                    id: parseInt(id),
                    username: username,
                    nama_lengkap: nama,
                    jenis_peserta: jenis,
                    asal_sekolah_kampus: asal,
                    prodi_jurusan: prodi,
                    kelas_semester: kelas,
                    no_hp: noHp,
                    id_unit_kerja: unitId,
                    nama_unit_kerja: unitNama,
                    nama_pembimbing: pembimbingNama,
                    tanggal_mulai: tglMulai,
                    tanggal_selesai: tglSelesai,
                    status_peserta: status
                };
            }
            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: 'Data peserta magang berhasil diperbarui.',
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            // Mode TAMBAH
            var newId = dataPeserta.length ? Math.max(...dataPeserta.map(p => p.id)) + 1 : 1;
            dataPeserta.push({
                id: newId,
                username: username,
                nama_lengkap: nama,
                jenis_peserta: jenis,
                asal_sekolah_kampus: asal,
                prodi_jurusan: prodi,
                kelas_semester: kelas,
                no_hp: noHp,
                id_unit_kerja: unitId,
                nama_unit_kerja: unitNama,
                nama_pembimbing: pembimbingNama,
                tanggal_mulai: tglMulai,
                tanggal_selesai: tglSelesai,
                status_peserta: status
            });
            Swal.fire({
                icon: 'success',
                title: 'Berhasil Ditambahkan!',
                text: 'Akun peserta dibuat dengan username ' + username + ' dan password default magang123',
                confirmButtonColor: '#334EAC'
            });
        }

        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPeserta')).hide();
        renderTable();
    });

    // Tombol Edit
    $(document).on('click', '.btn-edit', function() {
        var id = $(this).data('id');
        var item = dataPeserta.find(p => p.id == id);
        if (!item) return;

        $('#pesertaId').val(item.id);
        $('#jenisPeserta').val(item.jenis_peserta).trigger('change');
        $('#usernamePeserta').val(item.username);
        $('#namaLengkap').val(item.nama_lengkap);
        $('#noHp').val(item.no_hp);
        $('#asalSekolahKampus').val(item.asal_sekolah_kampus);
        $('#prodiJurusan').val(item.prodi_jurusan);
        $('#kelasSemester').val(item.kelas_semester);
        $('#idUnitKerja').val(item.id_unit_kerja).trigger('change');
        $('#statusPeserta').val(item.status_peserta);
        $('#tanggalMulai').val(item.tanggal_mulai);
        $('#tanggalSelesai').val(item.tanggal_selesai);

        $('#boxPassword').hide();
        $('#modalPesertaTitle').html('<i class="fas fa-user-edit me-2"></i>Edit Data Peserta');
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPeserta')).show();
    });

    // Tombol Detail
    $(document).on('click', '.btn-detail', function() {
        var id = $(this).data('id');
        var item = dataPeserta.find(p => p.id == id);
        if (!item) return;

        var badgeStatus = item.status_peserta === 'aktif'
            ? '<span class="badge badge-approved">Aktif</span>'
            : (item.status_peserta === 'belum mulai' ? '<span class="badge badge-pending">Belum Mulai</span>' : '<span class="badge badge-rejected">Tidak Aktif</span>');

        var badgeJenis = item.jenis_peserta === 'siswa'
            ? '<span class="badge" style="background:#e8daef; color:#8e44ad;">Siswa</span>'
            : '<span class="badge" style="background:#dbeafe; color:#2563eb;">Mahasiswa</span>';

        var html = `
            <div class="card border-0 mb-3" style="background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%); border-radius: 12px;">
                <div class="card-body p-3 text-center">
                    <div class="user-avatar mx-auto mb-2" style="width:64px; height:64px; font-size:1.6rem; background:var(--primary); color:#fff; border-radius:12px; display:inline-flex; align-items:center; justify-content:center; box-shadow:0 4px 6px -1px rgba(37,99,235,0.2);">
                        ${item.nama_lengkap.charAt(0)}
                    </div>
                    <h6 class="fw-bold mb-1 text-dark" style="font-size:1.05rem;">${item.nama_lengkap}</h6>
                    <div class="d-flex align-items-center justify-content-center gap-2 small text-muted">
                        <code>${item.username}</code> &bull; ${badgeJenis}
                    </div>
                </div>
            </div>

            <div class="table-responsive">
                <table class="table table-sm table-striped align-middle mb-0" style="font-size:0.875rem;">
                    <tbody>
                        <tr>
                            <td class="text-muted py-2" style="width:38%;"><i class="fas fa-university me-2 text-primary"></i>Asal Instansi</td>
                            <td class="fw-semibold py-2">: ${item.asal_sekolah_kampus}</td>
                        </tr>
                        <tr>
                            <td class="text-muted py-2"><i class="fas fa-graduation-cap me-2 text-primary"></i>Prodi / Jurusan</td>
                            <td class="fw-semibold py-2">: ${item.prodi_jurusan || '-'}</td>
                        </tr>
                        <tr>
                            <td class="text-muted py-2"><i class="fas fa-layer-group me-2 text-primary"></i>Kelas / Semester</td>
                            <td class="fw-semibold py-2">: ${item.kelas_semester || '-'}</td>
                        </tr>
                        <tr>
                            <td class="text-muted py-2"><i class="fas fa-phone me-2 text-success"></i>No. HP / WhatsApp</td>
                            <td class="fw-semibold py-2">: ${item.no_hp || '-'}</td>
                        </tr>
                        <tr>
                            <td class="text-muted py-2"><i class="fas fa-building me-2 text-primary"></i>Unit Penempatan</td>
                            <td class="fw-bold text-dark py-2">: ${item.nama_unit_kerja}</td>
                        </tr>
                        <tr>
                            <td class="text-muted py-2"><i class="fas fa-user-tie me-2 text-primary"></i>Pembimbing</td>
                            <td class="fw-bold text-primary py-2">: ${item.nama_pembimbing}</td>
                        </tr>
                        <tr>
                            <td class="text-muted py-2"><i class="fas fa-calendar-alt me-2 text-secondary"></i>Periode Magang</td>
                            <td class="py-2">: <span class="badge bg-light text-dark border">${item.tanggal_mulai}</span> s/d <span class="badge bg-light text-dark border">${item.tanggal_selesai}</span></td>
                        </tr>
                        <tr>
                            <td class="text-muted py-2"><i class="fas fa-info-circle me-2 text-info"></i>Status Peserta</td>
                            <td class="py-2">: ${badgeStatus}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        $('#contentDetailPeserta').html(html);
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalDetailPeserta')).show();
    });

    // Tombol Reset Password
    $(document).on('click', '.btn-reset-pass', function() {
        var id = $(this).data('id');
        var item = dataPeserta.find(p => p.id == id);
        if (!item) return;

        Swal.fire({
            title: 'Reset Password?',
            html: 'Password untuk akun <strong>' + item.nama_lengkap + '</strong> (' + item.username + ') akan di-reset ke default: <code>magang123</code>',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#334EAC',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="fas fa-check me-1"></i> Ya, Reset Password',
            cancelButtonText: 'Batal'
        }).then(function(result) {
            if (result.isConfirmed) {
                // Endpoint integrasi reset password:
                // $.post('api/admin/reset_password.php', { id_pengguna: item.id }, function(res){ ... });
                Swal.fire({
                    icon: 'success',
                    title: 'Password Berhasil Direset!',
                    text: 'Password baru adalah: magang123',
                    confirmButtonColor: '#334EAC'
                });
            }
        });
    });

    // Tombol Hapus
    $(document).on('click', '.btn-hapus', function() {
        var id = $(this).data('id');
        var item = dataPeserta.find(p => p.id == id);
        if (!item) return;

        Swal.fire({
            title: 'Hapus Peserta Magang?',
            text: 'Data peserta ' + item.nama_lengkap + ' beserta seluruh riwayat absensinya akan dihapus permanen!',
            icon: 'error',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Ya, Hapus Data',
            cancelButtonText: 'Batal'
        }).then(function(result) {
            if (result.isConfirmed) {
                dataPeserta = dataPeserta.filter(p => p.id != id);
                renderTable();
                Swal.fire({
                    icon: 'success',
                    title: 'Terhapus!',
                    text: 'Data peserta berhasil dihapus.',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        });
    });

});
