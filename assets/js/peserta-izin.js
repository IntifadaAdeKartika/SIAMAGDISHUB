/* peserta-izin.js
   Modul Pengajuan Izin & Sakit Peserta Magang
*/

$(document).ready(function() {

    var context = window.pembimbingDemoData.getPesertaContext();
    var dataIzin = context.izin;
    var pembimbingDemo = context.pembimbing.nama;
    $('#userName').text(context.peserta.nama);
    $('#userRole').text(context.peserta.nim + ' · ' + context.unit.nama);
    $('#userInitial').text(context.peserta.nama.charAt(0).toUpperCase());
    $('#pembimbingIzin').val(pembimbingDemo + ' (' + context.unit.nama + ')');

    // Inisialisasi DataTable
    var table = $('#tabelIzin').DataTable({
        language: {
            search: "Cari Izin:",
            lengthMenu: "Tampilkan _MENU_ data",
            zeroRecords: "Data pengajuan izin tidak ditemukan",
            info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ permohonan",
            infoEmpty: "Menampilkan 0 data",
            infoFiltered: "(disaring dari _MAX_ total data)",
            paginate: {
                first: "Awal",
                last: "Akhir",
                next: "Berikutnya",
                previous: "Sebelumnya"
            }
        },
        order: [[2, 'desc']],
        columnDefs: [
            { orderable: false, targets: [5, 7] }
        ]
    });

    function updateStats() {
        var total = dataIzin.length;
        var disetujui = dataIzin.filter(i => i.status === 'disetujui').length;
        var menunggu = dataIzin.filter(i => i.status === 'menunggu').length;
        var ditolak = dataIzin.filter(i => i.status === 'ditolak').length;

        $('#statTotalIzin').text(total);
        $('#statDisetujui').text(disetujui);
        $('#statMenungguIzin').text(menunggu);
        $('#statDitolakIzin').text(ditolak);
    }

    function renderTable() {
        table.clear();
        dataIzin.forEach(function(item, idx) {
            var badgeJenis = item.jenis === 'sakit'
                ? '<span class="badge" style="background:#fce4ec; color:#c62828;"><i class="fas fa-notes-medical me-1"></i>Sakit</span>'
                : '<span class="badge" style="background:#e0f2fe; color:#0369a1;"><i class="fas fa-calendar-times me-1"></i>Izin</span>';

            var badgeStatus = '';
            if (item.status === 'disetujui') {
                badgeStatus = '<span class="badge badge-approved"><i class="fas fa-check-circle me-1"></i>Disetujui</span>';
            } else if (item.status === 'menunggu') {
                badgeStatus = '<span class="badge badge-pending"><i class="fas fa-clock me-1"></i>Menunggu</span>';
            } else {
                badgeStatus = '<span class="badge badge-rejected"><i class="fas fa-times-circle me-1"></i>Ditolak</span>';
            }

            var colPeriode = `
                <div>
                    <strong>${item.tanggal_mulai}</strong>
                    ${item.tanggal_mulai !== item.tanggal_selesai ? '<br><small class="text-muted">s/d ' + item.tanggal_selesai + '</small>' : ''}
                </div>
            `;

            var colDurasi = `<span class="badge bg-light text-dark border">${item.durasi_hari} Hari</span>`;

            var colAlasan = `
                <div style="font-size:0.83rem; line-height:1.4; max-width:250px;">
                    ${item.alasan}
                </div>
            `;

            var colSurat = item.file_surat
                ? `<span class="badge bg-light text-secondary border">
                     <i class="fas fa-file-pdf text-danger me-1"></i>${item.file_surat}
                   </span>`
                : `<span class="text-muted small"><em>Tidak ada</em></span>`;

            // Tombol batalkan jika masih menunggu
            var btnBatalHtml = (item.status === 'menunggu')
                ? `<button class="btn btn-sm btn-outline-danger btn-aksi btn-batalkan-izin" data-id="${item.id}" title="Batalkan Pengajuan">
                     <i class="fas fa-ban"></i> Batal
                   </button>`
                : '';

            var colAksi = `
                <div class="action-buttons text-center">
                    <button class="btn btn-sm btn-outline-primary btn-aksi btn-detail-izin" data-id="${item.id}" title="Detail">
                        <i class="fas fa-eye me-1"></i> Detail
                    </button>
                    ${btnBatalHtml}
                </div>
            `;

            table.row.add([
                idx + 1,
                badgeJenis,
                colPeriode,
                colDurasi,
                colAlasan,
                colSurat,
                badgeStatus,
                colAksi
            ]);
        });
        table.draw();
        updateStats();
    }

    renderTable();

    // Hitung durasi hari otomatis saat tanggal diubah
    function hitungDurasi() {
        var tgl1 = $('#tglMulaiIzin').val();
        var tgl2 = $('#tglSelesaiIzin').val();
        if (tgl1 && tgl2) {
            var d1 = new Date(tgl1);
            var d2 = new Date(tgl2);
            if (d2 >= d1) {
                var timeDiff = d2.getTime() - d1.getTime();
                var dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
                $('#textDurasiHari').text(dayDiff + ' Hari');
                $('#infoDurasiIzin').show();
            } else {
                $('#infoDurasiIzin').hide();
            }
        }
    }

    $('#tglMulaiIzin, #tglSelesaiIzin').on('change', hitungDurasi);

    // Buka Modal Pengajuan
    $('#btnBukaModalIzin').on('click', function() {
        $('#formIzin')[0].reset();
        var today = new Date().toISOString().split('T')[0];
        $('#tglMulaiIzin').val(today);
        $('#tglSelesaiIzin').val(today);
        hitungDurasi();
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalIzin')).show();
    });

    // Submit Permohonan Izin Baru
    $('#formIzin').on('submit', function(e) {
        e.preventDefault();

        var jenis = $('#jenisIzin').val();
        var tglMulai = $('#tglMulaiIzin').val();
        var tglSelesai = $('#tglSelesaiIzin').val();
        var alasan = $('#alasanIzin').val().trim();

        if (new Date(tglSelesai) < new Date(tglMulai)) {
            Swal.fire('Validasi Tanggal', 'Tanggal selesai izin tidak boleh sebelum tanggal mulai!', 'warning');
            return;
        }

        var d1 = new Date(tglMulai);
        var d2 = new Date(tglSelesai);
        var durasi = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)) + 1;

        var newId = dataIzin.length ? Math.max(...dataIzin.map(i => i.id)) + 1 : 1;
        dataIzin.unshift({
            id: newId,
            jenis: jenis,
            tanggal_mulai: tglMulai,
            tanggal_selesai: tglSelesai,
            durasi_hari: durasi,
            alasan: alasan,
            file_surat: "surat_permohonan_" + newId + ".pdf",
            status: "menunggu",
            catatan_pembimbing: "-",
            pembimbing: pembimbingDemo
        });

        var modalEl = document.getElementById('modalIzin');
        if (modalEl) {
            var modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }
        renderTable();

        Swal.fire({
            icon: 'success',
            title: 'Pengajuan Terkirim!',
            text: 'Permohonan izin Anda berhasil dikirim ke Pembimbing Lapangan (' + pembimbingDemo + ').',
            confirmButtonColor: '#334EAC'
        });
    });

    // Detail Izin
    $(document).on('click', '.btn-detail-izin', function() {
        var id = $(this).data('id');
        var item = dataIzin.find(i => i.id == id);
        if (!item) return;

        var badgeStatus = '';
        if (item.status === 'disetujui') {
            badgeStatus = '<span class="badge badge-approved"><i class="fas fa-check-circle me-1"></i>Disetujui Pembimbing</span>';
        } else if (item.status === 'menunggu') {
            badgeStatus = '<span class="badge badge-pending"><i class="fas fa-clock me-1"></i>Menunggu Verifikasi</span>';
        } else {
            badgeStatus = '<span class="badge badge-rejected"><i class="fas fa-times-circle me-1"></i>Ditolak</span>';
        }

        var catatanHtml = item.catatan_pembimbing && item.catatan_pembimbing !== '-'
            ? `<div class="p-3 rounded mb-3" style="background:#e8f4fd; border-left:4px solid #334EAC;">
                 <strong style="font-size:0.85rem;"><i class="fas fa-comment-alt me-1"></i>Catatan Pembimbing:</strong>
                 <div style="font-size:0.83rem; color:#081F5C; margin-top:3px;">${item.catatan_pembimbing}</div>
               </div>`
            : '';

        var html = `
            ${catatanHtml}
            <div class="modal-detail-wrapper mb-3">
                <table class="table table-sm table-striped align-middle mb-0" style="font-size:0.875rem;">
                    <tbody>
                        <tr>
                            <td class="text-muted py-2" style="width:38%;"><i class="fas fa-tag me-2 text-primary" style="width:16px;"></i>Jenis Pengajuan</td>
                            <td class="text-center text-muted py-2" style="width:5%;">:</td>
                            <td class="py-2"><span class="text-uppercase fw-bold text-primary">${item.jenis}</span></td>
                        </tr>
                        <tr>
                            <td class="text-muted py-2"><i class="fas fa-hourglass-half me-2 text-primary" style="width:16px;"></i>Durasi</td>
                            <td class="text-center text-muted py-2">:</td>
                            <td class="fw-semibold text-dark py-2">${item.durasi_hari} Hari</td>
                        </tr>
                        <tr>
                            <td class="text-muted py-2"><i class="fas fa-calendar-alt me-2 text-secondary" style="width:16px;"></i>Periode Izin</td>
                            <td class="text-center text-muted py-2">:</td>
                            <td class="fw-semibold text-dark py-2">${item.tanggal_mulai} s/d ${item.tanggal_selesai}</td>
                        </tr>
                        <tr>
                            <td class="text-muted py-2"><i class="fas fa-info-circle me-2 text-info" style="width:16px;"></i>Status Persetujuan</td>
                            <td class="text-center text-muted py-2">:</td>
                            <td class="py-2">${badgeStatus}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="mb-3">
                <label class="fw-bold small text-muted">Alasan / Keterangan:</label>
                <div class="p-2 rounded" style="background:var(--bg-light); font-size:0.85rem; line-height:1.5;">
                    ${item.alasan}
                </div>
            </div>

            <div class="mt-3">
                <label class="fw-bold small text-muted d-block text-start mb-2">Lampiran Bukti Surat:</label>
                <div class="p-3 border rounded bg-light text-center">
                    <i class="fas fa-file-pdf text-danger fa-2x mb-2"></i>
                    <div class="fw-semibold small">${item.file_surat}</div>
                    <small class="text-muted">Berkas surat izin / keterangan dokter</small>
                </div>
            </div>
        `;

        $('#contentDetailIzin').html(html);
        var modalEl = document.getElementById('modalDetailIzin');
        if (modalEl) {
            var modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
        }
    });

    // Preview Surat
    $(document).on('click', '.btn-preview-surat', function() {
        var src = $(this).data('src');
        Swal.fire({
            title: 'Bukti Surat Izin / Dokter',
            imageUrl: src,
            imageWidth: 450,
            imageAlt: 'Surat Izin',
            confirmButtonColor: '#334EAC',
            confirmButtonText: 'Tutup'
        });
    });

    // Batalkan Pengajuan Izin
    $(document).on('click', '.btn-batalkan-izin', function() {
        var id = $(this).data('id');
        var item = dataIzin.find(i => i.id == id);
        if (!item) return;

        Swal.fire({
            title: 'Batalkan Pengajuan?',
            text: 'Permohonan izin tanggal ' + item.tanggal_mulai + ' akan dibatalkan.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Ya, Batalkan',
            cancelButtonText: 'Kembali'
        }).then(function(result) {
            if (result.isConfirmed) {
                dataIzin = dataIzin.filter(i => i.id != id);
                renderTable();
                Swal.fire({
                    icon: 'success',
                    title: 'Dibatalkan!',
                    text: 'Pengajuan izin berhasil dibatalkan.',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        });
    });

    // Refresh Table
    $('#btnReloadTable').on('click', function() {
        renderTable();
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Data permohonan izin diperbarui',
            showConfirmButton: false,
            timer: 1500
        });
    });

});
