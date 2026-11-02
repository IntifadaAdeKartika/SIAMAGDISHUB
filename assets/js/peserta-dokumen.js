/**
 * peserta-dokumen.js
 * Modul Pengelolaan Surat Magang Peserta
 * Fitur: Upload Surat Permohonan & Unduh/Lihat Surat Balasan Dinas
 */

$(document).ready(function() {
    var context = window.pembimbingDemoData.getPesertaContext();
    var peserta = context.peserta;
    var penempatan = context.penempatan || window.getMasterPenempatanPeserta(peserta.id);
    var unit = context.unit;
    var pembimbing = context.pembimbing;

    // Set Topbar Info
    $('#userName').text(peserta.nama);
    $('#userRole').text(peserta.nim + ' · ' + unit.nama);
    $('#userInitial').text(peserta.nama.charAt(0).toUpperCase());

    // Set Profil Peserta Card
    $('#profilNamaPeserta').text(peserta.nama);
    $('#profilNimBadge').text(peserta.nim);
    $('#profilInstansi').text(peserta.instansi);
    $('#profilProdi').text(peserta.prodi_jurusan || 'Teknik Informatika');
    $('#profilDosenPembimbing').text(peserta.dosen_guru_pembimbing || 'Dr. Bambang Sutikno, M.Kom.');
    $('#profilPembimbingDishub').text(pembimbing.nama + ' (' + unit.nama + ')');

    // Render Status Dokumen
    function renderDokumen() {
        var docs = window.getDokumenPesertaById(peserta.id);
        var permohonan = docs.surat_permohonan;
        var balasan = docs.surat_balasan;

        // 1. Surat Permohonan
        if (permohonan && permohonan.status === 'sudah_upload') {
            $('#badgeStatusPermohonan').removeClass('bg-secondary bg-warning').addClass('bg-success').html('<i class="fas fa-check-circle me-1"></i>Sudah Diunggah');
            $('#boxFilePermohonan').show();
            $('#boxEmptyPermohonan').hide();
            $('#namaFilePermohonan').text(permohonan.nama_file);
            $('#infoMetaPermohonan').text('No: ' + (permohonan.nomor_surat || '-') + ' | Tgl Upload: ' + (permohonan.tanggal_upload || '-'));
            $('#btnPreviewPermohonan, #btnUnduhPermohonan').prop('disabled', false).show();
            $('.btn-buka-upload-permohonan').html('<i class="fas fa-upload me-1"></i> Upload Ulang Surat Permohonan');
        } else {
            $('#badgeStatusPermohonan').removeClass('bg-success bg-secondary').addClass('bg-warning text-dark').html('<i class="fas fa-clock me-1"></i>Belum Diunggah');
            $('#boxFilePermohonan').hide();
            $('#boxEmptyPermohonan').show();
            $('#btnPreviewPermohonan, #btnUnduhPermohonan').prop('disabled', true).hide();
            $('.btn-buka-upload-permohonan').html('<i class="fas fa-upload me-1"></i> Upload Surat Permohonan');
        }

        // 2. Surat Balasan Dinas
        if (balasan && balasan.status === 'diterbitkan') {
            $('#badgeStatusBalasan').removeClass('bg-secondary bg-warning').addClass('bg-success').html('<i class="fas fa-check-circle me-1"></i>Diterbitkan');
            $('#boxFileBalasan').show();
            $('#boxPendingBalasan').hide();
            $('#namaFileBalasan').text(balasan.nama_file);
            $('#infoMetaBalasan').text('No. SK: ' + (balasan.nomor_surat || '-') + ' | Tgl Terbit: ' + (balasan.tanggal_upload || '-'));
            $('#actionsBalasan').show();
        } else {
            $('#badgeStatusBalasan').removeClass('bg-success bg-secondary').addClass('bg-warning text-dark').html('<i class="fas fa-hourglass-half me-1"></i>Menunggu Pembimbing');
            $('#boxFileBalasan').hide();
            $('#boxPendingBalasan').show();
            $('#actionsBalasan').hide();
        }
    }

    renderDokumen();

    // Event Buka Modal Upload Permohonan
    $(document).on('click', '.btn-buka-upload-permohonan', function() {
        var docs = window.getDokumenPesertaById(peserta.id);
        var permohonan = docs.surat_permohonan;
        $('#inputFilePermohonan').val('');
        if (permohonan) {
            $('#inputNoSuratPermohonan').val(permohonan.nomor_surat || '');
            $('#inputTglSuratPermohonan').val(permohonan.tanggal_upload || '');
        } else {
            $('#formUploadPermohonan')[0].reset();
            var today = new Date().toISOString().split('T')[0];
            $('#inputTglSuratPermohonan').val(today);
        }
        var modalEl = document.getElementById('modalUploadPermohonan');
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    });

    // Submit Upload Permohonan
    $('#formUploadPermohonan').on('submit', function(e) {
        e.preventDefault();
        var noSurat = $('#inputNoSuratPermohonan').val().trim();
        var tglSurat = $('#inputTglSuratPermohonan').val();
        var fileInput = document.getElementById('inputFilePermohonan');
        var file = fileInput.files[0];

        if (!noSurat || !tglSurat) {
            Swal.fire('Form Belum Lengkap', 'Harap isi nomor surat dan tanggal surat.', 'warning');
            return;
        }
        if (!file) {
            Swal.fire('Berkas Belum Dipilih', 'Pilih file surat permohonan dalam format PDF.', 'warning');
            return;
        }
        if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf')) {
            Swal.fire('Format Tidak Valid', 'Berkas surat harus berformat PDF.', 'warning');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            Swal.fire('Ukuran Berkas Terlalu Besar', 'Ukuran file PDF maksimal 5 MB.', 'warning');
            return;
        }

        window.simpanSuratPermohonan(peserta.id, {
            nomor_surat: noSurat,
            nama_file: file.name,
            ukuran: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
            tanggal_upload: tglSurat
        });

        var modalEl = document.getElementById('modalUploadPermohonan');
        bootstrap.Modal.getOrCreateInstance(modalEl).hide();

        renderDokumen();
        $('#formUploadPermohonan')[0].reset();

        Swal.fire({
            icon: 'success',
            title: 'Data Surat Disimpan',
            text: 'Metadata surat tersimpan di browser. File PDF belum dikirim ke server karena backend belum tersedia.',
            confirmButtonColor: '#334EAC'
        });
    });

    // Preview Surat Permohonan
    $('#btnPreviewPermohonan').on('click', function() {
        var docs = window.getDokumenPesertaById(peserta.id);
        if (docs.surat_permohonan) {
            window.previewDokumenSweetAlert('permohonan', docs.surat_permohonan, peserta.nama);
        }
    });

    // Unduh Surat Permohonan
    $('#btnUnduhPermohonan').on('click', function() {
        var docs = window.getDokumenPesertaById(peserta.id);
        if (docs.surat_permohonan) {
            window.unduhFileDokumen(
                docs.surat_permohonan.nama_file,
                'Surat Permohonan Magang - ' + peserta.nama,
                'Nomor: ' + docs.surat_permohonan.nomor_surat + ' | Asal: ' + peserta.instansi
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

    // Preview Surat Balasan
    $('#btnPreviewBalasan').on('click', function() {
        var docs = window.getDokumenPesertaById(peserta.id);
        if (docs.surat_balasan) {
            window.previewDokumenSweetAlert('balasan', docs.surat_balasan, peserta.nama);
        }
    });

    // Unduh Surat Balasan
    $('#btnUnduhBalasan').on('click', function() {
        var docs = window.getDokumenPesertaById(peserta.id);
        if (docs.surat_balasan) {
            window.unduhFileDokumen(
                docs.surat_balasan.nama_file,
                'Surat Balasan Dinas - ' + peserta.nama,
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

    // Refresh Tombol
    $('#btnRefreshDokumen').on('click', function() {
        renderDokumen();
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
