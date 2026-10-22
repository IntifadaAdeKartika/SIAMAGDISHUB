// Modul Pembimbing: Data Rekan Pembimbing (Read-Only)
// Menampilkan daftar rekan pembimbing di Dishub Ponorogo secara read-only

$(document).ready(function() {

    // Data rekan pembimbing lapangan (kosong)
    var dataRekanPembimbing = window.masterPembimbing.map(function(pembimbing) {
        var unit = window.getMasterUnit(pembimbing.unitId);
        var jumlahBimbingan = window.masterPeserta.filter(function(peserta) {
            return peserta.unitId === pembimbing.unitId;
        }).length;

        return {
            id: pembimbing.id,
            inisial: pembimbing.nama.split(/\s+/).map(function(word) {
                return word.charAt(0);
            }).join("").replace(/[.,]/g, ""),
            nama_lengkap: pembimbing.nama,
            nip: "-",
            jabatan: "Pembimbing Lapangan",
            unit_kerja: unit ? unit.nama : "-",
            no_hp: "-",
            email: "-",
            jumlah_bimbingan: jumlahBimbingan,
            status: "aktif",
            ruangan: "-"
        };
    });

    // Render tabel
    function renderTabel(data) {
        var tbody = $('#tabelRekanPembimbing tbody');
        tbody.empty();

        if (data.length === 0) {
            tbody.append('<tr><td colspan="8" class="text-center py-4 text-muted">Data pembimbing tidak ditemukan.</td></tr>');
            return;
        }

        data.forEach(function(item, index) {
            var isSaya = item.id === 5;
            var badgeUser = isSaya 
                ? '<span class="badge bg-primary ms-1"><i class="fas fa-user-check me-1"></i>Anda</span>' 
                : '';

            var row = `
                <tr class="${isSaya ? 'table-primary bg-opacity-10' : ''}">
                    <td class="text-center fw-bold text-muted">${index + 1}</td>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="rounded-circle d-flex align-items-center justify-content-center bg-light border text-primary fw-bold me-3" style="width:40px; height:40px; font-size:0.85rem;">
                                ${item.inisial}
                            </div>
                            <div>
                                <div class="fw-bold text-dark">${item.nama_lengkap} ${badgeUser}</div>
                                <small class="text-muted"><i class="fas fa-id-card me-1"></i>NIP. ${item.nip}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="fw-semibold text-primary">${item.jabatan}</div>
                    </td>
                    <td><span class="text-muted"><i class="fas fa-building me-1"></i>${item.unit_kerja}</span></td>
                    <td>
                        <div class="small fw-semibold text-dark"><i class="fas fa-phone-alt text-success me-1"></i>${item.no_hp}</div>
                        <div class="small text-muted"><i class="fas fa-envelope text-secondary me-1"></i>${item.email}</div>
                    </td>
                    <td class="text-center">
                        <span class="badge ${item.jumlah_bimbingan > 0 ? 'bg-success' : 'bg-secondary'} rounded-pill px-3 py-2">
                            ${item.jumlah_bimbingan} Orang
                        </span>
                    </td>
                    <td class="text-center">
                        <span class="badge bg-light text-success border">
                            <i class="fas fa-check-circle me-1"></i>${item.status}
                        </span>
                    </td>
                    <td class="text-center">
                        <div class="btn-group btn-group-sm" role="group">
                            <button type="button" class="btn btn-outline-primary btn-detail" data-id="${item.id}" title="Detail Lengkap">
                                <i class="fas fa-eye me-1"></i> Detail
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });
    }

    // Inisialisasi awal
    renderTabel(dataRekanPembimbing);

    // Filter Pencarian
    $('#searchRekan').on('keyup', function() {
        var query = $(this).val().toLowerCase();
        var filtered = dataRekanPembimbing.filter(function(item) {
            return item.nama_lengkap.toLowerCase().includes(query) ||
                   item.nip.includes(query) ||
                   item.unit_kerja.toLowerCase().includes(query) ||
                   item.jabatan.toLowerCase().includes(query);
        });
        renderTabel(filtered);
    });

    // Detail Modal
    $(document).on('click', '.btn-detail', function() {
        var id = $(this).data('id');
        var item = dataRekanPembimbing.find(p => p.id === id);

        if (!item) return;

        $('#detailNama').text(item.nama_lengkap);
        $('#detailNip').text(item.nip);
        $('#detailJabatan').text(item.jabatan);
        $('#detailUnit').text(item.unit_kerja);
        $('#detailRuangan').text(item.ruangan);
        $('#detailNoHp').text(item.no_hp);
        $('#detailEmail').text(item.email);
        $('#detailBimbingan').text(item.jumlah_bimbingan + " Orang");

        var modalEl = document.getElementById('modalDetailPembimbing');
        if (modalEl) {
            var modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
        }
    });
});