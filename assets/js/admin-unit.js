/* admin-unit.js
   Manajemen CRUD Unit Kerja Dinas Perhubungan Kabupaten Ponorogo
   Kode unit: SEKRET, UMPEG, KEUPROG, ANGKUT, ANGOR, ANGBAR, LLSP, PARKIR, MRLL, PJU, POLLAJ, UPT
 */

$(document).ready(function() {

    // Data unit kerja Dinas Perhubungan Kabupaten Ponorogo
    var dataUnit = window.masterUnitKerja.map(function(unit) {
        var parent = window.getMasterUnit(unit.parentId);
        var pembimbing = window.getMasterPembimbingForUnit(unit.id);
        var jumlahPeserta = window.masterPeserta.filter(function(peserta) {
            return peserta.unitId === unit.id;
        }).length;

        return {
            id: unit.id,
            kode_unit: unit.kode,
            nama_unit: unit.nama,
            tipe: unit.tipe,
            id_induk: unit.parentId,
            nama_induk: parent ? parent.nama : "Dinas Perhubungan",
            id_pembimbing: pembimbing ? pembimbing.id : null,
            nama_pembimbing: pembimbing ? pembimbing.nama : "-",
            jumlah_peserta: jumlahPeserta,
            status: "aktif"
        };
    });

    // Inisialisasi DataTable
    var table = $('#tabelUnitKerja').DataTable({
        language: {
            search: "Cari Unit Kerja:",
            lengthMenu: "Tampilkan _MENU_ data",
            zeroRecords: "Data unit kerja tidak ditemukan",
            info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ unit kerja",
            infoEmpty: "Menampilkan 0 data",
            infoFiltered: "(disaring dari _MAX_ total data)",
            paginate: {
                first: "Awal",
                last: "Akhir",
                next: "Berikutnya",
                previous: "Sebelumnya"
            }
        },
        pageLength: 12,
        order: [[0, 'asc']],
        columnDefs: [
            { orderable: false, targets: [8] }
        ]
    });

    function getBadgeTipe(tipe) {
        var map = {
            'sekretariat': '<span class="badge" style="background:#081F5C; color:#fff;">Sekretariat</span>',
            'sub_bagian': '<span class="badge" style="background:#7096D1; color:#fff;">Sub Bagian</span>',
            'bidang': '<span class="badge" style="background:#334EAC; color:#fff;">Bidang</span>',
            'seksi': '<span class="badge" style="background:#BAD6EB; color:#081F5C;">Seksi</span>',
            'upt': '<span class="badge" style="background:#e8daef; color:#8e44ad;">UPT</span>'
        };
        return map[tipe] || `<span class="badge bg-secondary">${tipe}</span>`;
    }

    function renderTable() {
        table.clear();
        dataUnit.forEach(function(item, idx) {
            var badgeStatus = item.status === 'aktif' 
                ? '<span class="badge badge-approved">Aktif</span>' 
                : '<span class="badge badge-rejected">Nonaktif</span>';

            var colKode = `<code><strong style="color:var(--primary);">${item.kode_unit}</strong></code>`;

            var colPembimbing = item.nama_pembimbing !== '-'
                ? `<span style="font-size:0.83rem; font-weight:500; color:var(--primary-dark);"><i class="fas fa-user-tie me-1 text-primary"></i>${item.nama_pembimbing}</span>`
                : `<span class="text-muted small"><em>Belum ada</em></span>`;

            var colPeserta = `
                <div class="text-center">
                    <span class="badge ${item.jumlah_peserta > 0 ? 'bg-primary' : 'bg-light text-muted border'}" style="font-size:0.75rem;">
                        ${item.jumlah_peserta} Orang
                    </span>
                </div>
            `;

            var colAksi = `
                <div class="action-buttons text-center">
                    <button class="btn btn-sm btn-outline-primary btn-aksi btn-detail-unit" data-id="${item.id}" title="Detail">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary btn-aksi btn-edit-unit" data-id="${item.id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger btn-aksi btn-hapus-unit" data-id="${item.id}" title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            table.row.add([
                idx + 1,
                colKode,
                `<strong>${item.nama_unit}</strong>`,
                getBadgeTipe(item.tipe),
                `<span class="small text-muted">${item.nama_induk}</span>`,
                colPembimbing,
                colPeserta,
                badgeStatus,
                colAksi
            ]);
        });
        table.draw();
    }

    renderTable();

    $('#idIndukUnit option').not('[value=""]').remove();
    window.masterUnitKerja.forEach(function(unit) {
        $('#idIndukUnit').append(new Option(unit.nama + ' (' + unit.kode + ')', unit.id));
    });

    $('#pembimbingUnit option').not('[value=""]').remove();
    window.masterPembimbing.forEach(function(pembimbing) {
        var unit = window.getMasterUnit(pembimbing.unitId);
        $('#pembimbingUnit').append(new Option(
            pembimbing.nama + (unit ? ' (' + unit.kode + ')' : ''),
            pembimbing.id
        ));
    });

    // Filter Tipe
    $('#filterTipeUnit').on('change', function() {
        var val = $(this).val();
        table.column(3).search(val).draw();
    });

    // Filter Status
    $('#filterStatusUnit').on('change', function() {
        var val = $(this).val();
        table.column(7).search(val).draw();
    });

    // Reset Filter
    $('#btnResetFilterUnit').on('click', function() {
        $('#filterTipeUnit').val('');
        $('#filterStatusUnit').val('');
        table.search('').columns().search('').draw();
    });

    // Refresh
    $('#btnReloadTable').on('click', function() {
        renderTable();
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Data unit kerja diperbarui',
            showConfirmButton: false,
            timer: 1500
        });
    });

    // Tambah Unit
    $('#btnTambahUnit').on('click', function() {
        $('#formUnitKerja')[0].reset();
        $('#unitId').val('');
        $('#modalUnitTitle').html('<i class="fas fa-building me-2"></i>Tambah Unit Kerja');
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalUnitKerja')).show();
    });

    // Submit Form
    $('#formUnitKerja').on('submit', function(e) {
        e.preventDefault();

        var id = $('#unitId').val();
        var kode = $('#kodeUnit').val().trim().toUpperCase();
        var nama = $('#namaUnit').val().trim();
        var tipe = $('#tipeUnit').val();
        var idInduk = $('#idIndukUnit').val() || null;
        var namaInduk = idInduk ? $('#idIndukUnit option:selected').text().split('(')[0].trim() : '-';
        var idPembimbing = $('#pembimbingUnit').val() || null;
        var namaPembimbing = idPembimbing ? $('#pembimbingUnit option:selected').text() : '-';
        var status = $('#statusUnit').val();

        // Cek duplikasi kode unik
        var dupKode = dataUnit.find(u => u.kode_unit === kode && u.id != id);
        if (dupKode) {
            Swal.fire('Kode Sudah Digunakan', 'Kode unit ' + kode + ' sudah terdaftar untuk unit ' + dupKode.nama_unit + '!', 'warning');
            return;
        }

        if (id) {
            // Edit
            var idx = dataUnit.findIndex(u => u.id == id);
            if (idx !== -1) {
                dataUnit[idx].kode_unit = kode;
                dataUnit[idx].nama_unit = nama;
                dataUnit[idx].tipe = tipe;
                dataUnit[idx].id_induk = idInduk;
                dataUnit[idx].nama_induk = namaInduk;
                dataUnit[idx].id_pembimbing = idPembimbing;
                dataUnit[idx].nama_pembimbing = namaPembimbing;
                dataUnit[idx].status = status;
            }
            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: 'Data unit kerja berhasil diperbarui.',
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            // Tambah
            var newId = dataUnit.length ? Math.max(...dataUnit.map(u => u.id)) + 1 : 1;
            dataUnit.push({
                id: newId,
                kode_unit: kode,
                nama_unit: nama,
                tipe: tipe,
                id_induk: idInduk,
                nama_induk: namaInduk,
                id_pembimbing: idPembimbing,
                nama_pembimbing: namaPembimbing,
                jumlah_peserta: 0,
                status: status
            });
            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: 'Unit kerja ' + nama + ' (' + kode + ') berhasil ditambahkan.',
                timer: 1500,
                showConfirmButton: false
            });
        }

        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalUnitKerja')).hide();
        renderTable();
    });

    // Edit Unit
    $(document).on('click', '.btn-edit-unit', function() {
        var id = $(this).data('id');
        var item = dataUnit.find(u => u.id == id);
        if (!item) return;

        $('#unitId').val(item.id);
        $('#kodeUnit').val(item.kode_unit);
        $('#namaUnit').val(item.nama_unit);
        $('#tipeUnit').val(item.tipe);
        $('#idIndukUnit').val(item.id_induk || '');
        $('#pembimbingUnit').val(item.id_pembimbing || '');
        $('#statusUnit').val(item.status);

        $('#modalUnitTitle').html('<i class="fas fa-edit me-2"></i>Edit Unit Kerja');
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalUnitKerja')).show();
    });

    // Detail Unit
    $(document).on('click', '.btn-detail-unit', function() {
        var id = $(this).data('id');
        var item = dataUnit.find(u => u.id == id);
        if (!item) return;

        var html = `
            <div class="p-3 rounded mb-3" style="background:var(--bg-light);">
                <div class="d-flex justify-content-between align-items-center">
                    <h6 class="fw-bold mb-0 text-primary">${item.nama_unit}</h6>
                    <code>${item.kode_unit}</code>
                </div>
                <small class="text-muted">Tipe: ${item.tipe.toUpperCase()} &bull; Status: ${item.status.toUpperCase()}</small>
            </div>

            <table class="table table-sm table-borderless" style="font-size:0.85rem;">
                <tr><th width="40%">Kode Unit</th><td>: <code>${item.kode_unit}</code></td></tr>
                <tr><th>Induk Organisasi</th><td>: ${item.nama_induk}</td></tr>
                <tr><th>Pembimbing Lapangan</th><td>: <strong class="text-primary">${item.nama_pembimbing}</strong></td></tr>
                <tr><th>Peserta Magang Aktif</th><td>: <span class="badge bg-primary">${item.jumlah_peserta} Orang</span></td></tr>
                <tr><th>Status</th><td>: <span class="badge ${item.status === 'aktif' ? 'badge-approved' : 'badge-rejected'}">${item.status}</span></td></tr>
            </table>
        `;

        $('#contentDetailUnit').html(html);
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalDetailUnit')).show();
    });

    // Hapus Unit
    $(document).on('click', '.btn-hapus-unit', function() {
        var id = $(this).data('id');
        var item = dataUnit.find(u => u.id == id);
        if (!item) return;

        if (item.jumlah_peserta > 0) {
            Swal.fire({
                title: 'Tidak Bisa Dihapus!',
                html: `Unit <strong>${item.nama_unit}</strong> saat ini masih memiliki <strong>${item.jumlah_peserta} peserta magang aktif</strong>.<br><br>Pindahkan penempatan peserta terlebih dahulu.`,
                icon: 'error',
                confirmButtonColor: '#334EAC'
            });
            return;
        }

        Swal.fire({
            title: 'Hapus Unit Kerja?',
            text: 'Unit ' + item.nama_unit + ' (' + item.kode_unit + ') akan dihapus!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        }).then(function(result) {
            if (result.isConfirmed) {
                dataUnit = dataUnit.filter(u => u.id != id);
                renderTable();
                Swal.fire({
                    icon: 'success',
                    title: 'Dihapus!',
                    text: 'Unit kerja berhasil dihapus.',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        });
    });

});
