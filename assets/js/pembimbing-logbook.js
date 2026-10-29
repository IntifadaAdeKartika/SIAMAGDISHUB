/**
 * pembimbing-logbook.js
 * Modul Verifikasi Logbook & Catatan Pembimbing Lapangan
 */

$(document).ready(function() {

    var context = window.pembimbingDemoData.getContext();
    var dataLogbookBimbingan = context.logbook.map(function(item) {
        return {
            id: item.id,
            nim: item.nim,
            nama_peserta: item.nama,
            instansi: item.instansi,
            tanggal: item.tanggal,
            waktu_mulai: item.jamMulai,
            waktu_selesai: item.jamSelesai,
            deskripsi: item.kegiatan,
            hasil: item.hasil,
            lampiran: item.lampiran,
            status_verif: item.status.toLowerCase() === 'menunggu' ? 'menunggu' :
                item.status.toLowerCase() === 'ditolak' ? 'ditolak' : 'diverifikasi',
            paraf_oleh: item.status === 'Diverifikasi' ? context.pembimbing.nama : '',
            catatan: item.catatan
        };
    });

    $('#userName').text(context.pembimbing.nama);
    $('#userRole').text(context.unit.nama);
    $('#userInitial').text(context.pembimbing.nama.charAt(0).toUpperCase());
    $('#filterPesertaLogbook').append(context.peserta.map(function(peserta) {
        return new Option(peserta.nama, peserta.nama);
    }));

    // Inisialisasi DataTable
    var table = $('#tabelVerifLogbook').DataTable({
        language: {
            search: "Cari Logbook:",
            lengthMenu: "Tampilkan _MENU_ data",
            zeroRecords: "Data logbook bimbingan tidak ditemukan",
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
        order: [[2, 'desc']],
        columnDefs: [
            { orderable: false, targets: [5, 7] }
        ]
    });

    function updateStats() {
        var total = dataLogbookBimbingan.length;
        var pending = dataLogbookBimbingan.filter(l => l.status_verif === 'menunggu').length;
        var diverif = dataLogbookBimbingan.filter(l => l.status_verif === 'diverifikasi').length;
        var revisi = dataLogbookBimbingan.filter(l => l.status_verif === 'ditolak').length;

        $('#statTotalLogbook').text(total);
        $('#statPendingLogbook').text(pending);
        $('#statDiverifikasiLogbook').text(diverif);
        $('#statRevisiLogbook').text(revisi);
    }

    function renderTable() {
        table.clear();
        dataLogbookBimbingan.forEach(function(item, idx) {
            var colPeserta = `
                <div>
                    <strong style="color:var(--primary-dark);">${item.nama_peserta}</strong>
                    <div style="font-size:0.75rem; color:#777;">${item.instansi}</div>
                </div>
            `;

            var colWaktu = `
                <div style="font-size:0.83rem;">
                    <strong>${item.tanggal}</strong><br>
                    <small class="text-muted"><i class="far fa-clock me-1"></i>${item.waktu_mulai} - ${item.waktu_selesai}</small>
                </div>
            `;

            var colDeskripsi = `
                <div style="font-size:0.83rem; line-height:1.4; max-width:260px;">
                    ${item.deskripsi}
                </div>
            `;

            var colHasil = `
                <div style="font-size:0.82rem; color:#444;">
                    ${item.hasil}
                </div>
            `;

            var colLampiran = item.lampiran
                ? `<span class="badge bg-light text-secondary border">
                     <i class="fas fa-file-alt text-primary me-1"></i>${item.lampiran}
                   </span>`
                : `<span class="text-muted small"><em>-</em></span>`;

            var colStatus = '';
            if (item.status_verif === 'diverifikasi') {
                colStatus = `<div class="paraf-badge"><i class="fas fa-signature"></i> Diparaf (${item.paraf_oleh})</div>`;
            } else if (item.status_verif === 'menunggu') {
                colStatus = `<span class="badge badge-pending"><i class="fas fa-clock me-1"></i>Menunggu</span>`;
            } else {
                colStatus = `<span class="badge badge-rejected"><i class="fas fa-times-circle me-1"></i>Perlu Revisi</span>`;
            }

            var colAksi = `
                <div class="action-buttons text-center">
                    <button class="btn btn-sm btn-outline-primary btn-aksi btn-detail-logbook" data-id="${item.id}" title="Periksa Detail">
                        <i class="fas fa-eye me-1"></i> Detail
                    </button>
                    ${item.status_verif === 'menunggu' ? `
                        <button class="btn btn-sm btn-outline-success btn-aksi btn-paraf-logbook" data-id="${item.id}" title="Beri Paraf">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-aksi btn-tolak-logbook" data-id="${item.id}" title="Minta Revisi">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            `;

            table.row.add([
                idx + 1,
                colPeserta,
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

    // Filter Peserta
    $('#filterPesertaLogbook').on('change', function() {
        var val = $(this).val();
        table.column(1).search(val).draw();
    });

    // Filter Status
    $('#filterStatusVerifLogbook').on('change', function() {
        var val = $(this).val();
        table.column(6).search(val).draw();
    });

    // Reset Filter
    $('#btnResetFilterLogbook').on('click', function() {
        $('#filterPesertaLogbook').val('');
        $('#filterStatusVerifLogbook').val('');
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

    // Preview Lampiran Foto
    $(document).on('click', '.btn-lihat-lampiran', function() {
        var src = $(this).data('src');
        Swal.fire({
            title: 'Dokumentasi Bukti Kegiatan',
            imageUrl: src,
            imageWidth: 450,
            imageAlt: 'Bukti Logbook',
            confirmButtonColor: '#334EAC',
            confirmButtonText: 'Tutup'
        });
    });

    // Tombol Beri Paraf Logbook
    $(document).on('click', '.btn-paraf-logbook', function() {
        var id = $(this).data('id');
        var item = dataLogbookBimbingan.find(l => l.id == id);
        if (!item) return;

        Swal.fire({
            title: 'Paraf & Verifikasi Logbook?',
            html: `
                Verifikasi laporan kegiatan <strong>${item.nama_peserta}</strong> tanggal <strong>${item.tanggal}</strong>?<br><br>
                <div class="mb-2 text-start">
                    <label class="small text-muted mb-1">Catatan Apresiasi / Pengarahan (Opsional):</label>
                    <input type="text" id="catatanParaf" class="form-control form-control-sm" placeholder="Contoh: Laporan baik dan sesuai SOP.">
                </div>
                <div class="p-2 border rounded bg-light text-start" style="font-size:0.8rem;">
                    <i class="fas fa-signature text-success me-1"></i>Paraf Digital: <strong>${context.pembimbing.nama}</strong>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="fas fa-check me-1"></i> Setujui & Beri Paraf',
            cancelButtonText: 'Batal'
        }).then(function(result) {
            if (result.isConfirmed) {
                var catatan = $('#catatanParaf').val() || "Laporan kegiatan diverifikasi.";
                var now = new Date().toISOString().replace('T', ' ').substring(0, 16);

                item.status_verif = "diverifikasi";
                item.catatan = catatan;
                item.paraf_oleh = context.pembimbing.nama;
                item.waktu_paraf = now;
                renderTable();

                Swal.fire({
                    icon: 'success',
                    title: 'Logbook Berhasil Diparaf!',
                    text: 'Tanda tangan paraf digital berhasil dibubuhkan pada logbook peserta.',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        });
    });

    // Tombol Minta Revisi Logbook
    $(document).on('click', '.btn-tolak-logbook', function() {
        var id = $(this).data('id');
        var item = dataLogbookBimbingan.find(l => l.id == id);
        if (!item) return;

        Swal.fire({
            title: 'Minta Revisi Logbook?',
            html: `Berikan catatan koreksi untuk <strong>${item.nama_peserta}</strong>:`,
            input: 'textarea',
            inputPlaceholder: 'Tuliskan bagian mana yang perlu diperbaiki / dilengkapi...',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Kirim Catatan Revisi',
            cancelButtonText: 'Batal',
            preConfirm: (catatan) => {
                if (!catatan || !catatan.trim()) {
                    Swal.showValidationMessage('Catatan revisi wajib diisi agar peserta tahu bagian yang harus diperbaiki!');
                }
                return catatan;
            }
        }).then(function(result) {
            if (result.isConfirmed) {
                item.status_verif = "ditolak";
                item.catatan = result.value;
                renderTable();

                Swal.fire({
                    icon: 'warning',
                    title: 'Permintaan Revisi Terkirim',
                    text: 'Peserta akan menerima notifikasi catatan revisi dari Anda.',
                    confirmButtonColor: '#334EAC'
                });
            }
        });
    });

    // Detail Modal Logbook
    var currentLogbookId = null;
    $(document).on('click', '.btn-detail-logbook', function() {
        var id = $(this).data('id');
        var item = dataLogbookBimbingan.find(l => l.id == id);
        if (!item) return;

        currentLogbookId = id;

        var lampiranHtml = item.lampiran 
            ? `<div class="p-3 border rounded bg-light text-center">
                 <i class="fas fa-file-pdf text-danger fa-2x mb-1"></i>
                 <div class="fw-semibold small">${item.lampiran}</div>
                 <small class="text-muted">Dokumentasi hasil kegiatan magang</small>
               </div>`
            : `<div class="text-muted small"><em>Tidak ada lampiran dokumen</em></div>`;

        var badgeStatus = '';
        if (item.status_verif === 'diverifikasi') {
            badgeStatus = `<span class="badge badge-approved"><i class="fas fa-check-circle me-1"></i>Diverifikasi & Diparaf (${item.paraf_oleh})</span>`;
        } else if (item.status_verif === 'menunggu') {
            badgeStatus = `<span class="badge badge-pending"><i class="fas fa-clock me-1"></i>Menunggu Verifikasi</span>`;
        } else {
            badgeStatus = `<span class="badge badge-rejected"><i class="fas fa-times-circle me-1"></i>Perlu Revisi</span>`;
        }

        var catatanHtml = item.catatan && item.catatan !== '-'
            ? `<div class="p-3 rounded mb-3" style="background:#fff3cd; border-left:4px solid #ffc107;">
                 <strong style="font-size:0.85rem;"><i class="fas fa-comment-dots me-1"></i>Catatan Pembimbing:</strong>
                 <div style="font-size:0.83rem; color:#664d03; margin-top:2px;">${item.catatan}</div>
               </div>`
            : '';

        var html = `
            ${catatanHtml}
            <div class="row g-2 mb-3" style="font-size:0.85rem;">
                <div class="col-6"><strong>Peserta:</strong> ${item.nama_peserta} (${item.instansi})</div>
                <div class="col-6"><strong>Tanggal:</strong> ${item.tanggal} (${item.waktu_mulai} - ${item.waktu_selesai} WIB)</div>
                <div class="col-12"><strong>Status Logbook:</strong> ${badgeStatus}</div>
            </div>

            <div class="mb-3">
                <label class="fw-bold small text-muted">Deskripsi Kegiatan:</label>
                <div class="p-3 rounded" style="background:var(--bg-light); font-size:0.85rem; line-height:1.5;">
                    ${item.deskripsi}
                </div>
            </div>

            <div class="mb-3">
                <label class="fw-bold small text-muted">Hasil / Output Pekerjaan:</label>
                <div class="p-2 rounded" style="background:var(--bg-light); font-size:0.85rem; line-height:1.5;">
                    ${item.hasil}
                </div>
            </div>

            <div>
                <label class="fw-bold small text-muted">Dokumen Lampiran Bukti:</label>
                ${lampiranHtml}
            </div>
        `;

        $('#contentModalLogbook').html(html);

        if (item.status_verif === 'menunggu') {
            $('#btnParafLogbookModal').show();
            $('#btnTolakLogbookModal').show();
        } else {
            $('#btnParafLogbookModal').hide();
            $('#btnTolakLogbookModal').hide();
        }

        var modalEl = document.getElementById('modalVerifLogbook');
        if (modalEl) {
            var modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
        }
    });

    $('#btnParafLogbookModal').on('click', function() {
        var modalEl = document.getElementById('modalVerifLogbook');
        if (modalEl) {
            var modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }
        $('.btn-paraf-logbook[data-id="' + currentLogbookId + '"]').trigger('click');
    });

    $('#btnTolakLogbookModal').on('click', function() {
        var modalEl = document.getElementById('modalVerifLogbook');
        if (modalEl) {
            var modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }
        $('.btn-tolak-logbook[data-id="' + currentLogbookId + '"]').trigger('click');
    });

});
