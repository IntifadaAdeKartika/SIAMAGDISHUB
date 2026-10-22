/* admin-pembimbing.js
   Manajemen CRUD Pembimbing Lapangan Dinas Perhubungan
   Aturan sistem: 1 Bidang/Seksi = 1 Pembimbing Lapangan */

$(document).ready(function() {

    // Data pembimbing lapangan
    var dataPembimbing = window.masterPembimbing.map(function(pembimbing) {
        var unit = window.getMasterUnit(pembimbing.unitId);
        var anakBimbingan = window.masterPeserta.filter(function(peserta) {
            return peserta.unitId === pembimbing.unitId;
        }).map(function(peserta) {
            return peserta.nama;
        });

        return {
            id: pembimbing.id,
            nip: "-",
            nama_lengkap: pembimbing.nama,
            jabatan: "Pembimbing Lapangan",
            id_unit_kerja: pembimbing.unitId,
            nama_unit_kerja: unit ? unit.nama : "-",
            no_hp: "-",
            jumlah_bimbingan: anakBimbingan.length,
            anak_bimbingan: anakBimbingan,
            status_pembimbing: "aktif"
        };
    });

    // Inisialisasi DataTable
    var table = $('#tabelPembimbing').DataTable({
        language: {
            search: "Cari Pembimbing:",
            lengthMenu: "Tampilkan _MENU_ data",
            zeroRecords: "Data pembimbing tidak ditemukan",
            info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ pembimbing",
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
            { orderable: false, targets: [6] }
        ]
    });

    function updateSummary() {
        var total = dataPembimbing.length;
        var aktif = dataPembimbing.filter(p => p.status_pembimbing === 'aktif').length;
        var unitUnik = new Set(dataPembimbing.filter(p => p.status_pembimbing === 'aktif').map(p => p.id_unit_kerja)).size;

        $('#totalPembimbing').text(total);
        $('#totalAktif').text(aktif);
        $('#totalUnitTerisi').text(unitUnik + ' / ' + window.masterUnitKerja.length);
    }

    function renderTable() {
        table.clear();
        dataPembimbing.forEach(function(item, idx) {
            var badgeStatus = item.status_pembimbing === 'aktif' 
                ? '<span class="badge badge-approved">Aktif</span>' 
                : '<span class="badge badge-rejected">Tidak Aktif</span>';

            var colNama = `
                <div>
                    <strong style="color:var(--primary-dark);">${item.nama_lengkap}</strong>
                    <div style="font-size:0.76rem; color:#777;">
                        <i class="fas fa-id-card me-1"></i>NIP: ${item.nip}
                    </div>
                </div>
            `;

            var colUnit = `
                <div>
                    <span class="badge" style="background:var(--accent-light); color:var(--primary); font-size:0.75rem;">
                        <i class="fas fa-building me-1"></i>${item.nama_unit_kerja}
                    </span>
                </div>
            `;

            var colBimbingan = `
                <div class="text-center">
                    <span class="badge ${item.jumlah_bimbingan > 0 ? 'bg-primary' : 'bg-secondary'}" style="font-size:0.78rem;">
                        ${item.jumlah_bimbingan} Orang
                    </span>
                </div>
            `;



            var colAksi = `
                <div class="text-center">
                    <button class="btn btn-sm btn-outline-primary btn-aksi btn-detail-pembimbing" data-id="${item.id}" title="Lihat Bimbingan">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary btn-aksi btn-edit-pembimbing" data-id="${item.id}" title="Edit Data">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary btn-aksi btn-reset-pembimbing" data-id="${item.id}" title="Reset Password">
                        <i class="fas fa-key"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger btn-aksi btn-hapus-pembimbing" data-id="${item.id}" title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            table.row.add([
                idx + 1,
                colNama,
                item.jabatan,
                colUnit,

                colBimbingan,
                badgeStatus,
                colAksi
            ]);
        });
        table.draw();
        updateSummary();
    }

    renderTable();

    $('#idUnitKerjaPembimbing option').not('[value=""]').remove();
    window.masterUnitKerja.forEach(function(unit) {
        $('#idUnitKerjaPembimbing').append(new Option(unit.nama, unit.id));
    });

    // Reload
    $('#btnReloadTable').on('click', function() {
        renderTable();
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Data diperbarui',
            showConfirmButton: false,
            timer: 1500
        });
    });

    // Tambah Pembimbing
    $('#btnTambahPembimbing').on('click', function() {
        $('#formPembimbing')[0].reset();
        $('#pembimbingId').val('');
        $('#boxPasswordPembimbing').show();
        $('#modalPembimbingTitle').html('<i class="fas fa-user-plus me-2"></i>Tambah Pembimbing Lapangan');
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPembimbing')).show();
    });

    // Submit Form
    $('#formPembimbing').on('submit', function(e) {
        e.preventDefault();

        var id = $('#pembimbingId').val();
        var nip = $('#nipPembimbing').val().trim();
        var nama = $('#namaPembimbing').val().trim();
        var jabatan = $('#jabatanPembimbing').val().trim();
        var noHp = $('#noHpPembimbing').val().trim();
        var unitId = $('#idUnitKerjaPembimbing').val();
        var unitNama = $('#idUnitKerjaPembimbing option:selected').text();
        var status = $('#statusPembimbing').val();
        var tglMulai = $('#tglMulaiTugas').val();
        var tglSelesai = $('#tglSelesaiTugas').val();

        // Validasi aturan: 1 Bidang = 1 Pembimbing aktif
        var conflict = dataPembimbing.find(function(p) {
            return p.id_unit_kerja == unitId && p.id != id && p.status_pembimbing === 'aktif' && status === 'aktif';
        });

        if (conflict) {
            Swal.fire({
                title: 'Konflik Penugasan!',
                html: `Bidang <strong>${unitNama}</strong> sudah memiliki pembimbing aktif yaitu <strong>${conflict.nama_lengkap}</strong>.<br><br>Aturan sistem Dishub: <em>1 Bidang/Seksi hanya dapat diwakili oleh 1 Pembimbing</em>.`,
                icon: 'warning',
                confirmButtonColor: '#334EAC'
            });
            return;
        }

        if (id) {
            // Edit
            var idx = dataPembimbing.findIndex(p => p.id == id);
            if (idx !== -1) {
                dataPembimbing[idx].nip = nip;
                dataPembimbing[idx].nama_lengkap = nama;
                dataPembimbing[idx].jabatan = jabatan;
                dataPembimbing[idx].no_hp = noHp;
                dataPembimbing[idx].id_unit_kerja = unitId;
                dataPembimbing[idx].nama_unit_kerja = unitNama;
                dataPembimbing[idx].status_pembimbing = status;
                dataPembimbing[idx].tanggal_mulai_tugas = tglMulai;
                dataPembimbing[idx].tanggal_selesai_tugas = tglSelesai;
            }
            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: 'Data pembimbing lapangan diperbarui.',
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            // Tambah baru
            var newId = dataPembimbing.length ? Math.max(...dataPembimbing.map(p => p.id)) + 1 : 1;
            dataPembimbing.push({
                id: newId,
                nip: nip,
                nama_lengkap: nama,
                jabatan: jabatan,
                no_hp: noHp,
                id_unit_kerja: unitId,
                nama_unit_kerja: unitNama,
                jumlah_bimbingan: 0,
                anak_bimbingan: [],
                status_pembimbing: status,
                tanggal_mulai_tugas: tglMulai,
                tanggal_selesai_tugas: tglSelesai
            });
            Swal.fire({
                icon: 'success',
                title: 'Pembimbing Ditambahkan!',
                text: 'Akun login otomatis dibuat dengan username NIP: ' + nip + ' (Password default: pembimbing123)',
                confirmButtonColor: '#334EAC'
            });
        }

        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPembimbing')).hide();
        renderTable();
    });

    // Edit Pembimbing
    $(document).on('click', '.btn-edit-pembimbing', function() {
        var id = $(this).data('id');
        var item = dataPembimbing.find(p => p.id == id);
        if (!item) return;

        $('#pembimbingId').val(item.id);
        $('#nipPembimbing').val(item.nip);
        $('#namaPembimbing').val(item.nama_lengkap);
        $('#jabatanPembimbing').val(item.jabatan);
        $('#noHpPembimbing').val(item.no_hp);
        $('#idUnitKerjaPembimbing').val(item.id_unit_kerja);
        $('#statusPembimbing').val(item.status_pembimbing);
        $('#tglMulaiTugas').val(item.tanggal_mulai_tugas);
        $('#tglSelesaiTugas').val(item.tanggal_selesai_tugas);

        $('#boxPasswordPembimbing').hide();
        $('#modalPembimbingTitle').html('<i class="fas fa-edit me-2"></i>Edit Data Pembimbing');
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPembimbing')).show();
    });

    // Detail Pembimbing
    $(document).on('click', '.btn-detail-pembimbing', function() {
        var id = $(this).data('id');
        var item = dataPembimbing.find(p => p.id == id);
        if (!item) return;

        var listAnak = '';
        if (item.anak_bimbingan.length > 0) {
            item.anak_bimbingan.forEach(function(anak, i) {
                listAnak += `<li class="list-group-item d-flex justify-content-between align-items-center py-2" style="font-size:0.83rem;">
                    <span><i class="fas fa-user-graduate me-2 text-primary"></i>${anak}</span>
                    <span class="badge badge-approved" style="font-size:0.7rem;">Aktif</span>
                </li>`;
            });
        } else {
            listAnak = `<li class="list-group-item text-muted text-center py-3" style="font-size:0.82rem;">Belum ada peserta magang yang ditempatkan di bidang ini.</li>`;
        }

        var html = `
            <div class="d-flex align-items-center gap-3 mb-3 p-3 rounded" style="background:var(--bg-light);">
                <div class="user-avatar" style="width:50px;height:50px;font-size:1.2rem;">
                    ${item.nama_lengkap.charAt(0)}
                </div>
                <div>
                    <h6 class="fw-bold mb-0">${item.nama_lengkap}</h6>
                    <div style="font-size:0.8rem; color:#666;">NIP. ${item.nip}</div>
                    <div style="font-size:0.8rem; color:var(--primary); font-weight:500;">${item.jabatan}</div>
                </div>
            </div>

            <div class="row g-2 mb-3" style="font-size:0.84rem;">
                <div class="col-6"><strong>Unit Kerja:</strong> ${item.nama_unit_kerja}</div>
                <div class="col-6"><strong>WhatsApp:</strong> ${item.no_hp}</div>
                <div class="col-6"><strong>Status:</strong> <span class="badge ${item.status_pembimbing === 'aktif' ? 'badge-approved' : 'badge-rejected'}">${item.status_pembimbing}</span></div>
                <div class="col-6"><strong>Mulai Tugas:</strong> ${item.tanggal_mulai_tugas || '-'}</div>
            </div>

            <h6 class="fw-bold mt-3 mb-2" style="font-size:0.9rem;"><i class="fas fa-users me-2 text-primary"></i>Daftar Anak Bimbingan (${item.jumlah_bimbingan} Orang)</h6>
            <ul class="list-group">
                ${listAnak}
            </ul>
        `;

        $('#contentDetailPembimbing').html(html);
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalDetailPembimbing')).show();
    });

    // Reset Password
    $(document).on('click', '.btn-reset-pembimbing', function() {
        var id = $(this).data('id');
        var item = dataPembimbing.find(p => p.id == id);
        if (!item) return;

        Swal.fire({
            title: 'Reset Password Pembimbing?',
            html: 'Password akun <strong>' + item.nama_lengkap + '</strong> (' + item.nip + ') akan dikembalikan ke default: <code>pembimbing123</code>',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#334EAC',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Ya, Reset',
            cancelButtonText: 'Batal'
        }).then(function(result) {
            if (result.isConfirmed) {
                Swal.fire({
                    icon: 'success',
                    title: 'Password Direset!',
                    text: 'Password baru: pembimbing123',
                    confirmButtonColor: '#334EAC'
                });
            }
        });
    });

    // Hapus
    $(document).on('click', '.btn-hapus-pembimbing', function() {
        var id = $(this).data('id');
        var item = dataPembimbing.find(p => p.id == id);
        if (!item) return;

        if (item.jumlah_bimbingan > 0) {
            Swal.fire({
                title: 'Tidak Dapat Dihapus!',
                html: `Pembimbing <strong>${item.nama_lengkap}</strong> masih memiliki <strong>${item.jumlah_bimbingan} anak bimbingan aktif</strong>.<br><br>Harap alihkan bidang penempatan peserta magang terlebih dahulu!`,
                icon: 'error',
                confirmButtonColor: '#334EAC'
            });
            return;
        }

        Swal.fire({
            title: 'Hapus Pembimbing?',
            text: 'Data ' + item.nama_lengkap + ' akan dihapus dari sistem!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        }).then(function(result) {
            if (result.isConfirmed) {
                dataPembimbing = dataPembimbing.filter(p => p.id != id);
                renderTable();
                Swal.fire({
                    icon: 'success',
                    title: 'Dihapus!',
                    text: 'Data pembimbing berhasil dihapus.',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        });
    });

});
