/* peserta-izin.js
   Pengajuan izin dan sakit peserta magang.
*/

$(document).ready(function() {
    var user;
    try {
        user = JSON.parse(localStorage.getItem('user') || localStorage.getItem('siamag_user') || 'null');
    } catch (error) {
        user = null;
    }
    var p = user && (user.peserta_magang || user.peserta || user.profile || {});
    var displayName = user && (user.nama_lengkap || p.nama_lengkap || user.nama || p.nama || user.name || p.name) ||
        'Pengguna';
    var initialMatch = String(displayName).match(/[a-zA-Z]/);
    var initial = initialMatch ? initialMatch[0].toUpperCase() : 'P';
    var dataIzin = [];
    var editingIzinId = null;

    function namaPembimbingLapangan() {
        var participant = user && (user.peserta_magang || user.peserta || user.profile) || {};
        var unit = participant.unit_kerja || {};
        var mentor = unit.pembimbing || {};
        var account = mentor.pengguna || {};
        return account.nama_lengkap || 'Belum ditentukan';
    }

    function setPembimbingLapangan() {
        $('#pembimbingIzin').val(namaPembimbingLapangan());
    }

    $('#userName').text(displayName);
    $('#userRole').text('Peserta Magang');
    $('#userInitial').text(initial);
    setPembimbingLapangan();

    var table = $('#tabelIzin').DataTable({
        language: {
            search: 'Cari Izin:',
            lengthMenu: 'Tampilkan _MENU_ data',
            zeroRecords: 'Belum ada data',
            info: 'Menampilkan _START_ sampai _END_ dari _TOTAL_ permohonan',
            infoEmpty: 'Menampilkan 0 data',
            infoFiltered: '(disaring dari _MAX_ total data)',
            paginate: { first: 'Awal', last: 'Akhir', next: 'Berikutnya', previous: 'Sebelumnya' }
        },
        order: [[2, 'desc']],
        columnDefs: [{ orderable: false, targets: [5, 7] }]
    });

    function apiUrl(path) {
        if (typeof window.apiUrl === 'function') return window.apiUrl(path);
        var base = (window.API_BASE || 'https://siamagdishub-backend.vercel.app/backend-api').replace(/\/+$/, '');
        var cleanPath = String(path || '').replace(/^\/+/, '');
        return cleanPath ? base + '/' + cleanPath : base;
    }

function fileUrl(path) {
    if (!path) return '';

    var value = String(path).trim();

    // Mendukung lampiran Base64 dari backend.
    if (/^data:(application\/pdf|image\/jpeg|image\/png);base64,/i.test(value)) {
        return value;
    }

    try {
        var url = /^https?:/i.test(value)
            ? new URL(value)
            : new URL(
                value.replace(/^\//, ''),
                new URL(apiUrl('/')).origin + '/'
            );

        return url.protocol === 'http:' || url.protocol === 'https:'
            ? url.href
            : '';
    } catch (error) {
        return '';
    }
}

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    function readResponse(response) {
        return response.text().then(function(text) {
            var payload = null;
            if (text) {
                try {
                    payload = JSON.parse(text);
                } catch (error) {
                    if (!response.ok) throw new Error('Permintaan gagal (HTTP ' + response.status + ').');
                    throw new Error('Server mengembalikan respons yang tidak valid.');
                }
            }
            if (!response.ok) {
                throw new Error(window.apiResponseMessage(payload, 'Permintaan gagal (HTTP ' + response.status + ').'));
            }
            if (payload && payload.success === false) {
                throw new Error(window.apiResponseMessage(payload, 'Permintaan gagal.'));
            }
            return payload;
        });
    }

    function normalizeIzin(item) {
        var status = String(item.status || 'pending').toLowerCase();
        var start = item.tanggal_mulai || '';
        var end = item.tanggal_selesai || '';
        var calculatedDuration = start && end
            ? Math.round((new Date(end) - new Date(start)) / 86400000) + 1
            : '';
        return {
            id: item.id,
            jenis: String(item.jenis || 'izin').toLowerCase(),
            tanggal_mulai: start,
            tanggal_selesai: end,
            durasi_hari: item.durasi_hari || item.durasi || calculatedDuration,
            keterangan: item.keterangan || '',
            file_surat: item.file_surat_url || item.file_surat || item.file_surat_izin || item.surat_url || '',
            status: status,
            catatan_pembimbing: item.catatan_pembimbing || item.catatan || ''
        };
    }

    function updateStats() {
        $('#statTotalIzin').text(dataIzin.length);
        $('#statDisetujui').text(dataIzin.filter(function(item) { return item.status === 'approved'; }).length);
        $('#statMenungguIzin').text(dataIzin.filter(function(item) { return item.status === 'pending'; }).length);
        $('#statDitolakIzin').text(dataIzin.filter(function(item) { return item.status === 'rejected'; }).length);
    }

    function renderTable() {
        table.clear();
        dataIzin.forEach(function(item, index) {
            var badgeJenis = item.jenis === 'sakit'
                ? '<span class="badge" style="background:#fce4ec;color:#c62828;">Sakit</span>'
                : '<span class="badge" style="background:#e0f2fe;color:#0369a1;">Izin</span>';
            var badgeStatus = item.status === 'approved'
                ? '<span class="badge badge-approved">Disetujui</span>'
                : item.status === 'pending'
                    ? '<span class="badge badge-pending">Menunggu</span>'
                    : item.status === 'rejected'
                        ? '<span class="badge badge-rejected">Ditolak</span>'
                        : item.status === 'cancelled' || item.status === 'canceled'
                            ? '<span class="badge bg-secondary">Dibatalkan</span>'
                            : '<span class="badge badge-rejected">' + escapeHtml(item.status) + '</span>';
            var period = '<div><strong>' + escapeHtml(item.tanggal_mulai) + '</strong>' +
                (item.tanggal_mulai !== item.tanggal_selesai
                    ? '<br><small class="text-muted">s/d ' + escapeHtml(item.tanggal_selesai) + '</small>'
                    : '') + '</div>';
            var suratUrl = fileUrl(item.file_surat);
            var suratPath = String(item.file_surat || '');
            var suratExt = (suratPath.split('?')[0].split('.').pop() || '').toLowerCase();
            var suratIcon = suratExt === 'pdf'
                ? 'fa-file-pdf text-danger'
                : (['jpg', 'jpeg', 'png', 'webp', 'gif'].indexOf(suratExt) !== -1
                    ? 'fa-file-image text-primary'
                    : 'fa-file-alt text-secondary');
            var surat = suratUrl
                ? '<a href="' + escapeHtml(suratUrl) + '" target="_blank" rel="noopener" class="badge bg-light text-secondary border"><i class="fas ' + suratIcon + ' me-1"></i>Lihat surat</a>'
                : '<span class="text-muted small">Tidak ada</span>';
            var canManage = item.status === 'pending' || item.status === 'rejected';
            var editBtn = canManage
                ? '<button class="btn btn-sm btn-outline-primary btn-aksi btn-edit-izin" data-id="' + escapeHtml(item.id) + '" title="Edit"><i class="fas fa-edit me-1"></i>Edit</button>'
                : '';
            var cancelBtn = canManage
                ? '<button class="btn btn-sm btn-outline-danger btn-aksi btn-cancel-izin" data-id="' + escapeHtml(item.id) + '" title="Batalkan"><i class="fas fa-times me-1"></i>Batal</button>'
                : '';
            var detailBtn = '<button class="btn btn-sm btn-outline-primary btn-aksi btn-detail-izin" data-id="' + escapeHtml(item.id) + '" title="Detail"><i class="fas fa-eye me-1"></i>Detail</button>';
            table.row.add([
                index + 1,
                badgeJenis,
                period,
                '<span class="badge bg-light text-dark border">' + escapeHtml(item.durasi_hari) + ' Hari</span>',
                '<div class="small">' + escapeHtml(item.keterangan) + '</div>',
                surat,
                badgeStatus,
                '<div class="action-buttons text-center">' + editBtn + ' ' + cancelBtn + ' ' + detailBtn + '</div>'
            ]);
        });
        table.draw();
        updateStats();
    }

    function loadIzin(silent) {
        $('#btnReloadTable').prop('disabled', true);
        window.apiSetTableState(table, 'loading');
        return window.apiRequestAll('/pengajuan-izin', ['pengajuan_izin', 'pengajuan_izins']).then(function(rows) {
                dataIzin = rows.map(normalizeIzin);
                renderTable();
                window.apiSetTableState(table, 'loaded');
                return true;
            }).catch(function(error) {
                window.apiSetTableState(table, 'error');
                if (!silent) Swal.fire('Gagal Memuat Pengajuan', error.message, 'error');
                return false;
            }).then(function(loaded) {
                $('#btnReloadTable').prop('disabled', false);
                return loaded;
            });
    }

    function hitungDurasi() {
        var startValue = $('#tglMulaiIzin').val();
        var endValue = $('#tglSelesaiIzin').val();
        if (!startValue || !endValue) {
            $('#infoDurasiIzin').hide();
            return;
        }
        var start = new Date(startValue);
        var end = new Date(endValue);
        if (end < start) {
            $('#infoDurasiIzin').hide();
            return;
        }
        var days = Math.round((end - start) / 86400000) + 1;
        $('#textDurasiHari').text(days + ' Hari');
        $('#infoDurasiIzin').show();
    }

    $('#tglMulaiIzin, #tglSelesaiIzin').on('change', hitungDurasi);
    $('#btnBukaModalIzin').on('click', function() {
        $('#formIzin')[0].reset();
        setPembimbingLapangan();
        editingIzinId = null;
        $('#fileSuratCurrent').hide().empty();
        $('#modalIzinTitle').html('<i class="fas fa-envelope-open-text me-2"></i>Form Pengajuan Izin / Sakit');
        $('#formIzin button[type="submit"]').html('<i class="fas fa-paper-plane me-1"></i> Kirim Pengajuan');
        var today = new Date().toISOString().split('T')[0];
        $('#tglMulaiIzin, #tglSelesaiIzin').val(today);
        hitungDurasi();
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalIzin')).show();
    });

    $('#formIzin').on('submit', function(event) {
        event.preventDefault();
        var startDate = $('#tglMulaiIzin').val();
        var endDate = $('#tglSelesaiIzin').val();
        if (new Date(endDate) < new Date(startDate)) {
            Swal.fire('Validasi Tanggal', 'Tanggal selesai tidak boleh sebelum tanggal mulai.', 'warning');
            return;
        }

        var id = editingIzinId;
        var payload = {
            jenis: $('#jenisIzin').val(),
            tanggal_mulai: startDate,
            tanggal_selesai: endDate,
            keterangan: $('#alasanIzin').val().trim()
        };
        var selectedFile = $('#fileSuratIzin')[0].files[0];
        var body;
        var headers = { Accept: 'application/json' };
        var method = id ? 'PUT' : 'POST';
        if (id && !selectedFile) {
            body = JSON.stringify(payload);
            headers['Content-Type'] = 'application/json';
        } else {
            body = new FormData(this);
            body.set('keterangan', payload.keterangan);
        }
        var $submit = $('#formIzin button[type="submit"]');
        var submitLabel = $submit.html();
        $submit.prop('disabled', true);
        $submit.html('<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Menyimpan...');

        var token = localStorage.getItem('token') || localStorage.getItem('siamag_token') || '';
        headers.Authorization = 'Bearer ' + token;
        fetch(apiUrl(id ? '/pengajuan-izin/' + encodeURIComponent(id) : '/pengajuan-izin'), {
            method: method,
            body: body,
            headers: headers
        }).then(readResponse).then(function(responseData) {
            var modal = bootstrap.Modal.getInstance(document.getElementById('modalIzin'));
            if (modal) modal.hide();
            $('#formIzin')[0].reset();
            setPembimbingLapangan();
            editingIzinId = null;
            $('#fileSuratCurrent').hide().empty();
            return loadIzin(true).then(function(loaded) {
                Swal.fire({
                    icon: loaded ? 'success' : 'warning',
                    title: loaded
                        ? id ? 'Pengajuan Diperbarui' : 'Pengajuan Terkirim'
                        : 'Pengajuan Tersimpan, Daftar Belum Diperbarui',
                    text: window.apiResponseMessage(responseData, 'Pengajuan izin berhasil disimpan.') +
                        (loaded ? '' : ' Daftar gagal dimuat ulang; silakan tekan tombol muat ulang.')
                });
            });
        }).catch(function(error) {
            Swal.fire(id ? 'Pengajuan Gagal Diperbarui' : 'Pengajuan Gagal', error.message, 'error');
        }).then(function() {
            $submit.prop('disabled', false);
            $submit.html(submitLabel);
        });
    });

    $('#filterStatusIzin').on('change', function() {
        table.column(6).search($(this).val()).draw();
    });
    $('#btnResetFilterIzin').on('click', function() {
        $('#filterStatusIzin').val('');
        table.search('').columns().search('').draw();
    });
    $('#btnReloadTable').on('click', loadIzin);

    $(document).on('click', '.btn-edit-izin', function() {
        var item = dataIzin.find(function(row) {
            return String(row.id) === String($(this).data('id'));
        }.bind(this));
        if (!item || (item.status !== 'pending' && item.status !== 'rejected')) return;

        editingIzinId = item.id;
        $('#formIzin')[0].reset();
        setPembimbingLapangan();
        $('#jenisIzin').val(item.jenis);
        $('#tglMulaiIzin').val(item.tanggal_mulai);
        $('#tglSelesaiIzin').val(item.tanggal_selesai);
        $('#alasanIzin').val(item.keterangan);
        $('#fileSuratIzin').val('');

        var suratPath = item.file_surat_url || item.file_surat || '';
        var suratUrl = fileUrl(suratPath);
        var $currentFile = $('#fileSuratCurrent');
        if (!$currentFile.length) {
            $currentFile = $('<div id="fileSuratCurrent" class="mt-2 small" style="display:none;"></div>').insertAfter('#fileSuratIzin');
        }

        if (suratUrl) {
            var fileName = '';
            try {
                var cleanPath = String(suratPath).split('?')[0].split('#')[0];
                fileName = cleanPath.split('/').pop().split('\\').pop() || '';
            } catch (e) {
                fileName = '';
            }
            if (!fileName) {
                fileName = 'surat_izin';
            }

            var ext = (fileName.indexOf('.') !== -1 ? fileName.split('.').pop() : '').toLowerCase();
            var isPdf = ext === 'pdf';
            var isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].indexOf(ext) !== -1;

            var iconHtml = isPdf
                ? '<i class="fas fa-file-pdf text-danger me-1"></i>'
                : (isImage
                    ? '<i class="fas fa-file-image text-primary me-1"></i>'
                    : '<i class="fas fa-file-alt text-secondary me-1"></i>');

            var thumbnailHtml = isImage
                ? '<a href="' + escapeHtml(suratUrl) + '" target="_blank" rel="noopener" class="d-inline-block me-2 flex-shrink-0">' +
                    '<img src="' + escapeHtml(suratUrl) + '" alt="' + escapeHtml(fileName) + '" class="rounded border shadow-sm" style="width: 48px; height: 48px; object-fit: cover;" title="Klik untuk melihat">' +
                  '</a>'
                : '';

            $currentFile.html(
                '<div class="p-2 rounded bg-light border d-flex align-items-center flex-wrap gap-2">' +
                    thumbnailHtml +
                    '<div class="text-truncate" style="max-width: 100%;">' +
                        '<div class="text-muted small">File saat ini:</div>' +
                        '<a href="' + escapeHtml(suratUrl) + '" target="_blank" rel="noopener" class="fw-semibold text-primary text-decoration-none d-inline-flex align-items-center text-truncate">' +
                            iconHtml + '<span>' + escapeHtml(fileName) + '</span>' +
                        '</a>' +
                    '</div>' +
                '</div>'
            ).show();
        } else {
            $currentFile.hide().empty();
        }

        $('#modalIzinTitle').html('<i class="fas fa-edit me-2"></i>Edit Pengajuan Izin / Sakit');
        $('#formIzin button[type="submit"]').html('<i class="fas fa-save me-1"></i>Simpan Perubahan');
        hitungDurasi();
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalIzin')).show();
    });

    $('#modalIzin').on('hidden.bs.modal', function() {
        $('#fileSuratCurrent').hide().empty();
        $('#fileSuratIzin').val('');
    });

    $(document).on('click', '.btn-detail-izin', function() {
        var item = dataIzin.find(function(row) {
            return String(row.id) === String($(this).data('id'));
        }.bind(this));
        if (!item) return;
        var suratUrl = fileUrl(item.file_surat);
        var suratPath = String(item.file_surat || '');
        var suratExt = (suratPath.split('?')[0].split('.').pop() || '').toLowerCase();
        var isImg = ['jpg', 'jpeg', 'png', 'webp', 'gif'].indexOf(suratExt) !== -1;
        var detailIcon = suratExt === 'pdf' ? 'fa-file-pdf text-danger' : (isImg ? 'fa-file-image text-primary' : 'fa-file-alt text-secondary');
        var fileLink = suratUrl
            ? '<a href="' + escapeHtml(suratUrl) + '" target="_blank" rel="noopener"><i class="fas ' + detailIcon + ' me-1"></i>Lihat / Unduh surat</a>' +
              (isImg ? '<div class="mt-2"><img src="' + escapeHtml(suratUrl) + '" class="img-thumbnail" style="max-height: 180px; max-width: 100%;" alt="Lampiran Surat"></div>' : '')
            : '<span class="text-muted">Tidak ada lampiran</span>';
        $('#contentDetailIzin').html(
            '<div class="mb-3"><strong>Jenis:</strong> ' + escapeHtml(item.jenis.toUpperCase()) + '</div>' +
            '<div class="mb-3"><strong>Periode:</strong> ' + escapeHtml(item.tanggal_mulai) + ' s/d ' +
            escapeHtml(item.tanggal_selesai) + ' (' + escapeHtml(item.durasi_hari) + ' hari)</div>' +
            '<div class="mb-3"><strong>Status:</strong> ' + escapeHtml(item.status) + '</div>' +
            '<div class="mb-3"><strong>Keterangan:</strong><div class="p-3 bg-light rounded">' +
            escapeHtml(item.keterangan) + '</div></div>' +
            '<div class="mb-3"><strong>Catatan Pembimbing:</strong> ' +
            escapeHtml(item.catatan_pembimbing || '-') + '</div><div><strong>Lampiran:</strong> ' + fileLink + '</div>'
        );
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalDetailIzin')).show();
    });

    $(document).on('click', '.btn-cancel-izin', function() {
        var id = $(this).data('id');
        var item = dataIzin.find(function(row) {
            return String(row.id) === String(id);
        });
        if (!item || (item.status !== 'pending' && item.status !== 'rejected')) return;

        Swal.fire({
            title: 'Batalkan Pengajuan?',
            text: 'Pengajuan ini akan diubah status menjadi dibatalkan.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Batalkan',
            cancelButtonText: 'Tidak'
        }).then(function(result) {
            if (result.isConfirmed) {
                var token = localStorage.getItem('token') || localStorage.getItem('siamag_token') || '';
                var $button = $('.btn-cancel-izin').filter(function() {
                    return String($(this).data('id')) === String(id);
                });
                $button.prop('disabled', true);
                fetch(apiUrl('/pengajuan-izin/' + encodeURIComponent(id) + '/cancel'), {
                    method: 'PUT',
                    headers: {
                        Accept: 'application/json',
                        Authorization: 'Bearer ' + token
                    }
                })
                .then(readResponse)
                .then(function(responseData) {
                    return loadIzin(true).then(function(loaded) {
                        Swal.fire({
                            icon: loaded ? 'success' : 'warning',
                            title: loaded ? 'Berhasil' : 'Pengajuan Dibatalkan, Daftar Belum Diperbarui',
                            text: window.apiResponseMessage(responseData, 'Pengajuan telah dibatalkan.') +
                                (loaded ? '' : ' Daftar gagal dimuat ulang; silakan tekan tombol muat ulang.')
                        });
                    });
                })
                .catch(function(err) {
                    Swal.fire('Gagal', err.message || 'Tidak dapat membatalkan pengajuan.', 'error');
                }).then(function() {
                    $button.prop('disabled', false);
                });
            }
        });
    });
    loadIzin();
});