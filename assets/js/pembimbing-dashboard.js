/* pembimbing-dashboard.js
   Dashboard monitoring dan antrean persetujuan pembimbing lapangan
 */

$(document).ready(function() {

    var context = window.pembimbingDemoData.getContext();
    var antreanVerifikasi = [];
    var antreanAbsensi = context.absensi.filter(function(item) {
        return item.statusVerif === 'Menunggu';
    }).map(function(item) {
        return {
            id: 'absensi-' + item.id,
            dataId: item.id,
            nama: item.nama,
            instansi: item.instansi,
            jenis: 'Absensi',
            badgeJenis: 'bg-primary',
            tanggal: item.tanggal,
            jam: item.jamMasuk,
            keterangan: 'Status kehadiran: ' + item.status
        };
    });
    var antreanLogbook = context.logbook.filter(function(item) {
        return item.status === 'Menunggu';
    }).map(function(item) {
        return {
            id: 'logbook-' + item.id,
            dataId: item.id,
            nama: item.nama,
            instansi: item.instansi,
            jenis: 'Logbook',
            badgeJenis: 'bg-info text-dark',
            tanggal: item.tanggal,
            jam: item.jamMulai + ' WIB',
            keterangan: item.kegiatan
        };
    });
    antreanVerifikasi = antreanAbsensi.concat(antreanLogbook);
    var anakBimbingan = context.peserta;

    $('#countAnakBimbingan').text(anakBimbingan.length);
    $('#userName').text(context.pembimbing.nama);
    $('#userRole').text(context.unit.nama);
    $('#userInitial').text(context.pembimbing.nama.charAt(0).toUpperCase());
    $('#unitDashboard').text(context.unit.nama);
    $('#emptyAnakBimbingan').toggle(anakBimbingan.length === 0);
    $('#listAnakBimbingan').html(anakBimbingan.map(function(peserta) {
        return '<li class="list-group-item px-0 small"><i class="fas fa-user-graduate me-2 text-primary"></i>' +
            peserta.nama + '<div class="text-muted ms-4">' + context.unit.nama + '</div></li>';
    }).join(''));
    $('#countPendingIzin').text(context.izin.filter(function(item) {
        return item.status === 'Menunggu';
    }).length);

    // Render tabel verifikasi
    function renderTabelVerifikasi() {
        var tbody = $('#tabelMenungguVerifikasi tbody');
        tbody.empty();

        if (antreanVerifikasi.length === 0) {
            tbody.append('<tr><td colspan="5" class="text-center py-4 text-muted"><i class="fas fa-check-double text-success fa-2x mb-2 d-block"></i>Semua berkas bimbingan telah diverifikasi!</td></tr>');
            $('#countPendingAbsen').text('0');
            $('#countPendingLogbook').text('0');
            return;
        }

        var countAbsen = 0;
        var countLog = 0;

        antreanVerifikasi.forEach(function(item) {
            if (item.jenis === 'Absensi') countAbsen++;
            if (item.jenis === 'Logbook') countLog++;

            var tr = `
                <tr id="row-verif-${item.id}">
                    <td>
                        <div class="fw-semibold text-dark">${item.nama}</div>
                        <small class="text-muted">${item.instansi}</small>
                    </td>
                    <td>
                        <span class="badge ${item.badgeJenis}">${item.jenis}</span>
                    </td>
                    <td>
                        <div>${item.tanggal}</div>
                        <small class="text-muted">${item.jam}</small>
                    </td>
                    <td>
                        <span class="badge badge-pending">Pending</span>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button type="button" class="btn btn-outline-success btn-approve-dash" data-id="${item.id}" title="Setujui / Paraf Cepat">
                                <i class="fas fa-check"></i>
                            </button>
                            <button type="button" class="btn btn-outline-danger btn-reject-dash" data-id="${item.id}" title="Tolak / Minta Revisi">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.append(tr);
        });

        $('#countPendingAbsen').text(countAbsen);
        $('#countPendingLogbook').text(countLog);
    }

    renderTabelVerifikasi();

    // Event Handler: Klik Tombol Centang (Approve)
    $(document).on('click', '.btn-approve-dash', function() {
        var id = $(this).data('id');
        var item = antreanVerifikasi.find(x => x.id === id);
        if (!item) return;

        Swal.fire({
            title: 'Verifikasi & Paraf?',
            html: `Apakah Anda yakin ingin menyetujui <b>${item.jenis}</b> atas nama <b>${item.nama}</b>?<br><small class="text-muted">${item.keterangan}</small>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="fas fa-check me-1"></i> Ya, Setujui',
            cancelButtonText: 'Batal'
        }).then(function(result) {
            if (result.isConfirmed) {
                // Hapus dari list antrean
                antreanVerifikasi = antreanVerifikasi.filter(x => x.id !== id);
                renderTabelVerifikasi();

                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil Diverifikasi!',
                    text: `${item.jenis} atas nama ${item.nama} telah disetujui & diparaf digital.`,
                    timer: 1800,
                    showConfirmButton: false
                });
            }
        });
    });

    // Event Handler: Klik Tombol Silang (Reject)
    $(document).on('click', '.btn-reject-dash', function() {
        var id = $(this).data('id');
        var item = antreanVerifikasi.find(x => x.id === id);
        if (!item) return;

        Swal.fire({
            title: 'Tolak Verifikasi?',
            html: `Masukkan catatan penolakan / instruksi revisi untuk <b>${item.nama}</b>:`,
            input: 'textarea',
            inputPlaceholder: 'Contoh: Titik presensi tidak jelas / foto kegiatan logbook kurang spesifik...',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="fas fa-times me-1"></i> Tolak',
            cancelButtonText: 'Batal',
            inputValidator: (value) => {
                if (!value || value.trim() === '') {
                    return 'Alasan penolakan / revisi wajib diisi!';
                }
            }
        }).then(function(result) {
            if (result.isConfirmed) {
                var alasan = result.value;
                // Hapus dari list antrean
                antreanVerifikasi = antreanVerifikasi.filter(x => x.id !== id);
                renderTabelVerifikasi();

                Swal.fire({
                    icon: 'info',
                    title: 'Verifikasi Ditolak',
                    html: `${item.jenis} berhasil ditolak dengan catatan: <br><i>"${alasan}"</i>`,
                    timer: 2200,
                    showConfirmButton: false
                });
            }
        });
    });
});
