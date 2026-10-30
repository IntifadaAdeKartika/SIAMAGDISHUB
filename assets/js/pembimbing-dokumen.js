/**
 * pembimbing-dokumen.js
 * Modul Pengelolaan Dokumen Magang Peserta Bimbingan
 * Fitur Pembimbing: Lihat & Unduh Surat Permohonan, Upload & Kelola Surat Balasan Dinas
 */

$(document).ready(function() {
    var context = window.pembimbingDemoData.getContext();
    var pembimbing = context.pembimbing;
    var unit = context.unit;
    var dataPesertaBimbingan = context.peserta;

    // Set Topbar Info
    $('#userName').text(pembimbing.nama);
    $('#userRole').text(unit.nama);
    $('#userInitial').text(pembimbing.nama.charAt(0).toUpperCase());
    $('#labelUnitPembimbing').text('Unit: ' + unit.nama);

    // Inisialisasi DataTable
    var table = $('#tabelDokumenPembimbing').DataTable({
        language: {
            search: "Cari Peserta:",
            lengthMenu: "Tampilkan _MENU_ data",
            zeroRecords: "Data dokumen peserta tidak ditemukan",
            info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ peserta bimbingan",
            infoEmpty: "Menampilkan 0 data",
            paginate: {
                first: "Awal",
                last: "Akhir",
                next: "Berikutnya",
                previous: "Sebelumnya"
            }
        },
        pageLength: 10,
        columnDefs: [
            { orderable: false, targets: [3, 4, 5] }
        ]
    });

    function updateStatistik() {
        var total = dataPesertaBimbingan.length;
        var permohonanMasuk = 0;
        var balasanTerbit = 0;

        dataPesertaBimbingan.forEach(function(p) {
            var docs = window.getDokumenPesertaById(p.id);
            if (docs.surat_permohonan && docs.surat_permohonan.status === 'sudah_upload') {
                permohonanMasuk++;
            }
            if (docs.surat_balasan && docs.surat_balasan.status === 'diterbitkan') {
                balasanTerbit++;
            }
        });

        $('#statTotalPeserta').text(total);
        $('#statPermohonanMasuk').text(permohonanMasuk);
        $('#statBalasanTerbit').text(balasanTerbit);
        $('#statMenungguBalasan').text(total - balasanTerbit);
    }

    function renderTable() {
        table.clear();
        dataPesertaBimbingan.forEach(function(item, idx) {
            var docs = window.getDokumenPesertaById(item.id);
            var permohonan = docs.surat_permohonan;
            var balasan = docs.surat_balasan;

            var isSiswa = item.jenis_peserta === 'siswa' || /^(SMK|SMA)/i.test(item.instansi);
            var badgeJenis = isSiswa
                ? '<span class="badge" style="background:#e8daef; color:#8e44ad; font-size:0.7rem;">Siswa</span>'
                : '<span class="badge" style="background:#dbeafe; color:#2563eb; font-size:0.7rem;">Mahasiswa</span>';

            var colPeserta = `
                <div>
                    <strong style="color:var(--primary-dark);">${item.nama}</strong>
                    <div style="font-size:0.76rem; color:#777;">
                        <i class="fas fa-id-badge me-1"></i>${item.nim} &bull; ${badgeJenis}
                    </div>
                </div>
            `;

            var colAsal = `
                <div>
                    <div style="font-size:0.84rem; font-weight:600; color:var(--primary-dark);">${item.instansi}</div>
                    <div style="font-size:0.75rem; color:#666;">${item.prodi_jurusan || 'Teknik Informatika'}</div>
                    <div style="font-size:0.74rem; color:#0d6efd; margin-top:2px;">
                        <i class="fas fa-chalkboard-teacher me-1"></i>${item.dosen_guru_pembimbing || 'Drs. Eko Prasetyo'}
                    </div>
                </div>
            `;

            // Status Surat Permohonan
            var colPermohonan = '';
            if (permohonan && permohonan.status === 'sudah_upload') {
                colPermohonan = `
                    <div>
                        <span class="badge badge-approved mb-1"><i class="fas fa-check me-1"></i>Sudah Upload</span>
                        <div class="small text-muted text-truncate" style="max-width:180px;" title="${permohonan.nama_file}">
                            <i class="fas fa-file-pdf text-danger me-1"></i>${permohonan.nama_file}
                        </div>
                        <div class="action-buttons mt-1">
                            <button type="button" class="btn btn-xs btn-outline-primary btn-preview-permohonan py-0 px-2" data-id="${item.id}" style="font-size:0.75rem;" title="Lihat Dokumen">
                                <i class="fas fa-eye me-1"></i>Lihat
                            </button>
                            <button type="button" class="btn btn-xs btn-outline-secondary btn-unduh-permohonan py-0 px-2" data-id="${item.id}" style="font-size:0.75rem;" title="Unduh File">
                                <i class="fas fa-download me-1"></i>Unduh
                            </button>
                        </div>
                    </div>
                `;
            } else {
                colPermohonan = '<span class="badge badge-pending"><i class="fas fa-clock me-1"></i>Belum Diunggah</span>';
            }

            // Status Surat Balasan Dinas
            var colBalasan = '';
            if (balasan && balasan.status === 'diterbitkan') {
                colBalasan = `
                    <div>
                        <span class="badge badge-approved mb-1"><i class="fas fa-check-circle me-1"></i>Diterbitkan</span>
                        <div class="small text-muted text-truncate" style="max-width:180px;" title="${balasan.nama_file}">
                            <i class="fas fa-file-pdf text-success me-1"></i>${balasan.nama_file}
                        </div>
                        <div class="small text-dark" style="font-size:0.7rem;">${balasan.nomor_surat || '-'}</div>
                        <div class="action-buttons mt-1">
                            <button type="button" class="btn btn-xs btn-outline-success btn-preview-balasan py-0 px-2" data-id="${item.id}" style="font-size:0.75rem;" title="Lihat Surat Balasan">
                                <i class="fas fa-eye me-1"></i>Lihat
                            </button>
                            <button type="button" class="btn btn-xs btn-outline-secondary btn-unduh-balasan py-0 px-2" data-id="${item.id}" style="font-size:0.75rem;" title="Unduh Surat Balasan">
                                <i class="fas fa-download me-1"></i>Unduh
                            </button>
                        </div>
                    </div>
                `;
            } else {
                colBalasan = '<span class="badge badge-pending"><i class="fas fa-clock me-1"></i>Belum Diterbitkan</span>';
            }

            // Aksi Pembimbing
            var colAksi = '';
            if (balasan && balasan.status === 'diterbitkan') {
                colAksi = `
                    <div class="action-buttons text-center">
                        <button type="button" class="btn btn-sm btn-outline-secondary btn-aksi btn-upload-balasan" data-id="${item.id}" title="Ganti / Perbarui Surat Balasan">
                            <i class="fas fa-file-pen text-primary"></i> Ganti
                        </button>
                    </div>
                `;
            } else {
                colAksi = `
                    <div class="action-buttons text-center">
                        <button type="button" class="btn btn-sm btn-primary btn-upload-balasan py-1 px-2" data-id="${item.id}" style="font-size:0.8rem;">
                            <i class="fas fa-upload me-1"></i> Upload Balasan
                        </button>
                    </div>
                `;
            }

            table.row.add([
                idx + 1,
                colPeserta,
                colAsal,
                colPermohonan,
                colBalasan,
                colAksi
            ]);
        });
        table.draw();
        updateStatistik();
    }

    renderTable();

    // Buka Modal Upload Surat Balasan
    $(document).on('click', '.btn-upload-balasan', function() {
        var id = $(this).data('id');
        var item = dataPesertaBimbingan.find(p => p.id == id);
        if (!item) return;

        var docs = window.getDokumenPesertaById(id);
        var balasan = docs.surat_balasan;

        $('#uploadPesertaId').val(item.id);
        $('#uploadPesertaNama').text(item.nama);
        $('#uploadPesertaMeta').text(item.nim + ' · ' + item.instansi + ' (' + (item.prodi_jurusan || 'Teknik') + ')');

        if (balasan) {
            $('#inputNoSuratBalasan').val(balasan.nomor_surat || '');
            $('#inputTglSuratBalasan').val(balasan.tanggal_upload || '');
            $('#btnSubmitBalasan').html('<i class="fas fa-save me-1"></i> Perbarui Surat Balasan');
        } else {
            $('#formUploadBalasan')[0].reset();
            var today = new Date().toISOString().split('T')[0];
            var randomNo = '551.1/' + (140 + item.id) + '/405.15/' + new Date().getFullYear();
            $('#inputNoSuratBalasan').val(randomNo);
            $('#inputTglSuratBalasan').val(today);
            $('#btnSubmitBalasan').html('<i class="fas fa-upload me-1"></i> Terbitkan & Upload Surat');
        }

        var modalEl = document.getElementById('modalUploadBalasan');
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    });

    // Submit Upload Balasan
    $('#formUploadBalasan').on('submit', function(e) {
        e.preventDefault();
        var id = parseInt($('#uploadPesertaId').val());
        var item = dataPesertaBimbingan.find(p => p.id == id);
        if (!item) return;

        var noSurat = $('#inputNoSuratBalasan').val().trim();
        var tglSurat = $('#inputTglSuratBalasan').val();
        var fileInput = document.getElementById('inputFileBalasan');
        var fileName = fileInput.files.length > 0 
            ? fileInput.files[0].name 
            : 'Surat_Balasan_Dishub_' + item.nama.replace(/\s+/g, '_') + '.pdf';

        if (!noSurat || !tglSurat) {
            Swal.fire('Form Belum Lengkap', 'Nomor surat dan tanggal terbit harus diisi.', 'warning');
            return;
        }

        // Simpan ke storage
        window.simpanSuratBalasan(id, {
            nomor_surat: noSurat,
            nama_file: fileName,
            ukuran: '850 KB',
            tanggal_upload: tglSurat
        });

        var modalEl = document.getElementById('modalUploadBalasan');
        bootstrap.Modal.getOrCreateInstance(modalEl).hide();

        renderTable();

        Swal.fire({
            icon: 'success',
            title: 'Surat Balasan Diterbitkan!',
            text: 'Surat balasan resmi untuk ' + item.nama + ' berhasil diunggah. Peserta kini dapat melihat dan mengunduh berkas surat.',
            confirmButtonColor: '#334EAC'
        });
    });

    // Preview Permohonan
    $(document).on('click', '.btn-preview-permohonan', function() {
        var id = $(this).data('id');
        var item = dataPesertaBimbingan.find(p => p.id == id);
        var docs = window.getDokumenPesertaById(id);
        if (item && docs.surat_permohonan) {
            window.previewDokumenSweetAlert('permohonan', docs.surat_permohonan, item.nama);
        }
    });

    // Unduh Permohonan
    $(document).on('click', '.btn-unduh-permohonan', function() {
        var id = $(this).data('id');
        var item = dataPesertaBimbingan.find(p => p.id == id);
        var docs = window.getDokumenPesertaById(id);
        if (item && docs.surat_permohonan) {
            window.unduhFileDokumen(
                docs.surat_permohonan.nama_file,
                'Surat Permohonan - ' + item.nama,
                'Nomor: ' + docs.surat_permohonan.nomor_surat + ' | Instansi: ' + item.instansi
            );
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Surat Permohonan berhasil diunduh',
                showConfirmButton: false,
                timer: 1500
            });
        }
    });

    // Preview Balasan
    $(document).on('click', '.btn-preview-balasan', function() {
        var id = $(this).data('id');
        var item = dataPesertaBimbingan.find(p => p.id == id);
        var docs = window.getDokumenPesertaById(id);
        if (item && docs.surat_balasan) {
            window.previewDokumenSweetAlert('balasan', docs.surat_balasan, item.nama);
        }
    });

    // Unduh Balasan
    $(document).on('click', '.btn-unduh-balasan', function() {
        var id = $(this).data('id');
        var item = dataPesertaBimbingan.find(p => p.id == id);
        var docs = window.getDokumenPesertaById(id);
        if (item && docs.surat_balasan) {
            window.unduhFileDokumen(
                docs.surat_balasan.nama_file,
                'Surat Balasan Dishub - ' + item.nama,
                'Nomor: ' + docs.surat_balasan.nomor_surat + ' | Dinas Perhubungan Ponorogo'
            );
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Surat Balasan resmi berhasil diunduh',
                showConfirmButton: false,
                timer: 1500
            });
        }
    });

    // Filter Status Balasan
    $('#filterStatusBalasan').on('change', function() {
        var val = $(this).val();
        table.column(4).search(val).draw();
    });

    // Filter Status Permohonan
    $('#filterStatusPermohonan').on('change', function() {
        var val = $(this).val();
        table.column(3).search(val).draw();
    });

    // Reset Filter
    $('#btnResetFilter').on('click', function() {
        $('#filterStatusBalasan').val('');
        $('#filterStatusPermohonan').val('');
        table.search('').columns().search('').draw();
    });

    // Reload Data
    $('#btnReloadDokumen').on('click', function() {
        renderTable();
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Data dokumen berhasil diperbarui',
            showConfirmButton: false,
            timer: 1200
        });
    });

});
