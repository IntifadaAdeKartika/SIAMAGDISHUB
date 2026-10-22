// Monitoring Absensi Peserta (Admin)

$(document).ready(function() {

    var masterUnitKerja = window.masterUnitKerja;

    // Data presensi peserta magang
    var dataAbsensi = [
        {
            id: 1,
            tanggal: "2026-10-14",
            nim: "220102001",
            nama: "Intifada Ade Kartika",
            instansi: "Univ. Muhammadiyah Ponorogo",
            unitId: 1,
            unitNama: "Sekretariat",
            pembimbing: "Dra. Ida",
            jamMasuk: "07:15:20 WIB",
            status: "Hadir",
            isRadiusValid: true,
            statusRadius: "Dalam Radius (18 m)",
            statusVerif: "Diverifikasi",
            fotoSelfie: "selfie_intifada_14sep.jpg",
            lat: -7.8682,
            lng: 111.4623
        },
        {
            id: 2,
            tanggal: "2026-10-14",
            nim: "220203002",
            nama: "Ayu Sri",
            instansi: "Universitas Brawijaya",
            unitId: 5,
            unitNama: "Seksi Angkutan Orang",
            pembimbing: "Adi, S.T.",
            jamMasuk: "07:22:10 WIB",
            status: "Hadir",
            isRadiusValid: true,
            statusRadius: "Dalam Radius (22 m)",
            statusVerif: "Diverifikasi",
            fotoSelfie: "selfie_ayu_14sep.jpg",
            lat: -7.8681,
            lng: 111.4625
        },
        {            
            id: 3,
            tanggal: "2026-10-14",
            nim: "220304003",
            nama: "Siti Aminah",
            instansi: "SMKN 1 Jenangan Ponorogo",
            unitId: 5,
            unitNama: "Seksi Angkutan Orang",
            pembimbing: "Adi, S.T.",
            jamMasuk: "08:01:45 WIB",
            status: "Terlambat",
            isRadiusValid: true,
            statusRadius: "Dalam Radius (28 m)",
            statusVerif: "Menunggu",
            fotoSelfie: "selfie_siti_14sep.jpg",
            lat: -7.8683,
            lng: 111.4622}
    ];

    dataAbsensi.forEach(function(item) {
            var penempatan = window.getMasterPenempatanPeserta(item.nim);
            if (!penempatan) return;
            item.nama = penempatan.peserta.nama;
            item.instansi = penempatan.peserta.instansi;
            item.unitId = penempatan.unit.id;
            item.unitNama = penempatan.unit.nama;
            item.pembimbing = penempatan.namaPembimbing;
    });

    // Populate filter unit kerja
    masterUnitKerja.forEach(function(u) {
        $('#filterUnit').append(new Option(u.nama + " (" + u.kode + ")", u.id));
    });

    // Inisialisasi DataTable
    var table = $('#tabelMonitoringAbsen').DataTable({
        responsive: true,
        language: {
            search: "Cari Peserta:",
            lengthMenu: "Tampilkan _MENU_ data",
            zeroRecords: "Data presensi tidak ditemukan",
            info: "Menampilkan _START_ s/d _END_ dari _TOTAL_ presensi",
            infoEmpty: "Menampilkan 0 data",
            paginate: { first: "Awal", last: "Akhir", next: "→", previous: "←" }
        },
        order: [[1, 'desc']]
    });

    // Render Data ke DataTable
    function renderData() {
        table.clear();

        var unitFilter = $('#filterUnit').val();
        var statusFilter = $('#filterStatus').val();

        var totalHadir = 0;
        var totalTerlambat = 0;
        var totalLuarRadius = 0;
        var totalIzinSakit = 0;

        dataAbsensi.forEach(function(item, index) {
            // Filter logic
            if (unitFilter && item.unitId != unitFilter) return;
            if (statusFilter && item.status !== statusFilter) return;

            // Stats count
            if (item.status === 'Hadir') totalHadir++;
            if (item.status === 'Terlambat') totalTerlambat++;
            if (!item.isRadiusValid) totalLuarRadius++;
            if (item.status === 'Sakit' || item.status === 'Izin') totalIzinSakit++;

            // Badges
            var badgeStatus = 'bg-success';
            if (item.status === 'Terlambat') badgeStatus = 'bg-warning text-dark';
            else if (item.status === 'Sakit') badgeStatus = 'bg-danger';
            else if (item.status === 'Izin') badgeStatus = 'bg-info text-dark';

            var badgeRadius = item.isRadiusValid 
                ? `<span class="badge bg-success-subtle text-success border border-success"><i class="fas fa-check-circle me-1"></i>${item.statusRadius}</span>`
                : (item.statusRadius === '-' ? '-' : `<span class="badge bg-danger-subtle text-danger border border-danger"><i class="fas fa-exclamation-triangle me-1"></i>${item.statusRadius}</span>`);

            var badgeVerif = item.statusVerif === 'Diverifikasi'
                ? '<span class="badge bg-primary"><i class="fas fa-signature me-1"></i>Diverifikasi</span>'
                : (item.statusVerif === 'Menunggu' ? '<span class="badge bg-warning text-dark">Menunggu</span>' : '<span class="badge bg-secondary">' + item.statusVerif + '</span>');

            var btnAksi = `
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary btn-detail-absen" data-id="${item.id}" title="Detail & Foto Selfie">
                        <i class="fas fa-eye"></i> Detail
                    </button>
                </div>
            `;

            table.row.add([
                index + 1,
                item.tanggal,
                `<div>
                    <span class="fw-bold text-dark">${item.nama}</span>
                    <div class="small text-muted">NIM. ${item.nim} &bull; ${item.instansi}</div>
                 </div>`,
                `<div class="small fw-semibold text-primary">${item.unitNama}</div>
                 <div class="small text-muted">Pembimbing: ${item.pembimbing}</div>`,
                `<div class="font-monospace fw-semibold">${item.jamMasuk}</div>`,
                `<span class="badge ${badgeStatus}">${item.status}</span>`,
                badgeRadius,
                badgeVerif,
                btnAksi
            ]);
        });

        table.draw();

        // Update Counter
        $('#statHadir').text(totalHadir);
        $('#statTerlambat').text(totalTerlambat);
        $('#statLuarRadius').text(totalLuarRadius);
        $('#statIzinSakit').text(totalIzinSakit);
    }

    renderData();

    // Event Filter
    $('#filterUnit, #filterStatus').on('change', function() {
        renderData();
    });

    $('#btnResetFilter').on('click', function() {
        $('#filterUnit').val('');
        $('#filterStatus').val('');
        renderData();
    });

    // Modal Detail Presensi
    $(document).on('click', '.btn-detail-absen', function() {
        var id = $(this).data('id');
        var item = dataAbsensi.find(x => x.id === id);
        if (!item) return;

        $('#modalNama').text(item.nama);
        $('#modalNimInstansi').text(item.nim + " - " + item.instansi);
        $('#modalUnit').text(item.unitNama);
        $('#modalPembimbing').text(item.pembimbing);
        $('#modalWaktu').text(item.tanggal + " | Pukul " + item.jamMasuk + " WIB");
        $('#modalLokasiKantor').text(item.lokasiKantor || 'Kantor Sekretariat Dishub');
        $('#modalRadius').text(item.statusRadius);
        $('#modalVerif').text(item.statusVerif + " (" + item.catatanVerif + ")");

        if (item.fotoMasuk) {
            $('#modalFotoNama').text(item.fotoMasuk);
            $('#modalFotoBox').show();
            $('#modalNoFoto').hide();
        } else {
            $('#modalFotoBox').hide();
            $('#modalNoFoto').show();
        }

        var modalEl = document.getElementById('modalDetailAbsen');
        if (modalEl) {
            var modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
        }
    });
});
