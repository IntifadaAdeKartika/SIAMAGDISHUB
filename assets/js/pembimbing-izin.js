/* pembimbing-izin.js
   Persetujuan dan penolakan pengajuan izin melalui API backend.
 */

$(document).ready(function() {
    var records = [];
    var currentId = null;
    var statusVerificationFilter = '';
    var user = null;
    try { user = JSON.parse(localStorage.getItem('siamag_user') || 'null'); } catch (error) { user = null; }
    window.setUserTopbar(user, 'pembimbing');

    var table = $('#tabelApproveIzin').DataTable({
        language: {
            search: 'Cari Permohonan:',
            lengthMenu: 'Tampilkan _MENU_ data',
            zeroRecords: 'Belum ada data',
            info: 'Menampilkan _START_ sampai _END_ dari _TOTAL_ permohonan',
            infoEmpty: 'Menampilkan 0 data',
            infoFiltered: '(disaring dari _MAX_ total data)',
            paginate: { first: 'Awal', last: 'Akhir', next: 'Berikutnya', previous: 'Sebelumnya' }
        },
        order: [[3, 'desc']],
        columnDefs: [{ orderable: false, targets: [6, 8] }]
    });

    function apiUrl(path) {
        if (typeof window.apiUrl === 'function') return window.apiUrl(path);
        var base = (window.API_BASE || 'http://localhost:8000/backend-api').replace(/\/+$/, '');
        var cleanPath = String(path || '').replace(/^\/+/, '');
        return cleanPath ? base + '/' + cleanPath : base;
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    function fileUrl(path) {
        if (!path) return '';
        try {
            return /^https?:/i.test(path) ? new URL(path).href :
                new URL(String(path).replace(/^\//, ''), new URL(apiUrl('/')).origin + '/').href;
        } catch (error) { return ''; }
    }

    function readResponse(response) {
        return response.text().then(function(text) {
            var payload = {};
            if (text) { try { payload = JSON.parse(text); } catch (error) { payload = {}; } }
            if (!response.ok) {
                var validation = payload.errors && Object.keys(payload.errors).map(function(key) {
                    return payload.errors[key][0];
                })[0];
                throw new Error(validation || payload.message || 'Permintaan gagal (HTTP ' + response.status + ').');
            }
            return payload.data !== undefined ? payload.data : payload;
        });
    }

    function normalize(item) {
        var participant = item.peserta_magang || item.peserta || {};
        var account = participant.pengguna || {};
        return {
            id: item.id,
            id_peserta_magang: item.id_peserta_magang || participant.id || '',
            nama: item.nama_peserta || account.nama_lengkap || participant.nama_lengkap || '-',
            nim: item.nim || account.username || '',
            instansi: item.instansi || participant.asal_sekolah_kampus || '-',
            jenis: String(item.jenis || 'izin').toLowerCase(),
            mulai: item.tanggal_mulai || '',
            selesai: item.tanggal_selesai || '',
            keterangan: item.keterangan || '',
            file: item.file_surat_url || item.file_surat || '',
            status: String(item.status || 'pending').toLowerCase(),
            catatan_pembimbing: item.catatan_pembimbing || '',
            diverifikasi_oleh: item.diverifikasi_oleh || ''
        };
    }

    function renderTable() {
        table.clear();
        var visibleRecords = records.filter(function(item) {
            return !statusVerificationFilter ||
                String(item.status || '').toLowerCase() === statusVerificationFilter;
        });
        visibleRecords.forEach(function(item, index) {
            var jenis = item.jenis === 'sakit'
                ? '<span class="badge" style="background:#fce4ec;color:#c62828;">Sakit</span>'
                : '<span class="badge" style="background:#e0f2fe;color:#0369a1;">Izin</span>';
            var status = item.status === 'approved'
                ? '<span class="badge badge-approved">Approved</span>'
                : item.status === 'pending'
                    ? '<span class="badge badge-pending">Pending</span>'
                    : '<span class="badge badge-rejected">Rejected</span>';
            var suratUrl = fileUrl(item.file);
            var surat = suratUrl
                ? '<a href="' + escapeHtml(suratUrl) + '" target="_blank" rel="noopener" class="btn btn-link btn-sm p-0">Lihat surat</a>'
                : '<span class="text-muted">-</span>';
            var actions = '<button class="btn btn-sm btn-outline-primary btn-detail-izin" data-id="' +
                escapeHtml(item.id) + '"><i class="fas fa-eye me-1"></i>Detail</button>';
            if (item.status === 'pending') {
                actions += ' <button class="btn btn-sm btn-outline-success btn-approve-izin" data-id="' +
                    escapeHtml(item.id) + '" title="Setujui"><i class="fas fa-check"></i></button>' +
                    ' <button class="btn btn-sm btn-outline-danger btn-reject-izin" data-id="' +
                    escapeHtml(item.id) + '" title="Tolak"><i class="fas fa-times"></i></button>';
            }
            table.row.add([
                index + 1,
                '<div><strong>' + escapeHtml(item.nama) + '</strong><div class="small text-muted">' + escapeHtml(item.instansi) + '</div></div>',
                jenis,
                '<div><strong>' + escapeHtml(item.mulai) + '</strong>' +
                    (item.selesai !== item.mulai ? '<div class="small text-muted">s/d ' + escapeHtml(item.selesai) + '</div>' : '') + '</div>',
                '<span class="badge bg-light text-dark border">' + escapeHtml(item.mulai && item.selesai
                    ? Math.round((new Date(item.selesai) - new Date(item.mulai)) / 86400000) + 1 : '-') + ' Hari</span>',
                '<div class="small">' + escapeHtml(item.keterangan) + '</div>',
                surat,
                status,
                '<div class="action-buttons text-center">' + actions + '</div>'
            ]);
        });
        table.draw();
        $('#statTotalIzinBimbingan').text(records.length);
        $('#statPendingIzin').text(records.filter(function(row) { return row.status === 'pending'; }).length);
        $('#statApprovedIzin').text(records.filter(function(row) { return row.status === 'approved'; }).length);
        $('#statRejectedIzin').text(records.filter(function(row) { return row.status === 'rejected'; }).length);
        var names = Array.from(new Map(records.map(function(row) { return [row.nim, row.nama]; })).values());
        var $filter = $('#filterPesertaIzin').empty().append(new Option('Semua Anak Bimbingan', ''));
        names.forEach(function(name) { $filter.append(new Option(name, name)); });
    }

    function loadRequests(silent) {
        $('#btnReloadTable').prop('disabled', true);
        window.apiSetTableState(table, 'loading');
        return window.apiRequestAll('/pembimbing/pengajuan-izin', ['pengajuan_izin', 'pengajuan_izins']).then(function(rows) {
            records = rows.map(normalize);
            renderTable();
            window.apiSetTableState(table, 'loaded');
            return true;
        }).catch(function(error) {
            window.apiSetTableState(table, 'error');
            if (!silent) Swal.fire('Pengajuan Izin Gagal Dimuat', error.message, 'error');
            return false;
        }).then(function(loaded) {
            $('#btnReloadTable').prop('disabled', false);
            return loaded;
        });
    }

    function decide(item, status, note) {
        return window.apiRequest('/approve-izin/' + encodeURIComponent(item.id), {
            method: 'POST',
            body: JSON.stringify({ status: status, catatan_pembimbing: note }),
            headers: { 'Content-Type': 'application/json' }
        }).then(function(responseData) {
            return loadRequests(true).then(function(loaded) {
                Swal.fire({
                    icon: loaded ? 'success' : 'warning',
                    title: loaded ? 'Berhasil' : 'Keputusan Tersimpan, Daftar Belum Diperbarui',
                    text: window.apiResponseMessage(responseData,
                        status === 'approved' ? 'Permohonan izin disetujui.' : 'Permohonan izin ditolak.') +
                        (loaded ? '' : ' Daftar gagal dimuat ulang; silakan tekan tombol muat ulang.')
                });
            });
        }).catch(function(error) {
            Swal.fire('Keputusan Gagal Disimpan', error.message, 'error');
        });
    }

    function askDecision(item, status) {
        var approved = status === 'approved';
        Swal.fire({
            title: approved ? 'Setujui Permohonan Izin?' : 'Tolak Permohonan Izin?',
            html: '<div class="text-start small mb-2">' + escapeHtml(item.nama) + ' · ' +
                escapeHtml(item.jenis.toUpperCase()) + ' · ' + escapeHtml(item.mulai) + ' s/d ' + escapeHtml(item.selesai) + '</div>' +
                '<label for="catatanKeputusan" class="form-label text-start w-100">' +
                (approved ? 'Catatan persetujuan (opsional)' : 'Alasan penolakan (wajib)') + '</label>' +
                '<textarea id="catatanKeputusan" class="form-control" rows="3"></textarea>',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: approved ? '#198754' : '#dc3545',
            confirmButtonText: approved ? 'Setujui' : 'Tolak',
            cancelButtonText: 'Batal',
            preConfirm: function() {
                var note = Swal.getPopup().querySelector('#catatanKeputusan').value.trim();
                if (!approved && !note) {
                    Swal.showValidationMessage('Alasan penolakan wajib diisi.');
                    return false;
                }
                return note;
            }
        }).then(function(result) {
            if (result.isConfirmed) return decide(item, status, result.value || '');
        });
    }

    $('#filterPesertaIzin').on('change', function() { table.column(1).search($(this).val()).draw(); });
    $('#filterStatusIzin').on('change', function() {
        statusVerificationFilter = String($(this).val() || '').toLowerCase();
        renderTable();
    });
    $('#btnResetFilterIzin').on('click', function() {
        $('#filterPesertaIzin, #filterStatusIzin').val('');
        statusVerificationFilter = '';
        table.search('').columns().search('');
        renderTable();
    });
    $('#btnReloadTable').on('click', loadRequests);
    $(document).on('click', '.btn-approve-izin, .btn-reject-izin, .btn-detail-izin', function() {
        var item = records.find(function(row) { return String(row.id) === String($(this).data('id')); }.bind(this));
        if (!item) return;
        if ($(this).hasClass('btn-approve-izin')) return askDecision(item, 'approved');
        if ($(this).hasClass('btn-reject-izin')) return askDecision(item, 'rejected');

        currentId = item.id;
        var suratUrl = fileUrl(item.file);
        $('#contentModalActionIzin').html(
            '<div class="mb-2"><strong>Peserta:</strong> ' + escapeHtml(item.nama) + ' (' + escapeHtml(item.instansi) + ')</div>' +
            '<div class="mb-2"><strong>Jenis:</strong> ' + escapeHtml(item.jenis.toUpperCase()) + '</div>' +
            '<div class="mb-2"><strong>Periode:</strong> ' + escapeHtml(item.mulai) + ' s/d ' + escapeHtml(item.selesai) +
            ' (' + escapeHtml(item.mulai && item.selesai
                ? Math.round((new Date(item.selesai) - new Date(item.mulai)) / 86400000) + 1 : '-') +
            ' hari)</div><div class="mb-2"><strong>Status:</strong> ' + escapeHtml(item.status) + '</div>' +
            '<div class="mb-3"><strong>Keterangan:</strong><div class="p-3 bg-light rounded">' + escapeHtml(item.keterangan) + '</div></div>' +
            '<div class="mb-3"><strong>Catatan Pembimbing:</strong> ' + escapeHtml(item.catatan_pembimbing || '-') + '</div>' +
            (suratUrl ? '<a href="' + escapeHtml(suratUrl) + '" target="_blank" rel="noopener">Lihat lampiran surat</a>' : '<span class="text-muted">Tidak ada lampiran</span>')
        );
        $('#btnApproveIzinModal, #btnRejectIzinModal').toggle(item.status === 'pending');
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalActionIzin')).show();
    });

    $('#btnApproveIzinModal').on('click', function() {
        var item = records.find(function(row) { return String(row.id) === String(currentId); });
        bootstrap.Modal.getInstance(document.getElementById('modalActionIzin')).hide();
        if (item) askDecision(item, 'approved');
    });
    $('#btnRejectIzinModal').on('click', function() {
        var item = records.find(function(row) { return String(row.id) === String(currentId); });
        bootstrap.Modal.getInstance(document.getElementById('modalActionIzin')).hide();
        if (item) askDecision(item, 'rejected');
    });

    loadRequests();
});
