/* pembimbing-logbook.js
   Verifikasi dan koreksi logbook melalui API backend.
 */

$(document).ready(function() {
    var records = [];
    var currentId = null;
    var user = null;
    try { user = JSON.parse(localStorage.getItem('siamag_user') || 'null'); } catch (error) { user = null; }
    window.setUserTopbar(user, 'pembimbing');

    var table = $('#tabelVerifLogbook').DataTable({
        language: {
            search: 'Cari Logbook:',
            lengthMenu: 'Tampilkan _MENU_ data',
            zeroRecords: 'Belum ada data',
            info: 'Menampilkan _START_ sampai _END_ dari _TOTAL_ logbook',
            infoEmpty: 'Menampilkan 0 data',
            infoFiltered: '(disaring dari _MAX_ total data)',
            paginate: { first: 'Awal', last: 'Akhir', next: 'Berikutnya', previous: 'Sebelumnya' }
        },
        order: [[2, 'desc']],
        columnDefs: [{ orderable: false, targets: [4, 6] }]
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
                throw new Error(window.apiResponseMessage(payload, 'Permintaan gagal (HTTP ' + response.status + ').'));
            }
            return payload;
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
            tanggal: item.tanggal || '',
            id_absensi: item.id_absensi || '',
            mulai: item.jam_mulai || '',
            selesai: item.jam_selesai || '',
            kegiatan: item.kegiatan || '',
            foto_kegiatan: item.foto_kegiatan_url || item.foto_kegiatan || '',
            status: String(item.status_verifikasi || 'pending').toLowerCase(),
            catatan_pembimbing: item.catatan_pembimbing || '',
            paraf_pembimbing: item.paraf_pembimbing_url || item.paraf_pembimbing || '',
            diverifikasi_oleh: item.diverifikasi_oleh || ''
        };
    }

    function renderTable() {
        table.clear();
        records.forEach(function(item, index) {
            var status = item.status === 'approved'
                ? '<span class="badge badge-approved">Approved</span>'
                : item.status === 'pending'
                    ? '<span class="badge badge-pending">Pending</span>'
                    : item.status === 'rejected'
                        ? '<span class="badge badge-rejected">Rejected</span>'
                        : '<span class="badge bg-secondary">' + escapeHtml(item.status || '-') + '</span>';
            var parafUrl = item.status === 'approved' ? fileUrl(item.paraf_pembimbing) : '';
            if (parafUrl) {
                status += '<br><img src="' + escapeHtml(parafUrl) +
                    '" style="height: 30px; margin-top: 5px;" alt="Paraf pembimbing">';
            }
            var attachmentUrl = fileUrl(item.foto_kegiatan);
            var attachment = attachmentUrl
                ? '<a href="' + escapeHtml(attachmentUrl) + '" target="_blank" rel="noopener" class="badge bg-light text-secondary border"><i class="fas fa-image me-1"></i>Lihat Foto</a>'
                : '<span class="text-muted small">-</span>';
            var actions = '<button class="btn btn-sm btn-outline-primary btn-detail-logbook" data-id="' +
                escapeHtml(item.id) + '"><i class="fas fa-eye me-1"></i>Detail</button>';
            if (item.status === 'pending') {
                actions += ' <button class="btn btn-sm btn-outline-success btn-paraf-logbook" data-id="' +
                    escapeHtml(item.id) + '" title="Verifikasi"><i class="fas fa-check"></i></button>' +
                    ' <button class="btn btn-sm btn-outline-danger btn-tolak-logbook" data-id="' +
                    escapeHtml(item.id) + '" title="Minta Revisi"><i class="fas fa-rotate-left"></i></button>';
            }
            table.row.add([
                index + 1,
                '<div><strong>' + escapeHtml(item.nama) + '</strong><div class="small text-muted">' + escapeHtml(item.instansi) + '</div></div>',
                '<div><strong>' + escapeHtml(item.tanggal) + '</strong><div class="small text-muted">' +
                    escapeHtml(item.mulai) + ' - ' + escapeHtml(item.selesai) + '</div></div>',
                '<div class="small">' + escapeHtml(item.kegiatan) + '</div>',
                attachment,
                status,
                '<div class="action-buttons text-center">' + actions + '</div>'
            ]);
        });
        table.draw();
        $('#statTotalLogbook').text(records.length);
        $('#statPendingLogbook').text(records.filter(function(row) { return row.status === 'pending'; }).length);
        $('#statDiverifikasiLogbook').text(records.filter(function(row) { return row.status === 'approved'; }).length);
        $('#statRevisiLogbook').text(records.filter(function(row) {
            return row.status === 'rejected';
        }).length);
        var names = Array.from(new Map(records.map(function(row) { return [row.nim, row.nama]; })).values());
        var $filter = $('#filterPesertaLogbook').empty().append(new Option('Semua Anak Bimbingan', ''));
        names.forEach(function(name) { $filter.append(new Option(name, name)); });
    }

    function loadLogbook(silent) {
        $('#btnReloadTable').prop('disabled', true);
        window.apiSetTableState(table, 'loading');
        return window.apiRequestAll('/pembimbing/logbook', ['logbook', 'logbooks']).then(function(rows) {
            records = rows.map(normalize);
            renderTable();
            window.apiSetTableState(table, 'loaded');
            return true;
        }).catch(function(error) {
            window.apiSetTableState(table, 'error');
            if (!silent) Swal.fire('Data Logbook Gagal Dimuat', error.message, 'error');
            return false;
        }).then(function(loaded) {
            $('#btnReloadTable').prop('disabled', false);
            return loaded;
        });
    }

    function submitCorrection(item, status, note, signature) {
        var requestOptions;
        if (status === 'approved') {
            var formData = new FormData();
            formData.append('_method', 'PUT');
            formData.append('status_verifikasi', status);
            formData.append('catatan_pembimbing', note);
            formData.append('paraf_pembimbing', signature, signature.name);
            requestOptions = { method: 'POST', body: formData };
        } else {
            requestOptions = {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status_verifikasi: status, catatan_pembimbing: note })
            };
        }
        return window.apiRequest('/koreksi-logbook/' + encodeURIComponent(item.id), requestOptions).then(function(responseData) {
            return loadLogbook(true).then(function(loaded) {
                Swal.fire({
                    icon: loaded ? 'success' : 'warning',
                    title: loaded ? 'Berhasil' : 'Keputusan Tersimpan, Daftar Belum Diperbarui',
                    text: window.apiResponseMessage(responseData,
                        status === 'approved' ? 'Logbook berhasil diverifikasi.' : 'Catatan revisi terkirim.') +
                        (loaded ? '' : ' Daftar gagal dimuat ulang; silakan tekan tombol muat ulang.')
                });
            });
        }).catch(function(error) {
            Swal.fire('Koreksi Logbook Gagal', error.message, 'error');
        });
    }

    function requestReview(item, approved) {
        Swal.fire({
            title: approved ? 'Verifikasi Logbook?' : 'Minta Revisi Logbook?',
            html: '<label class="form-label text-start w-100" for="catatanLogbook">' +
                (approved ? 'Catatan Pembimbing (opsional)' : 'Catatan Pembimbing (wajib)') + '</label>' +
                '<textarea id="catatanLogbook" name="catatan_pembimbing" class="form-control mb-3" rows="3" placeholder="Catatan atau arahan untuk peserta"></textarea>' +
                (approved
                    ? '<label class="form-label text-start w-100" for="paraf_pembimbing">Paraf Pembimbing (gambar, maks. 5 MB)</label>' +
                        '<input id="paraf_pembimbing" name="paraf_pembimbing" type="file" class="form-control" accept="image/*" required aria-label="Pilih gambar paraf pembimbing">'
                    : ''),
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: approved ? 'Setujui' : 'Kirim Catatan Revisi',
            cancelButtonText: 'Batal',
            preConfirm: function() {
                var popup = Swal.getPopup();
                var note = popup.querySelector('#catatanLogbook').value.trim();
                if (!approved && !note) {
                    Swal.showValidationMessage('Catatan Pembimbing wajib diisi.');
                    return false;
                }
                if (approved) {
                    var input = popup.querySelector('#paraf_pembimbing');
                    var file = input && input.files && input.files[0];
                    if (!file) {
                        Swal.showValidationMessage('Gambar paraf wajib dipilih.');
                        return false;
                    }
                    if (!file.type || file.type.indexOf('image/') !== 0) {
                        Swal.showValidationMessage('File paraf harus berupa gambar.');
                        return false;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                        Swal.showValidationMessage('Ukuran file paraf maksimal 5 MB.');
                        return false;
                    }
                    return { note: note, signature: file };
                }
                return note;
            }
        }).then(function(result) {
            if (result.isConfirmed) {
                var note = approved ? result.value.note : result.value;
                var signature = approved ? result.value.signature : null;
                return submitCorrection(item, approved ? 'approved' : 'rejected', note, signature);
            }
        });
    }

    $('#filterPesertaLogbook').on('change', function() { table.column(1).search($(this).val()).draw(); });
    $('#filterStatusVerifLogbook').on('change', function() { table.column(5).search($(this).val()).draw(); });
    $('#btnResetFilterLogbook').on('click', function() {
        $('#filterPesertaLogbook, #filterStatusVerifLogbook').val('');
        table.search('').columns().search('').draw();
    });
    $('#btnReloadTable').on('click', loadLogbook);

    $(document).on('click', '.btn-paraf-logbook, .btn-tolak-logbook, .btn-detail-logbook', function() {
        var item = records.find(function(row) { return String(row.id) === String($(this).data('id')); }.bind(this));
        if (!item) return;
        if ($(this).hasClass('btn-paraf-logbook')) return requestReview(item, true);
        if ($(this).hasClass('btn-tolak-logbook')) return requestReview(item, false);

        currentId = item.id;
        var attachmentUrl = fileUrl(item.foto_kegiatan);
        $('#contentModalLogbook').html(
            '<div class="mb-3"><strong>Peserta:</strong> ' + escapeHtml(item.nama) + ' (' + escapeHtml(item.instansi) + ')</div>' +
            '<div class="mb-3"><strong>Waktu:</strong> ' + escapeHtml(item.tanggal) + ' ' + escapeHtml(item.mulai) + '–' + escapeHtml(item.selesai) + '</div>' +
            '<div class="mb-3"><strong>Status:</strong> ' + escapeHtml(item.status) + '</div>' +
            '<div class="mb-3"><strong>Kegiatan:</strong><div class="p-3 bg-light rounded">' + escapeHtml(item.kegiatan) + '</div></div>' +
            '<div class="mb-3"><strong>Catatan Pembimbing:</strong> ' + escapeHtml(item.catatan_pembimbing || '-') + '</div>' +
            (attachmentUrl ? '<a href="' + escapeHtml(attachmentUrl) + '" target="_blank" rel="noopener">Lihat Foto Kegiatan</a>' : '<span class="text-muted">Tidak ada foto kegiatan</span>')
        );
        $('#btnParafLogbookModal, #btnTolakLogbookModal').toggle(item.status === 'pending');
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalVerifLogbook')).show();
    });

    $('#btnParafLogbookModal').on('click', function() {
        var item = records.find(function(row) { return String(row.id) === String(currentId); });
        bootstrap.Modal.getInstance(document.getElementById('modalVerifLogbook')).hide();
        if (item) requestReview(item, true);
    });
    $('#btnTolakLogbookModal').on('click', function() {
        var item = records.find(function(row) { return String(row.id) === String(currentId); });
        bootstrap.Modal.getInstance(document.getElementById('modalVerifLogbook')).hide();
        if (item) requestReview(item, false);
    });

    loadLogbook();
});
