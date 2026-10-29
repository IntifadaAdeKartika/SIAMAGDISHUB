/* pembimbing-absensi.js
   Modul Verifikasi Presensi & Paraf Digital Pembimbing Lapangan
 */

$(document).ready(function() {

    var context = window.pembimbingDemoData.getContext();
    var dataAbsensiBimbingan = context.absensi.map(function(item) {
        return {
            id: item.id,
            nim: item.nim,
            nama_peserta: item.nama,
            instansi: item.instansi,
            tanggal: item.tanggal,
            jam_masuk: item.jamMasuk,
            jam_pulang: item.jamPulang,
            foto_masuk: item.foto,
            jarak_meter: item.jarak,
            status_hadir: item.status,
            status_verif: item.statusVerif.toLowerCase() === 'menunggu' ? 'menunggu' :
                item.statusVerif.toLowerCase() === 'ditolak' ? 'ditolak' : 'diverifikasi',
            paraf_oleh: item.statusVerif === 'Diverifikasi' ? context.pembimbing.nama : '',
            waktu_paraf: '',
            catatan: item.statusVerif === 'Menunggu' ? '' : '-'
        };
    });

    $('#userName').text(context.pembimbing.nama);
    $('#userRole').text(context.unit.nama);
    $('#userInitial').text(context.pembimbing.nama.charAt(0).toUpperCase());
    $('#filterPeserta').append(context.peserta.map(function(peserta) {
        return new Option(peserta.nama, peserta.nama);
    }));
    $('.stat-card').filter(function() {
        return $(this).find('p').text().trim() === 'Anak Bimbingan';
    }).find('h3').text(context.peserta.length + ' Org');

    // Inisialisasi DataTable
    var table = $('#tabelVerifAbsensi').DataTable({
        language: {
            search: "Cari Data:",
            lengthMenu: "Tampilkan _MENU_ data",
            zeroRecords: "Data presensi bimbingan tidak ditemukan",
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
        order: [[2, 'desc']],
        columnDefs: [
            { orderable: false, targets: [4, 8] }
        ]
    });

    function updateStats() {
        var pending = dataAbsensiBimbingan.filter(a => a.status_verif === 'menunggu').length;
        var diparaf = dataAbsensiBimbingan.filter(a => a.status_verif === 'diverifikasi').length;
        var ditolak = dataAbsensiBimbingan.filter(a => a.status_verif === 'ditolak').length;

        $('#statPendingAbsen').text(pending);
        $('#statDiparaf').text(diparaf);
        $('#statDitolakAbsen').text(ditolak);
    }

    function renderTable() {
        table.clear();
        dataAbsensiBimbingan.forEach(function(item, idx) {
            var colPeserta = `
                <div>
                    <strong style="color:var(--primary-dark);">${item.nama_peserta}</strong>
                    <div style="font-size:0.75rem; color:#777;">${item.instansi}</div>
                </div>
            `;

            var colWaktu = `
                <div style="font-size:0.83rem;">
                    Masuk: <strong>${item.jam_masuk}</strong><br>
                    Pulang: <strong>${item.jam_pulang}</strong>
                </div>
            `;

            var colFoto = `
                <span class="badge bg-light text-secondary border">
                    <i class="fas fa-camera text-primary me-1"></i>${item.foto_masuk}
                </span>
            `;

            var colJarak = item.jarak_meter <= 100
                ? `<span class="badge bg-light text-success border"><i class="fas fa-check-circle me-1"></i>${item.jarak_meter} m (Valid)</span>`
                : `<span class="badge bg-light text-danger border"><i class="fas fa-exclamation-triangle me-1"></i>${item.jarak_meter} m (Luar)</span>`;

            var colStatusHadir = item.status_hadir === 'Hadir'
                ? '<span class="badge badge-approved">Hadir</span>'
                : '<span class="badge badge-pending">Terlambat</span>';

            var colVerif = '';
            if (item.status_verif === 'diverifikasi') {
                colVerif = `<div class="paraf-badge"><i class="fas fa-signature"></i> Diparaf (${item.paraf_oleh})</div>`;
            } else if (item.status_verif === 'menunggu') {
                colVerif = `<span class="badge badge-pending"><i class="fas fa-clock me-1"></i>Menunggu</span>`;
            } else {
                colVerif = `<span class="badge badge-rejected"><i class="fas fa-times-circle me-1"></i>Ditolak</span>`;
            }

            var colAksi = `
                <div class="action-buttons text-center">
                    <button class="btn btn-sm btn-outline-primary btn-aksi btn-detail-absen" data-id="${item.id}" title="Periksa Detail">
                        <i class="fas fa-eye me-1"></i> Detail
                    </button>
                    ${item.status_verif === 'menunggu' ? `
                        <button class="btn btn-sm btn-outline-success btn-aksi btn-paraf-langsung" data-id="${item.id}" title="Beri Paraf">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-aksi btn-tolak-langsung" data-id="${item.id}" title="Tolak">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            `;

            table.row.add([
                idx + 1,
                colPeserta,
                item.tanggal,
                colWaktu,
                colFoto,
                colJarak,
                colStatusHadir,
                colVerif,
                colAksi
            ]);
        });
        table.draw();
        updateStats();
    }

    renderTable();

    // Filter Peserta
    $('#filterPeserta').on('change', function() {
        var val = $(this).val();
        table.column(1).search(val).draw();
    });

    // Filter Status Verif
    $('#filterStatusVerif').on('change', function() {
        var val = $(this).val();
        table.column(7).search(val).draw();
    });

    // Reset Filter
    $('#btnResetFilter').on('click', function() {
        $('#filterPeserta').val('');
        $('#filterStatusVerif').val('');
        table.search('').columns().search('').draw();
    });

    // Refresh Table
    $('#btnReloadTable').on('click', function() {
        renderTable();
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Data presensi diperbarui',
            showConfirmButton: false,
            timer: 1500
        });
    });

    // Preview Foto Selfie
    $(document).on('click', '.btn-lihat-foto', function() {
        var src = $(this).data('src');
        Swal.fire({
            title: 'Foto Selfie Presensi',
            imageUrl: src,
            imageWidth: 320,
            imageHeight: 320,
            imageAlt: 'Foto Selfie',
            confirmButtonColor: '#334EAC',
            confirmButtonText: 'Tutup'
        });
    });

    // Tombol Beri Paraf Langsung
    $(document).on('click', '.btn-paraf-langsung', function() {
        var id = $(this).data('id');
        var item = dataAbsensiBimbingan.find(a => a.id == id);
        if (!item) return;

        Swal.fire({
            title: 'Verifikasi & Beri Paraf?',
            html: `Setujui kehadiran <strong>${item.nama_peserta}</strong> pada tanggal <strong>${item.tanggal}</strong>?<br><br>
                   <div class="p-2 border rounded bg-light" style="font-size:0.83rem;">
                     <i class="fas fa-signature text-success me-1"></i>Paraf Digital: <strong>${context.pembimbing.nama}</strong><br>
                     <small class="text-muted">${context.unit.nama} Dinas Perhubungan Ponorogo</small>
                   </div>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="fas fa-check me-1"></i> Ya, Berikan Paraf',
            cancelButtonText: 'Batal'
        }).then(function(result) {
            if (result.isConfirmed) {
                var now = new Date().toISOString().replace('T', ' ').substring(0, 16);
                item.status_verif = "diverifikasi";
                item.paraf_oleh = context.pembimbing.nama;
                item.waktu_paraf = now;
                renderTable();

                Swal.fire({
                    icon: 'success',
                    title: 'Paraf Berhasil Diberikan!',
                    text: 'Absensi telah diverifikasi secara resmi.',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        });
    });

    // Tombol Tolak Absensi
    $(document).on('click', '.btn-tolak-langsung', function() {
        var id = $(this).data('id');
        var item = dataAbsensiBimbingan.find(a => a.id == id);
        if (!item) return;

        Swal.fire({
            title: 'Tolak Presensi?',
            html: `Alasan penolakan presensi <strong>${item.nama_peserta}</strong>:`,
            input: 'textarea',
            inputPlaceholder: 'Tuliskan alasan penolakan (misal: foto tidak sesuai / lokasi jauh dari kantor)...',
            inputAttributes: { 'aria-label': 'Alasan penolakan' },
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Tolak Presensi',
            cancelButtonText: 'Batal',
            preConfirm: (alasan) => {
                if (!alasan || !alasan.trim()) {
                    Swal.showValidationMessage('Alasan penolakan wajib diisi!');
                }
                return alasan;
            }
        }).then(function(result) {
            if (result.isConfirmed) {
                item.status_verif = "ditolak";
                item.catatan = result.value;
                renderTable();

                Swal.fire({
                    icon: 'warning',
                    title: 'Presensi Ditolak',
                    text: 'Catatan penolakan telah dikirimkan ke peserta.',
                    confirmButtonColor: '#334EAC'
                });
            }
        });
    });

    // Modal Detail Presensi
    var currentDetailId = null;
    $(document).on('click', '.btn-detail-absen', function() {
        var id = $(this).data('id');
        var item = dataAbsensiBimbingan.find(a => a.id == id);
        if (!item) return;

        currentDetailId = id;

        var html = `
            <div class="text-center mb-3">
                <div class="mx-auto d-flex align-items-center justify-content-center bg-light border rounded mb-2" style="width:110px; height:110px;">
                    <div class="text-center">
                        <i class="fas fa-camera text-primary fa-2x mb-1"></i>
                        <div style="font-size:0.7rem;" class="text-muted">${item.foto_masuk}</div>
                    </div>
                </div>
                <h6 class="fw-bold mb-0 text-dark">${item.nama_peserta}</h6>
                <small class="text-muted">${item.instansi}</small>
            </div>
            <div class="modal-detail-wrapper text-start">
                <table class="table table-sm table-striped align-middle mb-0" style="font-size:0.875rem;">
                    <tbody>
                        <tr>
                            <td class="text-muted py-2" style="width:40%;"><i class="fas fa-calendar-alt me-2 text-primary" style="width:16px;"></i>Tanggal</td>
                            <td class="text-center text-muted py-2" style="width:5%;">:</td>
                            <td class="fw-semibold text-dark py-2">${item.tanggal}</td>
                        </tr>
                        <tr>
                            <td class="text-muted py-2"><i class="fas fa-sign-in-alt me-2 text-success" style="width:16px;"></i>Waktu Masuk</td>
                            <td class="text-center text-muted py-2">:</td>
                            <td class="fw-semibold text-dark py-2">${item.jam_masuk} WIB</td>
                        </tr>
                        <tr>
                            <td class="text-muted py-2"><i class="fas fa-sign-out-alt me-2 text-danger" style="width:16px;"></i>Waktu Pulang</td>
                            <td class="text-center text-muted py-2">:</td>
                            <td class="fw-semibold text-dark py-2">${item.jam_pulang} WIB</td>
                        </tr>
                        <tr>
                            <td class="text-muted py-2"><i class="fas fa-map-marker-alt me-2 text-danger" style="width:16px;"></i>Lokasi Kantor</td>
                            <td class="text-center text-muted py-2">:</td>
                            <td class="fw-semibold text-primary py-2">Kantor Sekretariat Dishub (Jl. Diponegoro No. 14)</td>
                        </tr>
                        <tr>
                            <td class="text-muted py-2"><i class="fas fa-crosshairs me-2 text-success" style="width:16px;"></i>Jarak GPS</td>
                            <td class="text-center text-muted py-2">:</td>
                            <td class="fw-semibold text-dark py-2">${item.jarak_meter} Meter dari titik kantor</td>
                        </tr>
                        <tr>
                            <td class="text-muted py-2"><i class="fas fa-info-circle me-2 text-info" style="width:16px;"></i>Status Verifikasi</td>
                            <td class="text-center text-muted py-2">:</td>
                            <td class="py-2"><span class="badge ${item.status_verif === 'diverifikasi' ? 'badge-approved' : (item.status_verif === 'menunggu' ? 'badge-pending' : 'badge-rejected')}">${item.status_verif}</span></td>
                        </tr>
                        ${item.paraf_oleh ? `<tr><td class="text-muted py-2"><i class="fas fa-signature me-2 text-primary" style="width:16px;"></i>Paraf Pembimbing</td><td class="text-center text-muted py-2">:</td><td class="py-2"><strong class="text-success">${item.paraf_oleh}</strong> (${item.waktu_paraf})</td></tr>` : ''}
                        ${item.catatan && item.catatan !== '-' ? `<tr><td class="text-muted py-2"><i class="fas fa-comment me-2 text-danger" style="width:16px;"></i>Catatan</td><td class="text-center text-muted py-2">:</td><td class="py-2"><em class="text-danger">${item.catatan}</em></td></tr>` : ''}
                    </tbody>
                </table>
            </div>
        `;

        $('#contentModalVerif').html(html);

        if (item.status_verif === 'menunggu') {
            $('#btnParafDariModal').show();
            $('#btnTolakDariModal').show();
        } else {
            $('#btnParafDariModal').hide();
            $('#btnTolakDariModal').hide();
        }

        var modalEl = document.getElementById('modalVerifAbsen');
        if (modalEl) {
            var modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
        }
    });

    $('#btnParafDariModal').on('click', function() {
        var modalEl = document.getElementById('modalVerifAbsen');
        if (modalEl) {
            var modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }
        $('.btn-paraf-langsung[data-id="' + currentDetailId + '"]').trigger('click');
    });

    $('#btnTolakDariModal').on('click', function() {
        var modalEl = document.getElementById('modalVerifAbsen');
        if (modalEl) {
            var modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }
        $('.btn-tolak-langsung[data-id="' + currentDetailId + '"]').trigger('click');
    });

    // Verifikasi Semua yang Valid
    $('#btnVerifikasiSemua').on('click', function() {
        var waitingValid = dataAbsensiBimbingan.filter(a => a.status_verif === 'menunggu' && a.jarak_meter <= 100);

        if (waitingValid.length === 0) {
            Swal.fire('Info', 'Tidak ada presensi valid dalam radius kantor yang menunggu paraf.', 'info');
            return;
        }

        Swal.fire({
            title: 'Paraf Semua Presensi Valid?',
            html: `Terdapat <strong>${waitingValid.length} presensi</strong> dalam radius kantor (&le; 100m) yang menunggu paraf Anda.<br><br>Setujui dan beri paraf digital sekaligus?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Ya, Paraf Semua',
            cancelButtonText: 'Batal'
        }).then(function(result) {
            if (result.isConfirmed) {
                var now = new Date().toISOString().replace('T', ' ').substring(0, 16);
                waitingValid.forEach(function(item) {
                    item.status_verif = "diverifikasi";
                    item.paraf_oleh = context.pembimbing.nama;
                    item.waktu_paraf = now;
                });
                renderTable();

                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    text: waitingValid.length + ' presensi telah berhasil diparaf.',
                    confirmButtonColor: '#334EAC'
                });
            }
        });
    });

});
