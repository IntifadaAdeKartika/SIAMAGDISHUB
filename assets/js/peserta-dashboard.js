$(document).ready(function() {
    var context = window.pembimbingDemoData.getPesertaContext();
    var documentObjectUrls = {};

    function renderDocumentActions() {
        var peserta = context.peserta;
        var suratPermohonan = peserta.file_surat_permohonan;
        var suratBalasan = peserta.file_surat_balasan;

        if (suratPermohonan) {
            $('#suratPermohonanAction').html(
                '<button type="button" class="btn btn-outline-primary btn-sm btn-view-document" data-document="file_surat_permohonan">' +
                '<i class="fas fa-download me-1"></i>Lihat / Unduh Surat</button>'
            );
        } else {
            $('#suratPermohonanAction').html(
                '<button type="button" class="btn btn-primary btn-sm" id="btnUploadSuratPermohonan">' +
                '<i class="fas fa-upload me-1"></i>Upload Surat</button>'
            );
        }

        if (suratBalasan) {
            $('#suratBalasanAction').html(
                '<button type="button" class="btn btn-outline-primary btn-sm btn-view-document" data-document="file_surat_balasan">' +
                '<i class="fas fa-download me-1"></i>Lihat / Unduh Surat Balasan</button>'
            );
        } else {
            $('#suratBalasanAction').html('<span class="small text-muted">Menunggu diunggah oleh Pembimbing</span>');
        }

        var lengkap = Boolean(suratPermohonan && suratBalasan);
        peserta.status_dokumen = lengkap ? 'lengkap' : 'pending';
        $('#statusDokumenBadge')
            .toggleClass('bg-success', lengkap)
            .toggleClass('bg-secondary', !lengkap)
            .text(lengkap ? 'Lengkap' : 'Pending');
    }

    renderDocumentActions();
    var now = new Date();
    var today = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
    ].join('-');
    var todayAttendance = context.absensi.find(function(item) {
        return item.tanggal === today;
    });
    var latestAttendance = context.absensi[0];
    var latestLogbook = context.logbook[0];
    var attendanceCount = context.absensi.filter(function(item) {
        return item.status === 'Hadir' || item.status === 'Terlambat';
    }).length;
    var leaveCount = context.izin.length;

    $('#userName').text(context.peserta.nama);
    $('#userRole').text(context.peserta.nim + ' · ' + context.unit.nama);
    $('#userInitial').text(context.peserta.nama.charAt(0).toUpperCase());
    $('#greetingName').text(context.peserta.nama);
    $('#participantUnit').text(context.unit.nama + ' · Pembimbing: ' + context.pembimbing.nama);
    $('#dosenPembimbingText').text(context.peserta.pembimbing_akademik || context.peserta.dosen_guru_pembimbing || '-');
    $('#statHariHadir').text(attendanceCount);
    $('#statLogbookDiisi').text(context.logbook.length);
    $('#statIzinSakit').text(leaveCount);

    $('#btnUploadSuratPermohonan').on('click', function() {
        $('#fileSuratPermohonan').trigger('click');
    });

    $('#fileSuratPermohonan').on('change', function() {
        var file = this.files && this.files[0];
        if (!file) return;
        if (documentObjectUrls.file_surat_permohonan) {
            URL.revokeObjectURL(documentObjectUrls.file_surat_permohonan);
        }
        documentObjectUrls.file_surat_permohonan = URL.createObjectURL(file);
        context.peserta.file_surat_permohonan = file.name;
        renderDocumentActions();
        alert('Surat permohonan "' + file.name + '" berhasil dipilih. Simulasi ini belum mengunggah file ke server.');
    });

    $(document).on('click', '.btn-view-document', function() {
        var field = $(this).data('document');
        var objectUrl = documentObjectUrls[field];
        if (objectUrl) {
            window.open(objectUrl, '_blank', 'noopener');
            return;
        }
        alert('Lokasi dokumen tersimpan: ' + context.peserta[field] + '. Unduh akan tersedia setelah backend terhubung.');
    });

    if (todayAttendance) {
        $('#statusHariIniText').text('Presensi hari ini tercatat: ' + todayAttendance.jamMasuk);
        $('#statusHariIniBadge')
            .removeClass('bg-secondary')
            .addClass(todayAttendance.status === 'Terlambat' ? 'bg-warning text-dark' : 'bg-success')
            .text(todayAttendance.status);
    } else {
        $('#statusHariIniText').text('Belum melakukan check-in hari ini.');
        $('#statusHariIniBadge').text('Belum Absen');
    }

    $('#latestAttendanceDate').text(latestAttendance
        ? 'Presensi terakhir: ' + latestAttendance.tanggal
        : 'Belum ada riwayat presensi.');

    var rows = context.absensi.slice(0, 5).map(function(item) {
        var badge = item.status === 'Terlambat'
            ? '<span class="badge badge-pending">Terlambat</span>'
            : '<span class="badge badge-approved">' + item.status + '</span>';
        return '<tr><td>' + item.tanggal + '</td><td>' + item.jamMasuk +
            '</td><td>' + item.jamPulang + '</td><td>' + badge + '</td></tr>';
    }).join('');
    $('#dashboardAttendanceRows').html(rows || '<tr><td colspan="4" class="text-center py-4 text-muted">Belum ada data presensi.</td></tr>');

    if (latestLogbook) {
        $('#latestLogbookEmpty').hide();
        $('#latestLogbookContent').show().html(
            '<div class="fw-semibold mb-1">' + latestLogbook.tanggal + '</div>' +
            '<p class="small mb-2">' + latestLogbook.deskripsi_kegiatan + '</p>' +
            '<div class="small text-muted mb-2">' + latestLogbook.hasil_kegiatan + '</div>' +
            '<span class="badge ' + (latestLogbook.status_verifikasi === 'diverifikasi' ? 'badge-approved' : 'badge-pending') + '">' +
            (latestLogbook.status_verifikasi === 'diverifikasi' ? 'Diverifikasi' : 'Menunggu Verifikasi') + '</span>'
        );
    }
});
