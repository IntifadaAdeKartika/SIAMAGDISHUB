// SIAMAG DISHUB - Monitoring Logbook Harian Peserta (Admin)

$(document).ready(function() {

    // Data Unit Kerja
    var masterUnitKerja = window.masterUnitKerja;

    // Data Logbook Peserta Magang
    var dataLogbook = [
        {
            id: 1,
            tanggal: "2026-10-14",
            nim: "220102001",
            nama: "Intifada Ade Kartika",
            instansi: "Univ. Muhammadiyah Ponorogo",
            unitId: 1,
            unitNama: "Sekretariat",
            pembimbing: "Dra. Ida",
            jamMulai: "08:00",
            jamSelesai: "12:00",
            kegiatan: "Membantu mencetak SPMK dan melanjutkan pengembangan frontend sistem absensi magang.",
            hasil: "SPMK berhasil dicetak dan frontend sistem absensi magang berhasil diperbarui.",
            status: "Diverifikasi",
            catatan: "Pekerjaan rapi dan teliti.",
            lampiran: "bukti_kegiatan.jpg"
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
            jamMulai: "08:00",
            jamSelesai: "12:00",
            kegiatan: "Pengarsipan surat masuk dan surat keluar bidang kepegawaian Dishub.",
            hasil: "15 surat masuk teragenda pada buku register.",
            status: "Diverifikasi",
            catatan: "Tertib administrasi.",
            lampiran: "rekap_surat_masuk.pdf"
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
            jamMulai: "08:30",
            jamSelesai: "12:00",
            kegiatan: "Membantu mengarsipkan dokumen.",
            hasil: "Dokumen berhasil diarsipkan dengan rapi.",
            status: "Menunggu",
            catatan: "-",
            lampiran: "dokumen_arsip.jpg"
        }
    ];

    dataLogbook.forEach(function(item) {
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
    var table = $('#tabelMonitoringLogbook').DataTable({
        responsive: true,
        language: {
            search: "Cari Jurnal/Peserta:",
            lengthMenu: "Tampilkan _MENU_ data",
            zeroRecords: "Data logbook tidak ditemukan",
            info: "Menampilkan _START_ s/d _END_ dari _TOTAL_ logbook",
            infoEmpty: "Menampilkan 0 data",
            paginate: { first: "Awal", last: "Akhir", next: "→", previous: "←" }
        },
        order: [[1, 'desc']]
    });

    function renderData() {
        table.clear();

        var unitFilter = $('#filterUnit').val();
        var statusFilter = $('#filterStatus').val();

        var totalDiverif = 0;
        var totalMenunggu = 0;

        dataLogbook.forEach(function(item, index) {
            if (unitFilter && item.unitId != unitFilter) return;
            if (statusFilter && item.status !== statusFilter) return;

            if (item.status === 'Diverifikasi') totalDiverif++;
            if (item.status === 'Menunggu') totalMenunggu++;

            var badgeStatus = item.status === 'Diverifikasi'
                ? '<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>Diverifikasi</span>'
                : '<span class="badge bg-warning text-dark"><i class="fas fa-clock me-1"></i>Menunggu</span>';

            var btnAksi = `
                <button class="btn btn-sm btn-outline-primary btn-detail-log" data-id="${item.id}" title="Lihat Uraian & Foto Bukti">
                    <i class="fas fa-eye"></i> Detail
                </button>
            `;

            table.row.add([
                index + 1,
                item.tanggal,
                `<div>
                    <span class="fw-bold text-dark">${item.nama}</span>
                    <div class="small text-muted">${item.instansi}</div>
                 </div>`,
                `<div class="small fw-semibold text-primary">${item.unitNama}</div>
                 <div class="small text-muted">Pembimbing: ${item.pembimbing}</div>`,
                `<div class="text-truncate" style="max-width: 280px;" title="${item.kegiatan}">${item.kegiatan}</div>`,
                badgeStatus,
                btnAksi
            ]);
        });

        table.draw();

        $('#statTotalLog').text(dataLogbook.length);
        $('#statDiverif').text(totalDiverif);
        $('#statMenunggu').text(totalMenunggu);
    }

    renderData();

    $('#filterUnit, #filterStatus').on('change', function() {
        renderData();
    });

    $('#btnResetFilter').on('click', function() {
        $('#filterUnit').val('');
        $('#filterStatus').val('');
        renderData();
    });

    // Detail Modal Logbook
    $(document).on('click', '.btn-detail-log', function() {
        var id = $(this).data('id');
        var item = dataLogbook.find(x => x.id === id);
        if (!item) return;

        $('#modalNama').text(item.nama);
        $('#modalNimInstansi').text(item.nim + " - " + item.instansi);
        $('#modalUnit').text(item.unitNama);
        $('#modalPembimbing').text(item.pembimbing);
        $('#modalTanggal').text(item.tanggal + " (" + item.jamMulai + " - " + item.jamSelesai + " WIB)");
        $('#modalUraian').text(item.kegiatan);
        $('#modalHasil').text(item.hasil);
        $('#modalCatatanPembimbing').text(item.catatanPembimbing);
        $('#modalStatus').html(item.status === 'Diverifikasi' ? '<span class="badge bg-success">Diverifikasi & Diparaf</span>' : '<span class="badge bg-warning text-dark">Menunggu Verifikasi</span>');
        
        if (item.foto) {
            $('#modalFotoNama').text(item.foto);
            $('#modalFotoBox').show();
            $('#modalNoFoto').hide();
        } else {
            $('#modalFotoBox').hide();
            $('#modalNoFoto').show();
        }

        var modalEl = document.getElementById('modalDetailLogbook');
        if (modalEl) {
            var modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
        }
    });
});
