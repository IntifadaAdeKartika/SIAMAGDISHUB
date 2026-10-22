/**
 * pembimbing-monitoring.js
 * Modul Monitoring Kehadiran Lintas Bidang
 */

$(document).ready(function() {

    var context = window.pembimbingDemoData.getContext();
    var logbookByNim = {};
    context.semuaLogbook.forEach(function(item) {
        logbookByNim[item.nim] = item;
    });
    var attendanceByNim = {};
    context.semuaAbsensi.forEach(function(item) {
        attendanceByNim[item.nim] = item;
    });
    var dataLintasBidang = window.masterPeserta.filter(function(peserta) {
        return peserta.unitId !== context.pembimbing.unitId;
    }).map(function(peserta) {
        var penempatan = window.getMasterPenempatanPeserta(peserta.nim);
        var absensi = attendanceByNim[peserta.nim];
        var logbook = logbookByNim[peserta.nim];
        return {
            nim: peserta.nim,
            nama_peserta: peserta.nama,
            instansi: peserta.instansi,
            unitId: penempatan.unit.id,
            unit_kerja: penempatan.unit.nama,
            pembimbing: penempatan.namaPembimbing,
            checkin: absensi ? absensi.jamMasuk.replace(' WIB', '') : '-',
            status_hadir: absensi ? absensi.status : 'Belum Absen',
            status_logbook: logbook ? logbook.status : 'Belum ada logbook'
        };
    });

    $('#userName').text(context.pembimbing.nama);
    $('#userRole').text(context.unit.nama);
    $('#userInitial').text(context.pembimbing.nama.charAt(0).toUpperCase());
    $('#filterUnitLintas').find('option:not(:first)').remove();
    window.masterUnitKerja.forEach(function(unit) {
        $('#filterUnitLintas').append(new Option(unit.nama + ' (' + unit.kode + ')', unit.nama));
    });
    var latestDate = context.semuaAbsensi.reduce(function(latest, item) {
        return item.tanggal > latest ? item.tanggal : latest;
    }, '');
    if (latestDate) {
        var parts = latestDate.split('-');
        $('#labelTanggalMonitoring').text('Data terakhir: ' + parts[2] + ' Okt ' + parts[0]);
    }
    $('#labelUnitSendiri').text(context.unit.nama);
    var cards = context.peserta.map(function(peserta) {
        var absensi = attendanceByNim[peserta.nim];
        var logbook = logbookByNim[peserta.nim];
        return `
            <div class="col-md-6">
                <div class="card bimbingan-card h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div>
                                <h6 class="mb-1">${peserta.nama}</h6>
                                <small class="text-muted">${peserta.instansi}</small>
                            </div>
                            <span class="badge bg-light text-primary border">${peserta.nim}</span>
                        </div>
                        <div class="small mb-2"><i class="fas fa-calendar-check text-primary me-2"></i>Presensi:
                            <strong>${absensi ? absensi.status : 'Belum Absen'}</strong>
                            <span class="text-muted">${absensi ? '— ' + absensi.jamMasuk.replace(' WIB', '') : ''}</span>
                        </div>
                        <div class="small"><i class="fas fa-book text-primary me-2"></i>Logbook:
                            <strong>${logbook ? logbook.status : 'Belum ada logbook'}</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    $('#cardsAnakBimbingan').html(cards);
    $('#emptyInternalMonitoring').toggle(context.peserta.length === 0);
    $('#monitoringAlertText').text(latestDate
        ? 'Data kehadiran dan logbook menampilkan data terakhir dari halaman admin (' + latestDate + ').'
        : 'Belum ada data presensi pada data master.');

    // Inisialisasi DataTable Lintas Bidang
    var tableLintas = $('#tabelLintasBidang').DataTable({
        language: {
            search: "Cari Peserta / Unit:",
            lengthMenu: "Tampilkan _MENU_ data",
            zeroRecords: "Data peserta magang tidak ditemukan",
            info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ peserta lintas bidang",
            infoEmpty: "Menampilkan 0 data",
            infoFiltered: "(disaring dari _MAX_ total data)",
            paginate: {
                first: "Awal",
                last: "Akhir",
                next: "Berikutnya",
                previous: "Sebelumnya"
            }
        },
        pageLength: 10,
        order: [[1, 'asc']]
    });

    function renderTableLintas() {
        tableLintas.clear();
        dataLintasBidang.forEach(function(item, idx) {
            var colPeserta = `
                <div>
                    <strong style="color:var(--primary-dark);">${item.nama_peserta}</strong>
                    <div style="font-size:0.75rem; color:#777;">${item.instansi}</div>
                </div>
            `;

            var colUnit = `<span style="font-size:0.83rem; font-weight:500;">${item.unit_kerja}</span>`;
            var colPembimbing = `<div style="font-size:0.83rem; color:#444;"><i class="fas fa-user-tie text-primary me-1"></i>${item.pembimbing}</div>`;

            var colCheckin = item.checkin !== '-'
                ? `<span class="badge bg-light text-dark border">${item.checkin}</span>`
                : `<span class="text-muted">-</span>`;

            var colStatus = '';
            if (item.status_hadir === 'Hadir') {
                colStatus = '<span class="badge badge-approved">Hadir</span>';
            } else if (item.status_hadir === 'Terlambat') {
                colStatus = '<span class="badge badge-pending">Terlambat</span>';
            } else if (item.status_hadir === 'Izin') {
                colStatus = '<span class="badge" style="background:#e0f2fe; color:#0369a1;">Izin</span>';
            } else if (item.status_hadir === 'Sakit') {
                colStatus = '<span class="badge" style="background:#fce4ec; color:#c62828;">Sakit</span>';
            } else if (item.status_hadir === 'Belum Absen') {
                colStatus = '<span class="badge bg-light text-muted border">Belum Absen</span>';
            } else {
                colStatus = '<span class="badge badge-rejected">Alpha</span>';
            }

            var colLogbook = `<span class="small text-muted">${item.status_logbook}</span>`;

            tableLintas.row.add([
                idx + 1,
                colPeserta,
                colUnit,
                colPembimbing,
                colCheckin,
                colStatus,
                colLogbook
            ]);
        });
        tableLintas.draw();
    }

    renderTableLintas();

    // Filter Unit Kerja Lintas
    $('#filterUnitLintas').on('change', function() {
        var val = $(this).val();
        tableLintas.column(2).search(val).draw();
    });

    // Filter Status Lintas
    $('#filterStatusLintas').on('change', function() {
        var val = $(this).val();
        tableLintas.column(5).search(val).draw();
    });

    // Reset Filter Lintas
    $('#btnResetFilterLintas').on('click', function() {
        $('#filterUnitLintas').val('');
        $('#filterStatusLintas').val('');
        tableLintas.search('').columns().search('').draw();
    });

    // Refresh Tombol
    $('#btnRefreshMonitoring').on('click', function() {
        renderTableLintas();
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Data monitoring diperbarui',
            showConfirmButton: false,
            timer: 1500
        });
    });

});
