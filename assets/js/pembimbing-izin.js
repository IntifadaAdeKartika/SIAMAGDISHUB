/* pembimbing-izin.js
   Modul Persetujuan Permohonan Izin & Sakit Pembimbing Lapangan
 */

$(document).ready(function() {

    var context = window.pembimbingDemoData.getContext();
    var dataIzinBimbingan = context.izin.map(function(item) {
        return {
            id: item.id,
            nim: item.nim,
            nama_peserta: item.nama,
            instansi: item.instansi,
            jenis: item.jenis.toLowerCase(),
            tanggal_mulai: item.tglMulai,
            tanggal_selesai: item.tglSelesai,
            durasi: item.durasi,
            alasan: item.alasan,
            file_surat: item.fileSurat,
            status: item.status.toLowerCase() === 'menunggu' ? 'menunggu' :
                item.status.toLowerCase() === 'ditolak' ? 'ditolak' : 'disetujui',
            disetujui_oleh: item.disetujuiOleh || '',
            catatan: item.catatan || ''
        };
    });

    $('#userName').text(context.pembimbing.nama);
    $('#userRole').text(context.unit.nama);
    $('#userInitial').text(context.pembimbing.nama.charAt(0).toUpperCase());
    $('#filterPesertaIzin').append(context.peserta.map(function(peserta) {
        return new Option(peserta.nama, peserta.nama);
    }));

    // Inisialisasi DataTable
    var table = $('#tabelApproveIzin').DataTable({
        language: {
            search: "Cari Permohonan:",
            lengthMenu: "Tampilkan _MENU_ data",
            zeroRecords: "Data permohonan izin tidak ditemukan",
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
        order: [[3, 'desc']],
        columnDefs: [
            { orderable: false, targets: [6, 8] }
        ]
    });

    function updateStats() {
        var total = dataIzinBimbingan.length;
        var pending = dataIzinBimbingan.filter(i => i.status === 'menunggu').length;
        var approved = dataIzinBimbingan.filter(i => i.status === 'disetujui').length;
        var rejected = dataIzinBimbingan.filter(i => i.status === 'ditolak').length;

        $('#statTotalIzinBimbingan').text(total);
        $('#statPendingIzin').text(pending);
        $('#statApprovedIzin').text(approved);
        $('#statRejectedIzin').text(rejected);
    }

    function renderTable() {
        table.clear();
        dataIzinBimbingan.forEach(function(item, idx) {
            var colPeserta = `
                <div>
                    <strong style="color:var(--primary-dark);">${item.nama_peserta}</strong>
                    <div style="font-size:0.75rem; color:#777;">${item.instansi}</div>
                </div>
            `;

            var badgeJenis = item.jenis === 'sakit'
                ? '<span class="badge" style="background:#fce4ec; color:#c62828;"><i class="fas fa-notes-medical me-1"></i>Sakit</span>'
                : '<span class="badge" style="background:#e0f2fe; color:#0369a1;"><i class="fas fa-calendar-times me-1"></i>Izin</span>';

            var colPeriode = `
                <div style="font-size:0.83rem;">
                    <strong>${item.tanggal_mulai}</strong>
                    ${item.tanggal_mulai !== item.tanggal_selesai ? '<br><small class="text-muted">s/d ' + item.tanggal_selesai + '</small>' : ''}
                </div>
            `;

            var colDurasi = `<span class="badge bg-light text-dark border">${item.durasi} Hari</span>`;

            var colAlasan = `
                <div style="font-size:0.83rem; line-height:1.4; max-width:240px;">
                    ${item.alasan}
                </div>
            `;

            var colSurat = item.file_surat
                ? `<span class="badge bg-light text-secondary border">
                     <i class="fas fa-file-pdf text-danger me-1"></i>${item.file_surat}
                   </span>`
                : `<span class="text-muted small"><em>-</em></span>`;

            var badgeStatus = '';
            if (item.status === 'disetujui') {
                badgeStatus = `<span class="badge badge-approved"><i class="fas fa-check-circle me-1"></i>Disetujui</span>`;
            } else if (item.status === 'menunggu') {
                badgeStatus = `<span class="badge badge-pending"><i class="fas fa-clock me-1"></i>Menunggu</span>`;
            } else {
                badgeStatus = `<span class="badge badge-rejected"><i class="fas fa-times-circle me-1"></i>Ditolak</span>`;
            }

            var colAksi = `
                <div class="action-buttons text-center">
                    <button class="btn btn-sm btn-outline-primary btn-aksi btn-detail-izin" data-id="${item.id}" title="Periksa Detail">
                        <i class="fas fa-eye me-1"></i> Detail
                    </button>
                    ${item.status === 'menunggu' ? `
                        <button class="btn btn-sm btn-outline-success btn-aksi btn-approve-izin" data-id="${item.id}" title="Setujui">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-aksi btn-reject-izin" data-id="${item.id}" title="Tolak">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            `;

            table.row.add([
                idx + 1,
                colPeserta,
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

    // Filter Peserta
    $('#filterPesertaIzin').on('change', function() {
        var val = $(this).val();
        table.column(1).search(val).draw();
    });

    // Filter Status
    $('#filterStatusIzin').on('change', function() {
        var val = $(this).val();
        table.column(7).search(val).draw();
    });

    // Reset Filter
    $('#btnResetFilterIzin').on('click', function() {
        $('#filterPesertaIzin').val('');
        $('#filterStatusIzin').val('');
        table.search('').columns().search('').draw();
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

    // Preview Surat Lampiran
    $(document).on('click', '.btn-lihat-surat', function() {
        var src = $(this).data('src');
        Swal.fire({
            title: 'Bukti Surat Izin / Keterangan Dokter',
            imageUrl: src,
            imageWidth: 450,
            imageAlt: 'Bukti Surat',
            confirmButtonColor: '#334EAC',
            confirmButtonText: 'Tutup'
        });
    });

    // Tombol Approve
    $(document).on('click', '.btn-approve-izin', function() {
        var id = $(this).data('id');
        var item = dataIzinBimbingan.find(i => i.id == id);
        if (!item) return;

        Swal.fire({
            title: 'Setujui Permohonan Izin?',
            html: `
                Setujui permohonan <strong>${item.jenis.toUpperCase()}</strong> untuk <strong>${item.nama_peserta}</strong>?<br>
                <small class="text-muted">Periode: ${item.tanggal_mulai} (${item.durasi} Hari)</small><br><br>
                <div class="mb-2 text-start">
                    <label class="small text-muted mb-1">Catatan Persetujuan untuk Peserta:</label>
                    <input type="text" id="catatanApprove" class="form-control form-control-sm" placeholder="Contoh: Disetujui, jaga kesehatan." value="Disetujui oleh Pembimbing Lapangan.">
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="fas fa-check me-1"></i> Ya, Setujui Izin',
            cancelButtonText: 'Batal'
        }).then(function(result) {
            if (result.isConfirmed) {
                var catatan = $('#catatanApprove').val() || "Disetujui.";
                var now = new Date().toISOString().replace('T', ' ').substring(0, 16);

                item.status = "disetujui";
                item.catatan = catatan;
                item.disetujui_oleh = context.pembimbing.nama;
                item.waktu_persetujuan = now;
                renderTable();

                Swal.fire({
                    icon: 'success',
                    title: 'Permohonan Disetujui!',
                    text: 'Status kehadiran peserta telah diperbarui menjadi ' + item.jenis.toUpperCase(),
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        });
    });

    // Tombol Reject
    $(document).on('click', '.btn-reject-izin', function() {
        var id = $(this).data('id');
        var item = dataIzinBimbingan.find(i => i.id == id);
        if (!item) return;

        Swal.fire({
            title: 'Tolak Permohonan Izin?',
            html: `Alasan penolakan permohonan untuk <strong>${item.nama_peserta}</strong>:`,
            input: 'textarea',
            inputPlaceholder: 'Tuliskan alasan penolakan (misal: surat bukti tidak valid / jadwal dinas mendesak)...',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Tolak Permohonan',
            cancelButtonText: 'Batal',
            preConfirm: (alasan) => {
                if (!alasan || !alasan.trim()) {
                    Swal.showValidationMessage('Alasan penolakan wajib diisi!');
                }
                return alasan;
            }
        }).then(function(result) {
            if (result.isConfirmed) {
                item.status = "ditolak";
                item.catatan = result.value;
                renderTable();

                Swal.fire({
                    icon: 'warning',
                    title: 'Permohonan Ditolak',
                    text: 'Notifikasi penolakan telah diteruskan ke peserta magang.',
                    confirmButtonColor: '#334EAC'
                });
            }
        });
    });

    // Modal Detail
    var currentIzinId = null;
    $(document).on('click', '.btn-detail-izin', function() {
        var id = $(this).data('id');
        var item = dataIzinBimbingan.find(i => i.id == id);
        if (!item) return;

        currentIzinId = id;

        var badgeStatus = '';
        if (item.status === 'disetujui') {
            badgeStatus = `<span class="badge badge-approved"><i class="fas fa-check-circle me-1"></i>Disetujui (${item.disetujui_oleh})</span>`;
        } else if (item.status === 'menunggu') {
            badgeStatus = `<span class="badge badge-pending"><i class="fas fa-clock me-1"></i>Menunggu Keputusan</span>`;
        } else {
            badgeStatus = `<span class="badge badge-rejected"><i class="fas fa-times-circle me-1"></i>Ditolak</span>`;
        }

        var catatanHtml = item.catatan && item.catatan !== '-'
            ? `<div class="p-3 rounded mb-3" style="background:#e8f4fd; border-left:4px solid #334EAC;">
                 <strong style="font-size:0.85rem;"><i class="fas fa-comment-alt me-1"></i>Catatan Pembimbing:</strong>
                 <div style="font-size:0.83rem; color:#081F5C; margin-top:2px;">${item.catatan}</div>
               </div>`
            : '';

        var html = `
            ${catatanHtml}
            <div class="row g-2 mb-3" style="font-size:0.85rem;">
                <div class="col-6"><strong>Nama Peserta:</strong> ${item.nama_peserta}</div>
                <div class="col-6"><strong>Instansi:</strong> ${item.instansi}</div>
                <div class="col-6"><strong>Jenis:</strong> <span class="text-uppercase fw-bold">${item.jenis}</span></div>
                <div class="col-6"><strong>Durasi:</strong> ${item.durasi} Hari (${item.tanggal_mulai} s/d ${item.tanggal_selesai})</div>
                <div class="col-12"><strong>Status:</strong> ${badgeStatus}</div>
            </div>

            <div class="mb-3">
                <label class="fw-bold small text-muted">Alasan Permohonan:</label>
                <div class="p-3 rounded" style="background:var(--bg-light); font-size:0.85rem; line-height:1.5;">
                    ${item.alasan}
                </div>
            </div>

            <div class="mt-3">
                <label class="fw-bold small text-muted d-block text-start mb-2">Lampiran Bukti Surat:</label>
                <div class="p-3 border rounded bg-light text-center">
                    <i class="fas fa-file-pdf text-danger fa-2x mb-2"></i>
                    <div class="fw-semibold small">${item.file_surat}</div>
                    <small class="text-muted">Surat keterangan izin / sakit resmi</small>
                </div>
            </div>
        `;

        $('#contentModalActionIzin').html(html);

        if (item.status === 'menunggu') {
            $('#btnApproveIzinModal').show();
            $('#btnRejectIzinModal').show();
        } else {
            $('#btnApproveIzinModal').hide();
            $('#btnRejectIzinModal').hide();
        }

        var modalEl = document.getElementById('modalActionIzin');
        if (modalEl) {
            var modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
        }
    });

    $('#btnApproveIzinModal').on('click', function() {
        var modalEl = document.getElementById('modalActionIzin');
        if (modalEl) {
            var modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }
        $('.btn-approve-izin[data-id="' + currentIzinId + '"]').trigger('click');
    });

    $('#btnRejectIzinModal').on('click', function() {
        var modalEl = document.getElementById('modalActionIzin');
        if (modalEl) {
            var modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }
        $('.btn-reject-izin[data-id="' + currentIzinId + '"]').trigger('click');
    });

});
