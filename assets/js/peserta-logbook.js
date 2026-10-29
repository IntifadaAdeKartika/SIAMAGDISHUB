/* peserta-logbook.js
   Modul Pengisian & Pengelolaan Logbook Kegiatan Peserta Magang
 */

$(document).ready(function() {

    var context = window.pembimbingDemoData.getPesertaContext();
    var dataLogbook = context.logbook;
    var pembimbingDemo = context.pembimbing.nama;
    $('#userName').text(context.peserta.nama);
    $('#userRole').text(context.peserta.nim + ' · ' + context.unit.nama);
    $('#userInitial').text(context.peserta.nama.charAt(0).toUpperCase());

    // Inisialisasi DataTable
    var table = $('#tabelLogbook').DataTable({
        language: {
            search: "Cari Logbook:",
            lengthMenu: "Tampilkan _MENU_ data",
            zeroRecords: "Data logbook tidak ditemukan",
            info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ logbook",
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
            { orderable: false, targets: [4, 6] }
        ]
    });

    function updateStats() {
        var total = dataLogbook.length;
        var diverifikasi = dataLogbook.filter(l => l.status_verifikasi === 'diverifikasi').length;
        var menunggu = dataLogbook.filter(l => l.status_verifikasi === 'menunggu').length;
        var ditolak = dataLogbook.filter(l => l.status_verifikasi === 'ditolak').length;

        $('#statTotalLogbook').text(total);
        $('#statDiverifikasi').text(diverifikasi);
        $('#statMenunggu').text(menunggu);
        $('#statDitolak').text(ditolak);
    }

    function renderTable() {
        table.clear();
        dataLogbook.forEach(function(item, idx) {
            var badgeStatus = '';
            var infoParaf = '';

            if (item.status_verifikasi === 'diverifikasi') {
                badgeStatus = '<span class="badge badge-approved"><i class="fas fa-check-circle me-1"></i>Diverifikasi</span>';
                infoParaf = `<div style="font-size:0.72rem; color:#28a745; margin-top:3px;"><i class="fas fa-signature me-1"></i>Paraf: ${item.pembimbing}</div>`;
            } else if (item.status_verifikasi === 'menunggu') {
                badgeStatus = '<span class="badge badge-pending"><i class="fas fa-clock me-1"></i>Menunggu</span>';
                infoParaf = `<div style="font-size:0.72rem; color:#999; margin-top:3px;">Belum diparaf</div>`;
            } else {
                badgeStatus = '<span class="badge badge-rejected"><i class="fas fa-times-circle me-1"></i>Perlu Revisi</span>';
                infoParaf = `<div style="font-size:0.72rem; color:#dc3545; margin-top:3px;"><i class="fas fa-comment-dots me-1"></i>Ada catatan</div>`;
            }

            var colWaktu = `
                <div>
                    <strong>${item.tanggal}</strong>
                    <div style="font-size:0.76rem; color:#666;">
                        <i class="far fa-clock me-1"></i>${item.waktu_mulai} - ${item.waktu_selesai}
                    </div>
                </div>
            `;

            var colDeskripsi = `
                <div style="font-size:0.83rem; line-height:1.4;">
                    ${item.deskripsi_kegiatan}
                </div>
            `;

            var colHasil = `
                <div style="font-size:0.82rem; color:#555;">
                    <i class="fas fa-clipboard-check text-primary me-1"></i>${item.hasil_kegiatan}
                </div>
            `;

            var colLampiran = item.file_lampiran 
                ? `<span class="badge bg-light text-secondary border">
                     <i class="fas fa-file-alt text-primary me-1"></i>${item.file_lampiran}
                   </span>`
                : `<span class="text-muted small"><em>Tidak ada</em></span>`;

            var colStatus = `
                <div>
                    ${badgeStatus}
                    ${infoParaf}
                </div>
            `;

            // Tombol aksi: Edit hanya jika belum diverifikasi atau ditolak
            var btnEditHtml = (item.status_verifikasi !== 'diverifikasi')
                ? `<button class="btn btn-sm btn-outline-secondary btn-aksi btn-edit-logbook" data-id="${item.id}" title="Edit / Revisi">
                     <i class="fas fa-edit"></i>
                   </button>`
                : '';

            var btnHapusHtml = (item.status_verifikasi !== 'diverifikasi')
                ? `<button class="btn btn-sm btn-outline-danger btn-aksi btn-hapus-logbook" data-id="${item.id}" title="Hapus">
                     <i class="fas fa-trash"></i>
                   </button>`
                : '';

            var colAksi = `
                <div class="action-buttons text-center">
                    <button class="btn btn-sm btn-outline-primary btn-aksi btn-detail-logbook" data-id="${item.id}" title="Detail">
                        <i class="fas fa-eye me-1"></i> Detail
                    </button>
                    ${btnEditHtml}
                    ${btnHapusHtml}
                </div>
            `;

            table.row.add([
                idx + 1,
                colWaktu,
                colDeskripsi,
                colHasil,
                colLampiran,
                colStatus,
                colAksi
            ]);
        });
        table.draw();
        updateStats();
    }

    renderTable();

    // Filter Status
    $('#filterStatusLogbook').on('change', function() {
        var val = $(this).val();
        table.column(5).search(val).draw();
    });

    // Filter Keyword
    $('#filterKeywordLogbook').on('keyup', function() {
        table.search($(this).val()).draw();
    });

    // Reset Filter
    $('#btnResetFilterLogbook').on('click', function() {
        $('#filterStatusLogbook').val('');
        $('#filterKeywordLogbook').val('');
        table.search('').columns().search('').draw();
    });

    // Refresh
    $('#btnReloadTable').on('click', function() {
        renderTable();
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Data logbook diperbarui',
            showConfirmButton: false,
            timer: 1500
        });
    });

    // Buka Modal Tambah Logbook
    $('#btnTambahLogbook').on('click', function() {
        $('#formLogbook')[0].reset();
        $('#logbookId').val('');
        // Set tanggal hari ini secara default
        var today = new Date().toISOString().split('T')[0];
        $('#tglLogbook').val(today);
        $('#modalLogbookTitle').html('<i class="fas fa-edit me-2"></i>Isi Logbook Kegiatan Hari Ini');
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalLogbook')).show();
    });

    // Submit Form (Tambah / Edit)
    $('#formLogbook').on('submit', function(e) {
        e.preventDefault();

        var id = $('#logbookId').val();
        var tgl = $('#tglLogbook').val();
        var mulai = $('#waktuMulai').val();
        var selesai = $('#waktuSelesai').val();
        var deskripsi = $('#deskripsiKegiatan').val().trim();
        var hasil = $('#hasilKegiatan').val().trim();

        if (mulai >= selesai) {
            Swal.fire('Validasi Waktu', 'Waktu selesai harus lebih besar dari waktu mulai kegiatan!', 'warning');
            return;
        }

        if (id) {
            // Edit / Revisi
            var idx = dataLogbook.findIndex(l => l.id == id);
            if (idx !== -1) {
                dataLogbook[idx].tanggal = tgl;
                dataLogbook[idx].waktu_mulai = mulai;
                dataLogbook[idx].waktu_selesai = selesai;
                dataLogbook[idx].deskripsi_kegiatan = deskripsi;
                dataLogbook[idx].hasil_kegiatan = hasil;
                dataLogbook[idx].status_verifikasi = "menunggu"; // Reset ke menunggu setelah direvisi
                dataLogbook[idx].catatan_pembimbing = "-";
            }
            Swal.fire({
                icon: 'success',
                title: 'Logbook Diperbarui!',
                text: 'Perubahan logbook disimpan dan menunggu verifikasi ulang pembimbing.',
                confirmButtonColor: '#334EAC'
            });
        } else {
            // Tambah Baru
            var newId = dataLogbook.length ? Math.max(...dataLogbook.map(l => l.id)) + 1 : 1;
            dataLogbook.unshift({
                id: newId,
                tanggal: tgl,
                waktu_mulai: mulai,
                waktu_selesai: selesai,
                deskripsi_kegiatan: deskripsi,
                hasil_kegiatan: hasil,
                file_lampiran: "lampiran_kegiatan_" + newId + ".pdf",
                status_verifikasi: "menunggu",
                catatan_pembimbing: "-",
                pembimbing: pembimbingDemo,
                paraf: false
            });
            Swal.fire({
                icon: 'success',
                title: 'Logbook Disimpan!',
                text: 'Kegiatan berhasil dilaporkan ke Pembimbing Lapangan (' + pembimbingDemo + ').',
                confirmButtonColor: '#334EAC'
            });
        }

        var modalEl = document.getElementById('modalLogbook');
        if (modalEl) {
            var modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }
        renderTable();
    });

    // Edit Logbook
    $(document).on('click', '.btn-edit-logbook', function() {
        var id = $(this).data('id');
        var item = dataLogbook.find(l => l.id == id);
        if (!item) return;

        $('#logbookId').val(item.id);
        $('#tglLogbook').val(item.tanggal);
        $('#waktuMulai').val(item.waktu_mulai);
        $('#waktuSelesai').val(item.waktu_selesai);
        $('#deskripsiKegiatan').val(item.deskripsi_kegiatan);
        $('#hasilKegiatan').val(item.hasil_kegiatan);

        $('#modalLogbookTitle').html('<i class="fas fa-edit me-2"></i>Edit / Revisi Logbook');
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalLogbook')).show();
    });

    // Detail Logbook
    $(document).on('click', '.btn-detail-logbook', function() {
        var id = $(this).data('id');
        var item = dataLogbook.find(l => l.id == id);
        if (!item) return;

        var lampiranHtml = item.file_lampiran 
            ? `<div class="p-3 border rounded bg-light text-center">
                 <i class="fas fa-file-pdf text-danger fa-2x mb-1"></i>
                 <div class="fw-semibold small">${item.file_lampiran}</div>
                 <small class="text-muted">Dokumen lampiran bukti kegiatan</small>
               </div>`
            : `<div class="text-muted small"><em>Tidak ada lampiran dokumen</em></div>`;

        var badgeStatus = '';
        if (item.status_verifikasi === 'diverifikasi') {
            badgeStatus = `<span class="badge badge-approved"><i class="fas fa-check-circle me-1"></i>Diverifikasi & Diparaf</span>`;
        } else if (item.status_verifikasi === 'menunggu') {
            badgeStatus = `<span class="badge badge-pending"><i class="fas fa-clock me-1"></i>Menunggu Verifikasi</span>`;
        } else {
            badgeStatus = `<span class="badge badge-rejected"><i class="fas fa-exclamation-triangle me-1"></i>Perlu Revisi / Ditolak</span>`;
        }

        var catatanHtml = item.catatan_pembimbing && item.catatan_pembimbing !== '-'
            ? `<div class="p-3 rounded mb-3" style="background:#fff3cd; border-left:4px solid #ffc107;">
                 <strong style="font-size:0.85rem;"><i class="fas fa-comment-alt me-1"></i>Catatan Pembimbing (${item.pembimbing}):</strong>
                 <div style="font-size:0.83rem; color:#664d03; margin-top:3px;">${item.catatan_pembimbing}</div>
               </div>`
            : '';

        var html = `
            ${catatanHtml}
            <div class="row g-2 mb-3" style="font-size:0.85rem;">
                <div class="col-6"><strong>Tanggal:</strong> ${item.tanggal}</div>
                <div class="col-6"><strong>Waktu:</strong> ${item.waktu_mulai} s/d ${item.waktu_selesai} WIB</div>
                <div class="col-6"><strong>Pembimbing:</strong> ${item.pembimbing}</div>
                <div class="col-6"><strong>Status:</strong> ${badgeStatus}</div>
            </div>

            <div class="mb-3">
                <label class="fw-bold small text-muted">Deskripsi Kegiatan:</label>
                <div class="p-2 rounded" style="background:var(--bg-light); font-size:0.85rem; line-height:1.5;">
                    ${item.deskripsi_kegiatan}
                </div>
            </div>

            <div class="mb-3">
                <label class="fw-bold small text-muted">Hasil / Output Kegiatan:</label>
                <div class="p-2 rounded" style="background:var(--bg-light); font-size:0.85rem; line-height:1.5;">
                    ${item.hasil_kegiatan}
                </div>
            </div>

            <div>
                <label class="fw-bold small text-muted">Dokumen Lampiran Bukti:</label>
                ${lampiranHtml}
            </div>
        `;

        $('#contentDetailLogbook').html(html);
        var modalEl = document.getElementById('modalDetailLogbook');
        if (modalEl) {
            var modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
        }
    });

    // Preview Lampiran Foto
    $(document).on('click', '.btn-preview-lampiran', function() {
        var src = $(this).data('src');
        Swal.fire({
            title: 'Bukti Kegiatan',
            imageUrl: src,
            imageWidth: 450,
            imageAlt: 'Bukti Kegiatan',
            confirmButtonColor: '#334EAC',
            confirmButtonText: 'Tutup'
        });
    });

    // Hapus Logbook
    $(document).on('click', '.btn-hapus-logbook', function() {
        var id = $(this).data('id');
        var item = dataLogbook.find(l => l.id == id);
        if (!item) return;

        Swal.fire({
            title: 'Hapus Logbook?',
            text: 'Catatan kegiatan tanggal ' + item.tanggal + ' akan dihapus.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        }).then(function(result) {
            if (result.isConfirmed) {
                dataLogbook = dataLogbook.filter(l => l.id != id);
                renderTable();
                Swal.fire({
                    icon: 'success',
                    title: 'Dihapus!',
                    text: 'Logbook berhasil dihapus.',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        });
    });

});
