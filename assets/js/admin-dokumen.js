/**
 * admin-dokumen.js
 * Modul Monitoring Surat Magang Seluruh Dinas (Admin)
 * Role: Monitoring Only (Melihat rekap dan status surat)
 */

$(document).ready(function() {

    // Populate dropdown Filter Unit Kerja
    $('#filterUnit option').not(':first').remove();
    window.masterUnitKerja.forEach(function(unit) {
        $('#filterUnit').append(new Option(unit.nama + ' (' + unit.kode + ')', unit.nama));
    });

    // Inisialisasi DataTable
    var table = $('#tabelMonitoringDokumen').DataTable({
        language: {
            search: "Cari Peserta / Unit:",
            lengthMenu: "Tampilkan _MENU_ data",
            zeroRecords: "Data berkas peserta magang tidak ditemukan",
            info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ berkas peserta",
            infoEmpty: "Menampilkan 0 data",
            paginate: {
                first: "Awal",
                last: "Akhir",
                next: "Berikutnya",
                previous: "Sebelumnya"
            }
        },
        pageLength: 10,
        columnDefs: [
            { orderable: false, targets: [4, 5] }
        ]
    });

    function updateStatistik() {
        var total = window.masterPeserta.length;
        var permohonanCount = 0;
        var balasanCount = 0;
        var lengkapCount = 0;

        window.masterPeserta.forEach(function(p) {
            var docs = window.getDokumenPesertaById(p.id);
            var isP = docs.surat_permohonan && docs.surat_permohonan.status === 'sudah_upload';
            var isB = docs.surat_balasan && docs.surat_balasan.status === 'diterbitkan';

            if (isP) permohonanCount++;
            if (isB) balasanCount++;
            if (isP && isB) lengkapCount++;
        });

        $('#statTotalPeserta').text(total);
        $('#statPermohonanLengkap').text(permohonanCount);
        $('#statBalasanDiterbitkan').text(balasanCount);
        $('#statBerkasLengkap').text(lengkapCount);
    }

    function renderTable() {
        table.clear();
        window.masterPeserta.forEach(function(item, idx) {
            var penempatan = window.getMasterPenempatanPeserta(item.id);
            var docs = window.getDokumenPesertaById(item.id);
            var permohonan = docs.surat_permohonan;
            var balasan = docs.surat_balasan;

            var isSiswa = item.jenis_peserta === 'siswa' || /^(SMK|SMA)/i.test(item.instansi);
            var badgeJenis = isSiswa
                ? '<span class="badge" style="background:#e8daef; color:#8e44ad; font-size:0.7rem;">Siswa</span>'
                : '<span class="badge" style="background:#dbeafe; color:#2563eb; font-size:0.7rem;">Mahasiswa</span>';

            var colPeserta = `
                <div>
                    <strong style="color:var(--primary-dark);">${item.nama}</strong>
                    <div style="font-size:0.76rem; color:#777;">
                        <i class="fas fa-id-badge me-1"></i>${item.nim} &bull; ${badgeJenis}
                    </div>
                </div>
            `;

            var colAsal = `
                <div>
                    <div style="font-size:0.84rem; font-weight:600; color:var(--primary-dark);">${item.instansi}</div>
                    <div style="font-size:0.75rem; color:#666;">${item.prodi_jurusan || 'Teknik'}</div>
                    <div style="font-size:0.74rem; color:#0d6efd; margin-top:2px;">
                        <i class="fas fa-chalkboard-teacher me-1"></i>${item.dosen_guru_pembimbing || '-'}
                    </div>
                </div>
            `;

            var colPenempatan = `
                <div>
                    <div style="font-size:0.83rem; font-weight:500;">${penempatan.unit.nama}</div>
                    <div style="font-size:0.75rem; color:#555;"><i class="fas fa-user-tie text-primary me-1"></i>${penempatan.namaPembimbing}</div>
                </div>
            `;

            // Status Surat Permohonan
            var colPermohonan = '';
            if (permohonan && permohonan.status === 'sudah_upload') {
                colPermohonan = `
                    <div>
                        <span class="badge badge-approved mb-1"><i class="fas fa-check me-1"></i>Sudah Upload</span>
                        <div class="small text-muted text-truncate" style="max-width:160px;" title="${permohonan.nama_file}">
                            <i class="fas fa-file-pdf text-danger me-1"></i>${permohonan.nama_file}
                        </div>
                        <div class="action-buttons mt-1">
                            <button type="button" class="btn btn-xs btn-outline-primary btn-preview-permohonan py-0 px-2" data-id="${item.id}" style="font-size:0.75rem;" title="Lihat Berkas Permohonan">
                                <i class="fas fa-eye me-1"></i>Lihat
                            </button>
                        </div>
                    </div>
                `;
            } else {
                colPermohonan = '<span class="badge badge-pending"><i class="fas fa-clock me-1"></i>Belum Diunggah</span>';
            }

            // Status Surat Balasan Dinas
            var colBalasan = '';
            if (balasan && balasan.status === 'diterbitkan') {
                colBalasan = `
                    <div>
                        <span class="badge badge-approved mb-1"><i class="fas fa-check-circle me-1"></i>Diterbitkan</span>
                        <div class="small text-muted text-truncate" style="max-width:160px;" title="${balasan.nama_file}">
                            <i class="fas fa-file-pdf text-success me-1"></i>${balasan.nama_file}
                        </div>
                        <div class="small text-dark" style="font-size:0.7rem;">${balasan.nomor_surat || '-'}</div>
                        <div class="action-buttons mt-1">
                            <button type="button" class="btn btn-xs btn-outline-success btn-preview-balasan py-0 px-2" data-id="${item.id}" style="font-size:0.75rem;" title="Lihat Berkas Balasan">
                                <i class="fas fa-eye me-1"></i>Lihat
                            </button>
                        </div>
                    </div>
                `;
            } else {
                colBalasan = '<span class="badge badge-pending"><i class="fas fa-clock me-1"></i>Menunggu Pembimbing</span>';
            }

            table.row.add([
                idx + 1,
                colPeserta,
                colAsal,
                colPenempatan,
                colPermohonan,
                colBalasan
            ]);
        });
        table.draw();
        updateStatistik();
    }

    renderTable();

    // Preview Permohonan
    $(document).on('click', '.btn-preview-permohonan', function() {
        var id = $(this).data('id');
        var item = window.masterPeserta.find(p => p.id == id);
        var docs = window.getDokumenPesertaById(id);
        if (item && docs.surat_permohonan) {
            window.previewDokumenSweetAlert('permohonan', docs.surat_permohonan, item.nama, { allowDownload: false });
        }
    });

    // Preview Balasan
    $(document).on('click', '.btn-preview-balasan', function() {
        var id = $(this).data('id');
        var item = window.masterPeserta.find(p => p.id == id);
        var docs = window.getDokumenPesertaById(id);
        if (item && docs.surat_balasan) {
            window.previewDokumenSweetAlert('balasan', docs.surat_balasan, item.nama, { allowDownload: false });
        }
    });

    // Filter Unit
    $('#filterUnit').on('change', function() {
        var val = $(this).val();
        table.column(3).search(val).draw();
    });

    // Filter Status Kelengkapan
    $('#filterStatus').on('change', function() {
        var val = $(this).val();
        if (val === 'Lengkap') {
            table.column(5).search('Diterbitkan').draw();
        } else if (val === 'Menunggu Balasan') {
            table.column(5).search('Menunggu Pembimbing').draw();
        } else if (val === 'Belum Upload') {
            table.column(4).search('Belum Diunggah').draw();
        } else {
            table.column(4).search('').column(5).search('').draw();
        }
    });

    // Reset Filter
    $('#btnResetFilter').on('click', function() {
        $('#filterUnit').val('');
        $('#filterStatus').val('');
        table.search('').columns().search('').draw();
    });

    // Reload
    $('#btnReloadTable').on('click', function() {
        renderTable();
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Data monitoring dokumen berhasil diperbarui',
            showConfirmButton: false,
            timer: 1200
        });
    });

});
