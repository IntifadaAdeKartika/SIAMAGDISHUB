// Monitoring Pengajuan Izin Peserta (Admin)

$(document).ready(function() {

    var masterUnitKerja = window.masterUnitKerja;

    // Data pengajuan izin dan sakit 
    var dataIzin = [
        {
            id: 1,
            tglPengajuan: "2026-10-14",
            nim: "220102001",
            nama: "Intifada Ade Kartika",
            instansi: "Univ. Muhammadiyah Ponorogo",
            unitId: 1,
            unitNama: "Sekretariat",
            pembimbing: "Dra. Ida",
            jenis: "Izin",
            tglMulai: "2026-10-16",
            tglSelesai: "2026-10-16",
            durasi: 1,
            alasan: "Bimbingan Project Magang dengan Dosen Pembimbing.",
            status: "Menunggu",
            fileSurat: "surat_izin_kampus.pdf"
        },
        {
            id: 2,
            tglPengajuan: "2026-10-10",
            nim: "220203002",
            nama: "Ayu Sri",
            instansi: "Universitas Brawijaya",
            unitId: 5,
            unitNama: "Seksi Angkutan Orang",
            pembimbing: "Adi, S.T.",
            jenis: "Sakit",
            tglMulai: "2026-10-12",
            tglSelesai: "2026-10-14",
            durasi: 3,
            alasan: "Radang pada usus dan membutuhkan penyembuhan sekitar 3 hari.",
            status: "Disetujui",
            fileSurat: "surat_keterangan_dokter.pdf"
        }
    ];

    dataIzin.forEach(function(item) {
        var penempatan = window.getMasterPenempatanPeserta(item.nim);
        if (!penempatan) return;
        item.nama = penempatan.peserta.nama;
        item.instansi = penempatan.peserta.instansi;
        item.unitId = penempatan.unit.id;
        item.unitNama = penempatan.unit.nama;
        item.pembimbing = penempatan.namaPembimbing;
    });

    masterUnitKerja.forEach(function(u) {
        $('#filterUnit').append(new Option(u.nama + " (" + u.kode + ")", u.id));
    });

    var table = $('#tabelMonitoringIzin').DataTable({
        responsive: true,
        language: {
            search: "Cari Pengajuan:",
            lengthMenu: "Tampilkan _MENU_ data",
            zeroRecords: "Data izin tidak ditemukan",
            info: "Menampilkan _START_ s/d _END_ dari _TOTAL_ izin",
            infoEmpty: "Menampilkan 0 data",
            paginate: { first: "Awal", last: "Akhir", next: "→", previous: "←" }
        },
        order: [[1, 'desc']]
    });

    function renderData() {
        table.clear();

        var unitFilter = $('#filterUnit').val();
        var jenisFilter = $('#filterJenis').val();
        var statusFilter = $('#filterStatus').val();

        var countTotal = dataIzin.length;
        var countMenunggu = 0;
        var countDisetujui = 0;

        dataIzin.forEach(function(item, index) {
            if (unitFilter && item.unitId != unitFilter) return;
            if (jenisFilter && item.jenis !== jenisFilter) return;
            if (statusFilter && item.status !== statusFilter) return;

            if (item.status === 'Menunggu') countMenunggu++;
            if (item.status === 'Disetujui') countDisetujui++;

            var badgeJenis = item.jenis === 'Sakit' ? 'bg-danger' : 'bg-info text-dark';
            var badgeStatus = item.status === 'Disetujui' 
                ? '<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>Disetujui</span>' 
                : '<span class="badge bg-warning text-dark"><i class="fas fa-clock me-1"></i>Menunggu</span>';

            var btnAksi = `
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary btn-detail-izin" data-id="${item.id}" title="Lihat Berkas Surat & Alasan">
                        <i class="fas fa-eye"></i> Detail
                    </button>
                    ${item.status === 'Menunggu' ? `
                    <button class="btn btn-outline-success btn-approve-admin" data-id="${item.id}" title="Intervensi Setujui (Admin)">
                        <i class="fas fa-check"></i>
                    </button>` : ''}
                </div>
            `;

            table.row.add([
                index + 1,
                item.tglPengajuan,
                `<div>
                    <span class="fw-bold text-dark">${item.nama}</span>
                    <div class="small text-muted">${item.instansi}</div>
                 </div>`,
                `<div class="small fw-semibold text-primary">${item.unitNama}</div>
                 <div class="small text-muted">Pembimbing: ${item.pembimbing}</div>`,
                `<span class="badge ${badgeJenis}">${item.jenis}</span>`,
                `<div>${item.tglMulai} s/d ${item.tglSelesai}</div>
                 <small class="badge bg-light text-dark border">${item.durasi} Hari</small>`,
                badgeStatus,
                btnAksi
            ]);
        });

        table.draw();

        $('#statTotalIzin').text(countTotal);
        $('#statMenungguIzin').text(countMenunggu);
        $('#statDisetujuiIzin').text(countDisetujui);
    }

    renderData();

    $('#filterUnit, #filterJenis, #filterStatus').on('change', function() {
        renderData();
    });

    $('#btnResetFilter').on('click', function() {
        $('#filterUnit').val('');
        $('#filterJenis').val('');
        $('#filterStatus').val('');
        renderData();
    });

    // Modal Detail Izin
    $(document).on('click', '.btn-detail-izin', function() {
        var id = $(this).data('id');
        var item = dataIzin.find(x => x.id === id);
        if (!item) return;

        $('#modalNama').text(item.nama);
        $('#modalNimInstansi').text(item.nim + " - " + item.instansi);
        $('#modalUnit').text(item.unitNama);
        $('#modalPembimbing').text(item.pembimbing);
        $('#modalJenis').html(item.jenis === 'Sakit' ? '<span class="badge bg-danger">Sakit</span>' : '<span class="badge bg-info text-dark">Izin</span>');
        $('#modalPeriode').text(item.tglMulai + " s/d " + item.tglSelesai + " (" + item.durasi + " Hari)");
        $('#modalAlasan').text(item.alasan);
        $('#modalStatus').html(item.status === 'Disetujui' ? '<span class="badge bg-success">Disetujui oleh ' + item.disetujuiOleh + '</span>' : '<span class="badge bg-warning text-dark">Menunggu Persetujuan</span>');
        $('#modalCatatan').text(item.catatanPersetujuan);

        if (item.fileBukti) {
            $('#modalBuktiNama').text(item.fileBukti);
            $('#modalBuktiBox').show();
            $('#modalNoBukti').hide();
        } else {
            $('#modalBuktiBox').hide();
            $('#modalNoBukti').show();
        }

        var modalEl = document.getElementById('modalDetailIzin');
        if (modalEl) {
            var modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
        }
    });

    // Intervensi Setujui Izin oleh Admin
    $(document).on('click', '.btn-approve-admin', function() {
        var id = $(this).data('id');
        var item = dataIzin.find(x => x.id === id);
        if (!item) return;

        Swal.fire({
            title: 'Setujui Pengajuan Izin?',
            html: `Setujui pengajuan ${item.jenis} atas nama <b>${item.nama}</b>?<br><small class="text-muted">Tindakan ini sebagai administrator dinas jika pembimbing berhalangan.</small>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            confirmButtonText: 'Ya, Setujui',
            cancelButtonText: 'Batal'
        }).then(function(res) {
            if (res.isConfirmed) {
                item.status = 'Disetujui';
                item.disetujuiOleh = 'Administrator Dinas';
                item.catatanPersetujuan = 'Disetujui melalui intervensi Administrator.';
                renderData();
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil Disetujui!',
                    text: 'Pengajuan izin telah disetujui.',
                    timer: 1800,
                    showConfirmButton: false
                });
            }
        });
    });
});
