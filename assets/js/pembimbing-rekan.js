// Modul Pembimbing: Data Rekan Pembimbing (Read-Only)
// Menampilkan daftar rekan pembimbing di Dishub Ponorogo secara read-only

$(document).ready(function() {
    var dataRekanPembimbing = [];

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    // Render tabel
    function renderTabel(data) {
        var tbody = $('#tabelRekanPembimbing tbody');
        tbody.empty();

        if (!data || data.length === 0) {
            tbody.append('<tr><td colspan="8" class="text-center py-4 text-muted">Belum ada data</td></tr>');
            return;
        }

        var currentUser = null;
        try {
            currentUser = JSON.parse(localStorage.getItem('user') || localStorage.getItem('siamag_user') || 'null');
        } catch (e) {}

        var currentName = currentUser && (currentUser.nama || currentUser.name || currentUser.username || '').toLowerCase();

        data.forEach(function(item, index) {
            var isSaya = currentName && String(item.nama_lengkap || '').toLowerCase().indexOf(currentName) !== -1;
            var badgeUser = isSaya 
                ? '<span class="badge bg-primary ms-1"><i class="fas fa-user-check me-1"></i>Anda</span>' 
                : '';

            var initials = (item.nama_lengkap || 'P').split(/\s+/).map(function(word) {
                return word.charAt(0);
            }).join('').slice(0, 2).toUpperCase();

            var row = `
                <tr class="${isSaya ? 'table-primary bg-opacity-10' : ''}">
                    <td class="text-center fw-bold text-muted">${index + 1}</td>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="rounded-circle d-flex align-items-center justify-content-center bg-light border text-primary fw-bold me-3" style="width:40px; height:40px; font-size:0.85rem;">
                                ${escapeHtml(initials)}
                            </div>
                            <div>
                                <div class="fw-bold text-dark">${escapeHtml(item.nama_lengkap)} ${badgeUser}</div>
                                <small class="text-muted"><i class="fas fa-id-card me-1"></i>NIP. ${escapeHtml(item.nip || '-')}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="fw-semibold text-primary">${escapeHtml(item.jabatan || 'Pembimbing Lapangan')}</div>
                    </td>
                    <td><span class="text-muted"><i class="fas fa-building me-1"></i>${escapeHtml(item.unit_kerja || '-')}</span></td>
                    <td>
                        <div class="small fw-semibold text-dark"><i class="fas fa-phone-alt text-success me-1"></i>${escapeHtml(item.no_hp || '-')}</div>
                        <div class="small text-muted"><i class="fas fa-envelope text-secondary me-1"></i>${escapeHtml(item.email || '-')}</div>
                    </td>
                    <td class="text-center">
                        <span class="badge ${Number(item.jumlah_bimbingan) > 0 ? 'bg-success' : 'bg-secondary'} rounded-pill px-3 py-2">
                            ${Number(item.jumlah_bimbingan || 0)} Orang
                        </span>
                    </td>
                    <td class="text-center">
                        <span class="badge bg-light text-success border">
                            <i class="fas fa-check-circle me-1"></i>${escapeHtml(item.status || 'aktif')}
                        </span>
                    </td>
                    <td class="text-center">
                        <div class="btn-group btn-group-sm" role="group">
                            <button type="button" class="btn btn-outline-primary btn-detail" data-id="${escapeHtml(item.id)}" title="Detail Lengkap">
                                <i class="fas fa-eye me-1"></i> Detail
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });
    }

    function loadRekanPembimbing() {
        $('#btnReloadTable').prop('disabled', true);
        if (!dataRekanPembimbing.length) {
            $('#tabelRekanPembimbing tbody').html(
                '<tr><td colspan="8" class="text-center py-4 text-muted">Memuat data...</td></tr>');
        }
        window.apiRequestAll('/pembimbing/rekan', [])
        .then(function(items) {
            dataRekanPembimbing = items.map(function(item) {
                var unit = item.unit_kerja || item.unit || {};
                var account = item.pengguna || {};
                var participants = item.daftar_peserta_bimbingan || item.anak_bimbingan || item.peserta || [];
                var participantDetails = Array.isArray(participants) ? participants.map(function(entry) {
                    entry = entry || {};
                    var participant = entry.peserta_magang || entry.peserta || entry;
                    var participantAccount = participant.pengguna || participant.user || {};
                    return {
                        nama: entry.nama_lengkap || entry.nama_peserta || participantAccount.nama_lengkap ||
                            participant.nama_lengkap || participant.nama || entry.nama || '-',
                        asal: entry.asal_sekolah_kampus || entry.instansi || participant.asal_sekolah_kampus ||
                            participant.instansi || '-'
                    };
                }) : [];
                var totalBimbingan = item.total_bimbingan != null ? item.total_bimbingan :
                    item.peserta_magang_count != null ? item.peserta_magang_count :
                        item.jumlah_bimbingan != null ? item.jumlah_bimbingan :
                            participantDetails.length;
                var parsedTotalBimbingan = Number(totalBimbingan);
                return {
                    id: item.id,
                    nama_lengkap: account.nama_lengkap || item.nama_lengkap || item.nama || '-',
                    nip: item.nip || account.username || '-',
                    jabatan: item.jabatan || 'Pembimbing Lapangan',
                    unit_kerja: item.nama_unit_kerja || (typeof unit === 'string'
                        ? unit
                        : unit.nama_unit || unit.nama || '-'),
                    no_hp: item.no_hp || account.no_hp || '-',
                    email: item.email || account.email || '-',
                    jumlah_bimbingan: Number.isFinite(parsedTotalBimbingan) && parsedTotalBimbingan >= 0
                        ? parsedTotalBimbingan
                        : 0,
                    daftar_peserta_bimbingan: participantDetails,
                    status: item.status_pembimbing || item.status || 'aktif',
                };
            });
            renderTabel(dataRekanPembimbing);
        })
        .catch(function(err) {
            if (!dataRekanPembimbing.length) {
                $('#tabelRekanPembimbing tbody').html(
                    '<tr><td colspan="8" class="text-center py-4 text-danger">' +
                    escapeHtml(err.message) + '</td></tr>');
            }
            Swal.fire('Data Rekan Pembimbing Gagal Dimuat', err.message, 'error');
        })
        .then(function() {
            $('#btnReloadTable').prop('disabled', false);
        });
    }

    // Inisialisasi awal
    loadRekanPembimbing();
    $('#btnReloadTable').on('click', loadRekanPembimbing);

    // Filter Pencarian
    $('#searchRekan').on('keyup', function() {
        var query = $(this).val().toLowerCase();
        var filtered = dataRekanPembimbing.filter(function(item) {
            return (item.nama_lengkap || '').toLowerCase().includes(query) ||
                   (item.nip || '').includes(query) ||
                   (item.unit_kerja || '').toLowerCase().includes(query) ||
                   (item.jabatan || '').toLowerCase().includes(query);
        });
        renderTabel(filtered);
    });

    // Detail Modal
    $(document).on('click', '.btn-detail', function() {
        var id = $(this).data('id');
        var item = dataRekanPembimbing.find(function(p) { return String(p.id) === String(id); });

        if (!item) return;

        $('#detailNama').text(item.nama_lengkap);
        $('#detailNip').text(item.nip);
        $('#detailJabatan').text(item.jabatan);
        $('#detailUnit').text(item.unit_kerja);
        $('#detailNoHp').text(item.no_hp);
        $('#detailEmail').text(item.email);
        $('#detailBimbingan').text(item.jumlah_bimbingan + ' Orang');
        var $participants = $('#detailDaftarPesertaBimbingan').empty();
        item.daftar_peserta_bimbingan.forEach(function(participant) {
            $participants.append(
                '<li class="list-group-item px-0 py-1 bg-transparent">' +
                    '<span class="fw-semibold">' + escapeHtml(participant.nama) + '</span> ' +
                    '<span class="text-muted">(' + escapeHtml(participant.asal) + ')</span>' +
                '</li>'
            );
        });

        var modalEl = document.getElementById('modalDetailPembimbing');
        if (modalEl) {
            var modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
        }
    });
});
