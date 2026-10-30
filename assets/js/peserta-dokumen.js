/**
 * peserta-dokumen.js
 * Modul Pengelolaan Dokumen Magang Peserta
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
            $('#btnUploadPermohonan').html('<i class="fas fa-edit me-1"></i> Ganti Berkas');
        } else {
            $('#badgeStatusPermohonan').removeClass('bg-success bg-secondary').addClass('bg-warning text-dark').html('<i class="fas fa-clock me-1"></i>Belum Diunggah');
            $('#boxFilePermohonan').hide();
            $('#boxEmptyPermohonan').show();
            $('#btnPreviewPermohonan, #btnUnduhPermohonan').prop('disabled', true).hide();
            $('#btnUploadPermohonan').html('<i class="fas fa-cloud-arrow-up me-1"></i> Unggah Surat Sekarang');
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
    $('#btnUploadPermohonan').on('click', function() {
        var docs = window.getDokumenPesertaById(peserta.id);
        var permohonan = docs.surat_permohonan;
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
        var fileName = fileInput.files.length > 0 
            ? fileInput.files[0].name 
            : 'Surat_Permohonan_' + peserta.nama.replace(/\s+/g, '_') + '.pdf';

        if (!noSurat || !tglSurat) {
            Swal.fire('Form Belum Lengkap', 'Harap isi nomor surat dan tanggal surat.', 'warning');
            return;
        }

        // Simpan data
        window.simpanSuratPermohonan(peserta.id, {
            nomor_surat: noSurat,
            nama_file: fileName,
            ukuran: '1.2 MB',
            tanggal_upload: tglSurat
        });

        var modalEl = document.getElementById('modalUploadPermohonan');
        bootstrap.Modal.getOrCreateInstance(modalEl).hide();

        renderDokumen();

        Swal.fire({
            icon: 'success',
            title: 'Berhasil Diunggah!',
            text: 'Surat Permohonan Magang berhasil disimpan dan diteruskan ke Pembimbing Lapangan (' + pembimbing.nama + ').',
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
