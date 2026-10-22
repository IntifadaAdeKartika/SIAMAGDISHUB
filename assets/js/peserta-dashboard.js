$(document).ready(function() {
    var context = window.pembimbingDemoData.getPesertaContext();
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
    $('#statHariHadir').text(attendanceCount);
    $('#statLogbookDiisi').text(context.logbook.length);
    $('#statIzinSakit').text(leaveCount);

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
