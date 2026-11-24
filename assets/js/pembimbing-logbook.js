/* pembimbing-logbook.js
   Pemeriksaan, permintaan revisi, persetujuan, dan penolakan final logbook.
 */

$(document).ready(function() {
    var records = [];
    var currentId = null;
    var statusFilter = '';
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
        columnDefs: [{ orderable: false, targets: [2, 3, 4, 5, 6] }]
    });

    function apiUrl(path) {
        if (typeof window.apiUrl === 'function') return window.apiUrl(path);
        var base = (window.API_BASE || 'https://siamagdishub-backend.vercel.app/backend-api').replace(/\/+$/, '');
        var cleanPath = String(path || '').replace(/^\/+/, '');
        return cleanPath ? base + '/' + cleanPath : base;
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    function toBoolean(value) {
        return value === true || value === 1 || String(value).toLowerCase() === 'true';
    }

    function fileUrl(path) {
        if (!path) return '';
        if (typeof path === 'string' && (/^data:image\//i.test(path.trim()) || /^blob:/i.test(path.trim()))) {
            return path.trim();
        }
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

    function formatDateTimeLabel(value) {
        if (!value) return '';
        if (typeof window.apiFormatDateTime === 'function') {
            var formatted = window.apiFormatDateTime(value);
            return formatted && formatted.full && formatted.full !== '-' ? formatted.full : '';
        }
        return String(value).replace('T', ' ').slice(0, 19);
    }

    function truncate(value, maxLength) {
        var text = String(value == null ? '' : value);
        return text.length > maxLength ? text.slice(0, maxLength - 1) + '…' : text;
    }

    function normalize(item) {
        var participant = item.peserta_magang || item.peserta || {};
        var account = participant.pengguna || {};
        var riwayat = Array.isArray(item.riwayat_revisi) ? item.riwayat_revisi : [];
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
            foto_kegiatan: item.foto_kegiatan_url || item.url_foto_kegiatan || item.foto_kegiatan || '',
            status: String(item.status_verifikasi || 'pending').toLowerCase(),
            catatan_pembimbing: item.catatan_pembimbing || '',
            paraf_pembimbing: item.paraf_pembimbing_url || item.paraf_pembimbing || '',
            diverifikasi_oleh: item.diverifikasi_oleh || '',
            diverifikasi_pada: item.diverifikasi_pada || null,
            revisi_diminta: toBoolean(item.revisi_diminta),
            revisi_diminta_pada: item.revisi_diminta_pada || null,
            revisi_dikirim_pada: item.revisi_dikirim_pada || null,
            riwayat_revisi: riwayat
        };
    }

    function isPending(item) {
        return item.status === 'pending' && !item.revisi_diminta;
    }

    function isWaitingRevision(item) {
        return item.status === 'pending' && item.revisi_diminta;
    }

    function statusBadge(item) {
        if (item.status === 'approved') {
            return '<span class="badge badge-approved"><i class="fas fa-check-circle me-1"></i>Approved</span>';
        }
        if (item.status === 'rejected') {
            return '<span class="badge badge-rejected"><i class="fas fa-times-circle me-1"></i>Rejected</span>';
        }
        if (isWaitingRevision(item)) {
            return '<span class="badge badge-revisi"><i class="fas fa-rotate-left me-1"></i>Menunggu Revisi Peserta</span>';
        }
        return '<span class="badge badge-pending"><i class="fas fa-clock me-1"></i>Pending</span>';
    }

    function statusMetaHtml(item) {
        var html = '';
        if (item.status === 'approved') {
            var parafUrl = fileUrl(item.paraf_pembimbing);
            if (parafUrl) {
                html += '<br><img src="' + escapeHtml(parafUrl) +
                    '" style="height: 30px; margin-top: 5px;" alt="Paraf pembimbing">';
            }
        }
        if (item.catatan_pembimbing && item.status !== 'pending') {
            html += '<div class="small text-muted mt-1"><i class="fas fa-comment-dots me-1"></i>' +
                escapeHtml(truncate(item.catatan_pembimbing, 90)) + '</div>';
        }
        if (isWaitingRevision(item) && item.revisi_diminta_pada) {
            html += '<div class="small text-muted mt-1">Diminta: ' + escapeHtml(formatDateTimeLabel(item.revisi_diminta_pada)) + '</div>';
        }
        if (item.status === 'pending' && item.revisi_dikirim_pada) {
            html += '<div class="small text-info-emphasis mt-1"><i class="fas fa-paper-plane me-1"></i>Dikirim ulang: ' +
                escapeHtml(formatDateTimeLabel(item.revisi_dikirim_pada)) + '</div>';
        }
        if (item.status === 'pending' && item.riwayat_revisi.length) {
            html += '<div class="small text-muted">Pernah direvisi ' + item.riwayat_revisi.length + '×</div>';
        }
        return html;
    }

    function renderTable() {
        table.clear();
        records.forEach(function(item, index) {
            var attachmentUrl = fileUrl(item.foto_kegiatan);
            var attachment = attachmentUrl
                ? '<a href="' + escapeHtml(attachmentUrl) + '" target="_blank" rel="noopener noreferrer" class="link-lihat-foto text-primary text-decoration-underline fw-medium"><i class="fas fa-image me-1"></i>Lihat Foto</a>'
                : '<span class="text-muted small">Tidak Ada</span>';
            var actions = '<button class="btn btn-sm btn-outline-primary btn-detail-logbook" data-id="' +
                escapeHtml(item.id) + '"><i class="fas fa-eye me-1"></i>Detail</button>';
            if (isPending(item)) {
                actions += ' <button class="btn btn-sm btn-outline-success btn-approve-logbook" data-id="' +
                    escapeHtml(item.id) + '" title="Approve"><i class="fas fa-check"></i></button>' +
                    ' <button class="btn btn-sm btn-outline-warning btn-revisi-logbook" data-id="' +
                    escapeHtml(item.id) + '" title="Minta Revisi"><i class="fas fa-rotate-left"></i></button>' +
                    ' <button class="btn btn-sm btn-outline-danger btn-tolak-logbook" data-id="' +
                    escapeHtml(item.id) + '" title="Tolak Final"><i class="fas fa-ban"></i></button>';
            }
            table.row.add([
                index + 1,
                '<div><strong>' + escapeHtml(item.nama) + '</strong><div class="small text-muted">' + escapeHtml(item.instansi) + '</div></div>',
                '<div><strong>' + escapeHtml(item.tanggal) + '</strong><div class="small text-muted">' +
                    escapeHtml(item.mulai) + ' - ' + escapeHtml(item.selesai) + '</div></div>',
                '<div class="small">' + escapeHtml(item.kegiatan) + '</div>',
                attachment,
                '<div>' + statusBadge(item) + statusMetaHtml(item) + '</div>',
                '<div class="action-buttons text-center">' + actions + '</div>'
            ]);
        });
        table.draw();
        $('#statTotalLogbook').text(records.length);
        $('#statPendingLogbook').text(records.filter(isPending).length);
        $('#statDiverifikasiLogbook').text(records.filter(function(row) { return row.status === 'approved'; }).length);
        $('#statRevisiLogbook').text(records.filter(isWaitingRevision).length);
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

    function submitCorrection(item, action, note, signature) {
        var path;
        var requestOptions;
        var successTitle;
        var fallbackMessage;

        if (action === 'approve') {
            var formData = new FormData();
            formData.append('_method', 'PUT');
            formData.append('status_verifikasi', 'approved');
            if (note) formData.append('catatan_pembimbing', note);
            if (signature) formData.append('paraf_pembimbing', signature, signature.name);
            path = '/koreksi-logbook/' + encodeURIComponent(item.id);
            requestOptions = { method: 'POST', body: formData };
            successTitle = 'Logbook Disetujui';
            fallbackMessage = 'Logbook berhasil disetujui.';
        } else if (action === 'revisi') {
            path = '/pembimbing/logbook/' + encodeURIComponent(item.id) + '/minta-revisi';
            requestOptions = {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ catatan_pembimbing: note })
            };
            successTitle = 'Permintaan Revisi Terkirim';
            fallbackMessage = 'Permintaan revisi logbook berhasil disimpan.';
        } else {
            path = '/pembimbing/logbook/' + encodeURIComponent(item.id) + '/tolak';
            requestOptions = {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ catatan_pembimbing: note })
            };
            successTitle = 'Logbook Ditolak Final';
            fallbackMessage = 'Logbook ditolak secara final.';
        }

        return window.apiRequest(path, requestOptions).then(function(responseData) {
            return loadLogbook(true).then(function(loaded) {
                Swal.fire({
                    icon: loaded ? 'success' : 'warning',
                    title: loaded ? successTitle : 'Keputusan Tersimpan, Daftar Belum Diperbarui',
                    text: window.apiResponseMessage(responseData, fallbackMessage) +
                        (loaded ? '' : ' Daftar gagal dimuat ulang; silakan tekan tombol muat ulang.')
                });
            });
        }).catch(function(error) {
            Swal.fire('Koreksi Logbook Gagal', error.message, 'error');
        });
    }

    function askApprove(item) {
        Swal.fire({
            title: 'Setujui Logbook?',
            html: '<div class="text-start">' +
                '<label class="form-label" for="catatanLogbook">Catatan Pembimbing (opsional)</label>' +
                '<textarea id="catatanLogbook" name="catatan_pembimbing" class="form-control mb-3" rows="3" placeholder="Catatan atau apresiasi untuk peserta"></textarea>' +
                '<label class="form-label" for="paraf_pembimbing">Paraf Pembimbing (gambar, maks. 5 MB)</label>' +
                '<input id="paraf_pembimbing" name="paraf_pembimbing" type="file" class="form-control" accept="image/*" aria-label="Pilih gambar paraf pembimbing">' +
                '</div>',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Approve',
            cancelButtonText: 'Batal',
            preConfirm: function() {
                var popup = Swal.getPopup();
                var note = popup.querySelector('#catatanLogbook').value.trim();
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
        }).then(function(result) {
            if (!result.isConfirmed) return;
            return submitCorrection(item, 'approve', result.value.note, result.value.signature);
        });
    }

    function askRequestRevision(item) {
        var previous = item.catatan_pembimbing
            ? '<div class="alert alert-light border text-start small mb-3"><strong>Catatan sebelumnya:</strong> ' +
                escapeHtml(item.catatan_pembimbing) + '</div>'
            : '';
        Swal.fire({
            title: 'Minta Revisi Logbook?',
            html: '<div class="text-start">' + previous +
                '<label class="form-label" for="catatanLogbook">Catatan Pembimbing (wajib)</label>' +
                '<textarea id="catatanLogbook" name="catatan_pembimbing" class="form-control" rows="3" placeholder="Jelaskan bagian yang perlu diperbaiki peserta"></textarea>' +
                '</div>',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Kirim Catatan Revisi',
            cancelButtonText: 'Batal',
            preConfirm: function() {
                var note = Swal.getPopup().querySelector('#catatanLogbook').value.trim();
                if (!note) {
                    Swal.showValidationMessage('Catatan Pembimbing wajib diisi.');
                    return false;
                }
                return note;
            }
        }).then(function(result) {
            if (!result.isConfirmed) return;
            return submitCorrection(item, 'revisi', result.value);
        });
    }

    function askRejectFinal(item) {
        Swal.fire({
            title: 'Tolak Final Logbook?',
            html: '<div class="text-start">' +
                '<p class="small text-danger mb-3">Penolakan final bersifat permanen. Peserta tidak dapat memperbaiki atau mengirim ulang logbook ini.</p>' +
                '<label class="form-label" for="catatanLogbook">Catatan Pembimbing (wajib)</label>' +
                '<textarea id="catatanLogbook" name="catatan_pembimbing" class="form-control" rows="3" placeholder="Alasan penolakan final"></textarea>' +
                '</div>',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'Tolak Final',
            cancelButtonText: 'Batal',
            preConfirm: function() {
                var note = Swal.getPopup().querySelector('#catatanLogbook').value.trim();
                if (!note) {
                    Swal.showValidationMessage('Catatan Pembimbing wajib diisi.');
                    return false;
                }
                return note;
            }
        }).then(function(result) {
            if (!result.isConfirmed) return;
            return submitCorrection(item, 'tolak', result.value);
        });
    }

    function renderRiwayatRevisi(riwayat) {
        if (!riwayat || !riwayat.length) return '';
        var items = riwayat.map(function(entry, index) {
            var diminta = formatDateTimeLabel(entry.diminta_pada) || '-';
            var dikirim = entry.dikirim_pada ? formatDateTimeLabel(entry.dikirim_pada) : 'Belum dikirim ulang';
            return '<div class="border-start border-3 border-warning ps-3 mb-3">' +
                '<div class="small fw-semibold">Revisi #' + (index + 1) + ' &middot; ' +
                    escapeHtml(entry.pembimbing_nama || 'Pembimbing') + '</div>' +
                '<div class="small mb-1">' + escapeHtml(entry.catatan || '-') + '</div>' +
                '<div class="small text-muted">Diminta: ' + escapeHtml(diminta) + '</div>' +
                '<div class="small text-muted">Dikirim ulang: ' + escapeHtml(dikirim) + '</div>' +
                '</div>';
        }).join('');
        return '<div class="mb-3"><strong>Riwayat Revisi:</strong><div class="mt-2">' + items + '</div></div>';
    }

    function openDetail(item) {
        currentId = item.id;
        var attachmentUrl = fileUrl(item.foto_kegiatan);
        var revisionInfo = '';
        if (isWaitingRevision(item)) {
            revisionInfo = '<div class="alert alert-warning py-2 small"><i class="fas fa-rotate-left me-1"></i>' +
                '<strong>Menunggu peserta mengirim ulang revisi.</strong> Logbook dapat diperiksa kembali setelah revisi dikirim.</div>';
        } else if (item.status === 'pending' && item.revisi_dikirim_pada) {
            revisionInfo = '<div class="alert alert-info py-2 small"><i class="fas fa-paper-plane me-1"></i>' +
                'Peserta mengirim ulang revisi pada ' + escapeHtml(formatDateTimeLabel(item.revisi_dikirim_pada)) +
                '. Mohon periksa hasil revisi.</div>';
        }
        $('#contentModalLogbook').html(
            '<div class="mb-3"><strong>Peserta:</strong> ' + escapeHtml(item.nama) + ' (' + escapeHtml(item.instansi) + ')</div>' +
            '<div class="mb-3"><strong>Waktu:</strong> ' + escapeHtml(item.tanggal) + ' ' + escapeHtml(item.mulai) + '–' + escapeHtml(item.selesai) + '</div>' +
            '<div class="mb-3"><strong>Status:</strong> ' + statusBadge(item) + '</div>' +
            revisionInfo +
            '<div class="mb-3"><strong>Kegiatan:</strong><div class="p-3 bg-light rounded">' + escapeHtml(item.kegiatan) + '</div></div>' +
            '<div class="mb-3"><strong>Foto Kegiatan:</strong> ' +
                (attachmentUrl ? '<a href="' + escapeHtml(attachmentUrl) + '" target="_blank" rel="noopener noreferrer" class="link-lihat-foto text-primary text-decoration-underline fw-medium">Lihat Foto</a>' : '<span class="text-muted">Tidak Ada</span>') +
            '</div>' +
            '<div class="mb-3"><strong>Catatan Pembimbing:</strong> ' + escapeHtml(item.catatan_pembimbing || '-') + '</div>' +
            renderRiwayatRevisi(item.riwayat_revisi)
        );
        var canAct = isPending(item);
        $('#btnParafLogbookModal, #btnMintaRevisiLogbookModal, #btnTolakLogbookModal').toggle(canAct);
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalVerifLogbook')).show();
    }

    function currentItem() {
        return records.find(function(row) { return String(row.id) === String(currentId); });
    }

    $('#filterPesertaLogbook').on('change', function() { table.column(1).search($(this).val()).draw(); });
    $.fn.dataTable.ext.search.push(function(settings, searchData, dataIndex) {
        if (!settings.nTable || settings.nTable.id !== 'tabelVerifLogbook') return true;
        if (!statusFilter) return true;
        var item = records[dataIndex];
        if (!item) return true;
        if (statusFilter === 'revisi') return isWaitingRevision(item);
        if (statusFilter === 'pending') return isPending(item);
        return item.status === statusFilter;
    });
    $('#filterStatusVerifLogbook').on('change', function() {
        statusFilter = $(this).val();
        table.draw();
    });
    $('#btnResetFilterLogbook').on('click', function() {
        statusFilter = '';
        $('#filterPesertaLogbook, #filterStatusVerifLogbook').val('');
        table.search('').columns().search('').draw();
    });
    $('#btnReloadTable').on('click', loadLogbook);

    $(document).on('click', '.btn-detail-logbook, .btn-approve-logbook, .btn-revisi-logbook, .btn-tolak-logbook', function() {
        var item = records.find(function(row) { return String(row.id) === String($(this).data('id')); }.bind(this));
        if (!item) return;
        if ($(this).hasClass('btn-approve-logbook')) return askApprove(item);
        if ($(this).hasClass('btn-revisi-logbook')) return askRequestRevision(item);
        if ($(this).hasClass('btn-tolak-logbook')) return askRejectFinal(item);
        return openDetail(item);
    });

    $('#btnParafLogbookModal').on('click', function() {
        var item = currentItem();
        bootstrap.Modal.getInstance(document.getElementById('modalVerifLogbook')).hide();
        if (item) askApprove(item);
    });
    $('#btnMintaRevisiLogbookModal').on('click', function() {
        var item = currentItem();
        bootstrap.Modal.getInstance(document.getElementById('modalVerifLogbook')).hide();
        if (item) askRequestRevision(item);
    });
    $('#btnTolakLogbookModal').on('click', function() {
        var item = currentItem();
        bootstrap.Modal.getInstance(document.getElementById('modalVerifLogbook')).hide();
        if (item) askRejectFinal(item);
    });

    loadLogbook();
});
