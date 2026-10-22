/* peserta-riwayat.js
   Modul Rekapitulasi & Riwayat Kehadiran Peserta Magang
*/

$(document).ready(function() {

    var context = window.pembimbingDemoData.getPesertaContext();
    var dataRiwayat = context.absensi.map(function(item) {
        var date = new Date(item.tanggal + 'T00:00:00');
        return {
            tanggal: item.tanggal,
            hari: date.toLocaleDateString('id-ID', { weekday: 'long' }),
            jam_masuk: item.jamMasuk,
            jam_pulang: item.jamPulang,
            foto_masuk: item.foto,
            jarak_meter: item.jarak,
            status: item.status,
            verifikasi: item.verifikasi,
            pembimbing: item.pembimbing
        };
    });

    $('#userName').text(context.peserta.nama);
    $('#userRole').text(context.peserta.nim + ' · ' + context.unit.nama);
    $('#userInitial').text(context.peserta.nama.charAt(0).toUpperCase());

    // Inisialisasi DataTable
    var table = $('#tabelRiwayatLengkap').DataTable({
        language: {
            search: "Cari Presensi:",
            lengthMenu: "Tampilkan _MENU_ data",
            zeroRecords: "Data presensi tidak ditemukan",
            info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ presensi",
            infoEmpty: "Menampilkan 0 data",
            infoFiltered: "(disaring dari _MAX_ total data)",
            paginate: {
                first: "Awal",
                last: "Akhir",
                next: "Berikutnya",
                previous: "Sebelumnya"
            }
        },
        order: [[1, 'desc']],
        columnDefs: [
            { orderable: false, targets: [4, 7] }
        ]
    });

    function updateStatistik() {
        var hadir = dataRiwayat.filter(r => r.status === 'Hadir').length;
        var terlambat = dataRiwayat.filter(r => r.status === 'Terlambat').length;
        var izin = dataRiwayat.filter(r => r.status === 'Izin').length;
        var sakit = dataRiwayat.filter(r => r.status === 'Sakit').length;
        var alpha = dataRiwayat.filter(r => r.status === 'Alpha').length;
        var totalHari = dataRiwayat.length;

        var persentase = totalHari > 0 ? (((hadir + terlambat) / totalHari) * 100).toFixed(1) : 0;

        $('#statHadir').text(hadir);
        $('#statTerlambat').text(terlambat);
        $('#statIzin').text(izin);
        $('#statSakit').text(sakit);
        $('#statAlpha').text(alpha);
        $('#statPersentase').text(persentase + '%');
    }

    function renderTable() {
        table.clear();
        dataRiwayat.forEach(function(item, idx) {
            var colTanggal = `<strong>${item.hari}, ${item.tanggal}</strong>`;

            var colMasuk = item.jam_masuk !== '-' 
                ? `<span class="badge bg-light text-dark border">${item.jam_masuk} WIB</span>` 
                : `<span class="text-muted">-</span>`;

            var colPulang = item.jam_pulang !== '-' 
                ? `<span class="badge bg-light text-dark border">${item.jam_pulang} WIB</span>` 
                : `<span class="text-muted">-</span>`;

            var colFoto = item.foto_masuk 
                ? `<span class="badge bg-light text-secondary border">
                     <i class="fas fa-camera text-primary me-1"></i>${item.foto_masuk}
                   </span>`
                : `<span class="text-muted small"><em>-</em></span>`;

            var colJarak = item.jarak_meter > 0 
                ? `<small class="text-success"><i class="fas fa-map-pin me-1"></i>${item.jarak_meter} m</small>` 
                : `<span class="text-muted small">-</span>`;

            var colStatus = '';
            if (item.status === 'Hadir') {
                colStatus = '<span class="badge badge-approved">Hadir</span>';
            } else if (item.status === 'Terlambat') {
                colStatus = '<span class="badge badge-pending">Terlambat</span>';
            } else if (item.status === 'Izin') {
                colStatus = '<span class="badge" style="background:#e0f2fe; color:#0369a1;">Izin</span>';
            } else if (item.status === 'Sakit') {
                colStatus = '<span class="badge" style="background:#fce4ec; color:#c62828;">Sakit</span>';
            } else {
                colStatus = '<span class="badge badge-rejected">Alpha</span>';
            }

            var colVerifikasi = '';
            if (item.verifikasi === 'Diverifikasi') {
                colVerifikasi = `<div>
                    <span class="badge badge-approved"><i class="fas fa-check-circle me-1"></i>Diverifikasi</span>
                    <div style="font-size:0.72rem; color:#28a745; margin-top:2px;"><i class="fas fa-signature me-1"></i>Paraf: ${item.pembimbing}</div>
                </div>`;
            } else if (item.verifikasi === 'Menunggu') {
                colVerifikasi = '<span class="badge badge-pending"><i class="fas fa-clock me-1"></i>Menunggu</span>';
            } else {
                colVerifikasi = '<span class="badge badge-rejected"><i class="fas fa-times-circle me-1"></i>Ditolak</span>';
            }

            table.row.add([
                idx + 1,
                colTanggal,
                colMasuk,
                colPulang,
                colFoto,
                colJarak,
                colStatus,
                colVerifikasi
            ]);
        });
        table.draw();
        updateStatistik();
    }

    renderTable();

    // Filter Tanggal Kalender (Tahun-Bulan-Hari)
    $('#filterTanggal').on('change input', function() {
        var tgl = $(this).val();
        if (tgl) {
            table.column(1).search(tgl).draw();
        } else {
            table.column(1).search('').draw();
        }
    });

    // Filter Status
    $('#filterStatusRiwayat').on('change', function() {
        var val = $(this).val();
        table.column(6).search(val).draw();
    });

    // Reset Filter
    $('#btnResetFilterRiwayat').on('click', function() {
        $('#filterTanggal').val('');
        $('#filterStatusRiwayat').val('');
        table.search('').columns().search('').draw();
    });

    // Preview Foto Selfie Riwayat
    $(document).on('click', '.btn-preview-foto-riwayat', function() {
        var src = $(this).data('src');
        Swal.fire({
            title: 'Foto Selfie Presensi',
            imageUrl: src,
            imageWidth: 300,
            imageHeight: 300,
            imageAlt: 'Selfie Presensi',
            confirmButtonColor: '#334EAC',
            confirmButtonText: 'Tutup'
        });
    });

    // Cetak Rekapitulasi Presensi
    $('#btnCetakRekap').on('click', function() {
        window.print();
    });

});
