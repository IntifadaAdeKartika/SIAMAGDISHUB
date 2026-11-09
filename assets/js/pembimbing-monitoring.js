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
    var documentObjectUrls = {};
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
            dosen_guru_pembimbing: peserta.dosen_guru_pembimbing || '-',
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

    function renderDocumentSection(peserta) {
        var suratPermohonan = peserta.file_surat_permohonan;
        var suratBalasan = peserta.file_surat_balasan;
        var statusDokumen = suratPermohonan && suratBalasan ? 'lengkap' : 'pending';
        peserta.status_dokumen = statusDokumen;

        return `
            <section class="border-top pt-3 mt-3 document-actions" data-nim="${peserta.nim}">
                <div class="d-flex justify-content-between align-items-center gap-2 mb-2">
                    <strong class="small"><i class="fas fa-folder-open me-1 text-primary"></i>Dokumen Magang</strong>
                    <span class="badge ${statusDokumen === 'lengkap' ? 'bg-success' : 'bg-secondary'}">${statusDokumen === 'lengkap' ? 'Lengkap' : 'Pending'}</span>
                </div>
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 small mb-2">
                    <span>Surat Permohonan</span>
                    ${suratPermohonan
                        ? `<button type="button" class="btn btn-outline-primary btn-sm btn-view-supervisor-doc" data-nim="${peserta.nim}" data-document="file_surat_permohonan"><i class="fas fa-download me-1"></i>Unduh Surat Permohonan</button>`
                        : '<span class="text-muted">Belum diunggah peserta</span>'}
                </div>
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 small">
                    <span>Surat Balasan</span>
                    ${suratBalasan
                        ? `<button type="button" class="btn btn-outline-primary btn-sm btn-view-supervisor-doc" data-nim="${peserta.nim}" data-document="file_surat_balasan"><i class="fas fa-download me-1"></i>Lihat/Unduh Surat Balasan</button>`
                        : `<button type="button" class="btn btn-primary btn-sm btn-upload-reply" data-nim="${peserta.nim}"><i class="fas fa-upload me-1"></i>Upload Surat Balasan</button>
                           <input type="file" class="d-none input-surat-balasan" id="fileSuratBalasan-${peserta.nim}" name="file_surat_balasan" data-nim="${peserta.nim}" accept=".pdf,.jpg,.jpeg,.png">`}
                </div>
            </section>
        `;
    }

    var cards = context.peserta.map(function(peserta) {
        var absensi = attendanceByNim[peserta.nim];
        var logbook = logbookByNim[peserta.nim];
        var attendanceStatus = absensi ? absensi.status : 'Belum Absen';
        var logbookStatus = logbook ? logbook.status : 'Belum ada logbook';
        var attendanceTime = absensi ? absensi.jamMasuk.replace(' WIB', '') : '';
        return `
            <div class="col-md-6">
                <article class="card bimbingan-card h-100">
                    <div class="card-body">
                        <div class="bimbingan-card-header">
                            <div class="bimbingan-card-identity">
                                <h6>${peserta.nama}</h6>
                                <p class="mb-1">${peserta.instansi}</p>
                                <div class="small text-primary mb-1" style="font-size:0.76rem;">
                                    <i class="fas fa-chalkboard-teacher me-1"></i>Pembimbing Asal: <strong>${peserta.dosen_guru_pembimbing || '-'}</strong>
                                </div>
                            </div>
                            <span class="bimbingan-card-nim"><i class="fas fa-id-card"></i>${peserta.nim}</span>
                        </div>
                        <div class="bimbingan-card-activity">
                            <div class="bimbingan-card-activity-row">
                                <span class="bimbingan-card-activity-label"><i class="fas fa-calendar-check"></i>Presensi</span>
                                <strong>${attendanceStatus}</strong>
                                ${attendanceTime ? `<span class="bimbingan-card-time">${attendanceTime}</span>` : ''}
                            </div>
                            <div class="bimbingan-card-activity-row">
                                <span class="bimbingan-card-activity-label"><i class="fas fa-book"></i>Logbook</span>
                                <strong>${logbookStatus}</strong>
                                <span></span>
                            </div>
                        </div>
                        ${renderDocumentSection(peserta)}
                    </div>
                </article>
            </div>
        `;
    }).join('');
    $('#cardsAnakBimbingan').html(cards);
    $('#emptyInternalMonitoring').toggle(context.peserta.length === 0);

    $(document).on('click', '.btn-upload-reply', function() {
        var nim = $(this).data('nim');
        $('#fileSuratBalasan-' + nim).trigger('click');
    });

    $(document).on('change', '.input-surat-balasan', function() {
        var file = this.files && this.files[0];
        if (!file) return;
        var nim = $(this).data('nim');
        var peserta = context.peserta.find(function(item) {
            return item.nim === String(nim);
        });
        if (!peserta) return;
        if (documentObjectUrls[nim]) {
            URL.revokeObjectURL(documentObjectUrls[nim]);
        }
        documentObjectUrls[nim] = URL.createObjectURL(file);
        peserta.file_surat_balasan = file.name;
        peserta.status_dokumen = peserta.file_surat_permohonan ? 'lengkap' : 'pending';
        $(this).closest('.document-actions').replaceWith(renderDocumentSection(peserta));
        alert('Surat balasan "' + file.name + '" berhasil dipilih. Simulasi ini belum mengunggah file ke server.');
    });

    $(document).on('click', '.btn-view-supervisor-doc', function() {
        var nim = $(this).data('nim');
        var field = $(this).data('document');
        var objectUrl = field === 'file_surat_balasan' ? documentObjectUrls[nim] : null;
        if (objectUrl) {
            window.open(objectUrl, '_blank', 'noopener');
            return;
        }
        var peserta = context.peserta.find(function(item) {
            return item.nim === String(nim);
        });
        alert('Lokasi dokumen tersimpan: ' + (peserta && peserta[field]) + '. Unduh akan tersedia setelah backend terhubung.');
    });
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

    $('#tab-lintas-tab').on('shown.bs.tab', function() {
        tableLintas.columns.adjust().draw(false);
    });

    function renderTableLintas() {
        tableLintas.clear();
        dataLintasBidang.forEach(function(item, idx) {
            var colPeserta = `
                <div>
                    <strong style="color:var(--primary-dark);">${item.nama_peserta}</strong>
                    <div style="font-size:0.75rem; color:#777;">${item.instansi}</div>
                    <div style="font-size:0.72rem; color:#0d6efd;"><i class="fas fa-chalkboard-teacher me-1"></i>${item.dosen_guru_pembimbing || '-'}</div>
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
