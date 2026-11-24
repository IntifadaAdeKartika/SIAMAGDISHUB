/* peserta-logbook.js
   Pengisian dan pengelolaan logbook peserta magang.
 */

$(document).ready(function() {
    var user;
    try {
        user = JSON.parse(localStorage.getItem('user') || localStorage.getItem('siamag_user') || 'null');
    } catch (error) {
        user = null;
    }

    function loadTodayAttendance() {
        var token = localStorage.getItem('token') || localStorage.getItem('siamag_token') || '';
        return fetch(apiUrl('/absensi/today'), {
            headers: {
                Accept: 'application/json',
                Authorization: 'Bearer ' + token
            },
            cache: 'no-store'
        }).then(readResponse).then(function(responseData) {
            var data = window.apiResponseData(responseData);
            if (data && typeof data.has_checked_in === 'undefined' && data.data && typeof data.data === 'object') {
                data = data.data;
            }
            if (!data || typeof data.has_checked_in === 'undefined') {
                throw new Error('Format status absensi hari ini dari server tidak valid.');
            }
            var hasCheckedIn = data.has_checked_in === true || data.has_checked_in === 1 ||
                String(data.has_checked_in).toLowerCase() === 'true';
            var checkIn = hasCheckedIn ? data.check_in : null;
            $('#idAbsensiLogbook').val(checkIn ? checkIn.id : '');
            $('#idAbsensiLogbook').data('tanggal', checkIn ? String(checkIn.tanggal_jam || '').slice(0, 10) : '');
            $('#absensiLogbookNotice').toggle(!checkIn);
            return Boolean(checkIn);
        }).catch(function(error) {
            $('#idAbsensiLogbook').val('');
            $('#idAbsensiLogbook').removeData('tanggal');
            $('#absensiLogbookNotice').removeClass('alert-info').addClass('alert-warning')
                .text('Data absensi untuk mengaitkan logbook gagal dimuat: ' + error.message).show();
            return false;
        });
    }
    var p = user && (user.peserta_magang || user.peserta || user.profile || {});
    var displayName = user && (user.nama_lengkap || p.nama_lengkap || user.nama || p.nama || user.name || p.name) ||
        'Pengguna';
    var initialMatch = String(displayName).match(/[a-zA-Z]/);
    var initial = initialMatch ? initialMatch[0].toUpperCase() : 'P';
    var dataLogbook = [];

    $('#userName').text(displayName);
    $('#userRole').text('Peserta Magang');
    $('#userInitial').text(initial);

    var table = $('#tabelLogbook').DataTable({
        language: {
            search: 'Cari Logbook:',
            lengthMenu: 'Tampilkan _MENU_ data',
            zeroRecords: 'Belum ada data',
            info: 'Menampilkan _START_ sampai _END_ dari _TOTAL_ logbook',
            infoEmpty: 'Menampilkan 0 data',
            infoFiltered: '(disaring dari _MAX_ total data)',
            paginate: { first: 'Awal', last: 'Akhir', next: 'Berikutnya', previous: 'Sebelumnya' }
        },
        order: [[1, 'desc']],
        columnDefs: [{ orderable: false, targets: [5] }]
    });

    function apiUrl(path) {
        if (typeof window.apiUrl === 'function') return window.apiUrl(path);
        var base = (window.API_BASE || 'https://siamagdishub-backend.vercel.app/backend-api').replace(/\/+$/, '');
        var cleanPath = String(path || '').replace(/^\/+/, '');
        return cleanPath ? base + '/' + cleanPath : base;
    }

    function fileUrl(path) {
        if (!path) return '';
        if (typeof path === 'string') {
            var trimmed = path.trim();
            if (/^data:image\//i.test(trimmed) || /^blob:/i.test(trimmed)) {
                return trimmed;
            }
        }
        try {
            var base = new URL(apiUrl('/'));
            var url = /^https?:/i.test(path)
                ? new URL(path)
                : new URL(String(path).replace(/^\//, ''), base.origin + '/');
            return (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'data:' || url.protocol === 'blob:') ? url.href : '';
        } catch (error) {
            return typeof path === 'string' && /^data:image\//i.test(path.trim()) ? path.trim() : '';
        }
    }

    function parafImage(path, style) {
        var url = fileUrl(path);
        return url
            ? '<img src="' + escapeHtml(url) + '" style="' + style + '" alt="Paraf pembimbing">'
            : '-';
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

    function formatTimeHI(value) {
        if (!value) return '';
        var str = String(value).trim();
        if (!str) return '';
        if (str.indexOf('T') !== -1 || str.indexOf(' ') !== -1) {
            str = str.split(/[T ]/)[1] || str;
        }
        var match = str.match(/^(\d{1,2}):(\d{2})/);
        if (match) {
            var h = match[1].padStart(2, '0');
            var m = match[2];
            return h + ':' + m;
        }
        return str.slice(0, 5);
    }

    function normalizeLogbook(item) {
        var status = String(item.status_verifikasi || item.status || 'pending').toLowerCase();
        var photo = item.foto_kegiatan_url || item.url_foto_kegiatan || item.foto_kegiatan || item.file_lampiran || item.lampiran || '';
        return {
            id: item.id,
            tanggal: item.tanggal || '',
            waktu_mulai: formatTimeHI(item.waktu_mulai || item.jam_mulai),
            waktu_selesai: formatTimeHI(item.waktu_selesai || item.jam_selesai),
            deskripsi_kegiatan: item.deskripsi_kegiatan || item.kegiatan || '',
            file_lampiran: photo,
            foto_kegiatan: item.foto_kegiatan || photo,
            foto_kegiatan_url: item.foto_kegiatan_url || photo,
            id_absensi: item.id_absensi || '',
            status_verifikasi: status,
            catatan_pembimbing: item.catatan_pembimbing != null ? item.catatan_pembimbing : (item.catatan || ''),
            pembimbing: item.pembimbing || item.nama_pembimbing || '',
            paraf_pembimbing: item.paraf_pembimbing_url || item.paraf_pembimbing || ''
        };
    }

    function statusLabel(status) {
        return {
            pending: 'Pending',
            approved: 'Approved',
            rejected: 'Rejected'
        }[String(status || '').toLowerCase()] || status || '-';
    }

    function updateStats() {
        $('#statTotalLogbook').text(dataLogbook.length);
        $('#statDiverifikasi').text(dataLogbook.filter(function(item) {
            return item.status_verifikasi === 'approved';
        }).length);
        $('#statMenunggu').text(dataLogbook.filter(function(item) {
            return item.status_verifikasi === 'pending';
        }).length);
        $('#statDitolak').text(dataLogbook.filter(function(item) {
            return item.status_verifikasi === 'rejected';
        }).length);
    }

    function renderTable() {
        table.clear();
        dataLogbook.forEach(function(item, index) {
            var status = item.status_verifikasi;
            var badge = status === 'approved'
                ? '<span class="badge badge-approved"><i class="fas fa-check-circle me-1"></i>' + statusLabel(status) + '</span>'
                : status === 'pending'
                    ? '<span class="badge badge-pending"><i class="fas fa-clock me-1"></i>' + statusLabel(status) + '</span>'
                    : status === 'rejected'
                        ? '<span class="badge badge-rejected"><i class="fas fa-times-circle me-1"></i>' + statusLabel(status) + '</span>'
                        : '<span class="badge bg-secondary">' + escapeHtml(statusLabel(status)) + '</span>';
            var paraf = parafImage(item.paraf_pembimbing, 'height: 30px;');
            var info = status === 'approved'
                ? '<div class="small text-success mt-1">Paraf:<br>' + paraf + '</div>'
                : status === 'pending'
                    ? '<div class="small text-muted mt-1">Paraf:<br>' + paraf +
                        '</div><div class="small text-muted mt-1">Belum diparaf</div>'
                    : '<div class="small text-danger mt-1">Paraf:<br>' + paraf +
                        '</div><div class="small text-danger mt-1"><i class="fas fa-comment-dots me-1"></i>Ada catatan</div>';
                        var attachmentUrl = fileUrl(item.file_lampiran);
            var attachment = attachmentUrl
                ? '<a href="' + escapeHtml(attachmentUrl) + '" target="_blank" rel="noopener noreferrer" class="link-lihat-foto text-primary text-decoration-underline fw-medium">Lihat Foto</a>'
                : '<span class="text-muted small">Tidak Ada</span>';
            var editButton = status !== 'approved'
                ? '<button class="btn btn-sm btn-outline-secondary btn-aksi btn-edit-logbook" data-id="' +
                    escapeHtml(item.id) + '" title="Edit / Revisi"><i class="fas fa-edit"></i></button>'
                : '';

            table.row.add([
                index + 1,
                '<div><strong>' + escapeHtml(item.tanggal) + '</strong><div class="small text-muted">' +
                    escapeHtml(item.waktu_mulai) + ' - ' + escapeHtml(item.waktu_selesai) + '</div></div>',
                '<div class="small">' + escapeHtml(item.deskripsi_kegiatan) + '</div>',
                attachment,
                '<div>' + badge + info + '</div>',
                '<div class="action-buttons text-center"><button class="btn btn-sm btn-outline-primary btn-aksi btn-detail-logbook" data-id="' +
                    escapeHtml(item.id) + '"><i class="fas fa-eye me-1"></i>Detail</button> ' + editButton + '</div>'
            ]);
        });
        table.draw();
        updateStats();
    }

    function loadLogbook(silent) {
        $('#btnReloadTable').prop('disabled', true);
        window.apiSetTableState(table, 'loading');
        return window.apiRequestAll('/logbook', ['logbook', 'logbooks']).then(function(rows) {
                dataLogbook = rows.map(normalizeLogbook);
                renderTable();
                window.apiSetTableState(table, 'loaded');
                return true;
            }).catch(function(error) {
                window.apiSetTableState(table, 'error');
                if (!silent) Swal.fire('Gagal Memuat Logbook', error.message, 'error');
                return false;
            }).then(function(loaded) {
                $('#btnReloadTable').prop('disabled', false);
                return loaded;
            });
    }

    $('#filterStatusLogbook').on('change', function() {
        table.column(4).search($(this).val()).draw();
    });
    $('#filterKeywordLogbook').on('keyup', function() {
        table.search($(this).val()).draw();
    });
    $('#btnResetFilterLogbook').on('click', function() {
        $('#filterStatusLogbook, #filterKeywordLogbook').val('');
        table.search('').columns().search('').draw();
    });
    $('#btnReloadTable').on('click', loadLogbook);

    var currentLogbookPhoto = '';
    var currentObjectUrl = null;

    function showExistingPhotoPreview(photo) {
        if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl);
            currentObjectUrl = null;
        }
        $('#btnBatalPilihFoto').hide();
        $('#previewFotoLabel').text('Foto Kegiatan Saat Ini');
        $('#previewFotoContainer').show();
        $('#previewFotoError').hide();

        var url = fileUrl(photo);
        if (url) {
            $('#previewFotoEmpty').hide();
            $('#previewFotoImg').attr('src', url).show();
        } else {
            $('#previewFotoImg').hide().attr('src', '');
            $('#previewFotoEmpty').show();
        }
    }

    $('#fotoKegiatan').on('change', function() {
        var file = this.files && this.files[0];
        if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl);
            currentObjectUrl = null;
        }
        $('#previewFotoError').hide();

        if (file) {
            currentObjectUrl = URL.createObjectURL(file);
            $('#previewFotoLabel').text('Foto Kegiatan Baru');
            $('#previewFotoEmpty').hide();
            $('#previewFotoImg').attr('src', currentObjectUrl).show();
            $('#previewFotoContainer').show();
            $('#btnBatalPilihFoto').show();
        } else {
            $('#btnBatalPilihFoto').hide();
            var id = $('#logbookId').val();
            if (id) {
                showExistingPhotoPreview(currentLogbookPhoto);
            } else {
                $('#previewFotoContainer').hide();
                $('#previewFotoImg').hide().attr('src', '');
            }
        }
    });

    $('#btnBatalPilihFoto').on('click', function(e) {
        e.preventDefault();
        $('#fotoKegiatan').val('');
        $('#fotoKegiatan').trigger('change');
    });

    $('#previewFotoImg').on('error', function() {
        $(this).hide();
        $('#previewFotoEmpty').hide();
        $('#previewFotoError').show();
    });

    $('#previewFotoImg').on('load', function() {
        $('#previewFotoError').hide();
    });

    $('#modalLogbook').on('hidden.bs.modal', function() {
        if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl);
            currentObjectUrl = null;
        }
        currentLogbookPhoto = '';
        $('#fotoKegiatan').val('');
        $('#previewFotoImg').attr('src', '').hide();
        $('#previewFotoContainer').hide();
        $('#btnBatalPilihFoto').hide();
        $('#previewFotoError').hide();
        $('#previewFotoEmpty').hide();
    });

    $('#btnTambahLogbook').on('click', function() {
        $('#formLogbook')[0].reset();
        $('#logbookId').val('');
        $('#idAbsensiLogbook').val('');
        $('#idAbsensiLogbook').removeData('tanggal');
        loadTodayAttendance();
        $('#tglLogbook').val(new Date().toISOString().split('T')[0]);
        $('#waktuMulai').val('08:00');
        $('#waktuSelesai').val('15:00');
        $('#modalLogbookTitle').html('<i class="fas fa-edit me-2"></i>Isi Logbook Kegiatan Hari Ini');

        currentLogbookPhoto = '';
        if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl);
            currentObjectUrl = null;
        }
        $('#fotoKegiatan').val('');
        $('#btnBatalPilihFoto').hide();
        $('#previewFotoError').hide();
        $('#previewFotoEmpty').hide();
        $('#previewFotoImg').hide().attr('src', '');
        $('#previewFotoContainer').hide();

        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalLogbook')).show();
    });

    $('#formLogbook').on('submit', function(event) {
        event.preventDefault();
        var id = $('#logbookId').val();
        var waktuMulai = formatTimeHI($('#waktuMulai').val());
        var waktuSelesai = formatTimeHI($('#waktuSelesai').val());
        if (waktuMulai >= waktuSelesai) {
            Swal.fire('Validasi Waktu', 'Waktu selesai harus lebih besar dari waktu mulai kegiatan.', 'warning');
            return;
        }

        var payload = {
            id_absensi: $('#idAbsensiLogbook').val(),
            tanggal: $('#tglLogbook').val(),
            jam_mulai: waktuMulai,
            jam_selesai: waktuSelesai,
            kegiatan: $('#deskripsiKegiatan').val().trim()
        };

        // Pastikan format jam_mulai dan jam_selesai sesuai H:i (HH:mm)
        console.log('jam_mulai:', payload.jam_mulai);
        console.log('jam_selesai:', payload.jam_selesai);

        if (!payload.id_absensi) {
            Swal.fire('Absensi Belum Tersedia', 'Logbook harus terhubung ke record absensi pada hari yang sama. Lakukan check-in terlebih dahulu.', 'warning');
            return;
        }
        if ($('#idAbsensiLogbook').data('tanggal') !== payload.tanggal) {
            Swal.fire('Tanggal Absensi Tidak Cocok', 'Logbook harus menggunakan tanggal yang sama dengan event absensi masuk yang ditautkan.', 'warning');
            return;
        }
        var fotoKegiatan = $('#fotoKegiatan')[0].files[0];
        var body;
        var method;
        var headers = {};

        if (fotoKegiatan) {
            body = new FormData();
            Object.keys(payload).forEach(function(key) { body.append(key, payload[key]); });
            body.append('foto_kegiatan', fotoKegiatan, fotoKegiatan.name);
            if (id) {
                body.append('_method', 'PUT');
                method = 'POST';
                headers['X-HTTP-Method-Override'] = 'PUT';
            } else {
                method = 'POST';
            }
            headers['Accept'] = 'application/json';
        } else {
            body = JSON.stringify(payload);
            method = id ? 'PUT' : 'POST';
            headers['Content-Type'] = 'application/json';
            headers['Accept'] = 'application/json';
        }
        var $submit = $('#formLogbook button[type="submit"]');
        $submit.prop('disabled', true);

        var token = localStorage.getItem('token') || localStorage.getItem('siamag_token') || '';
        headers['Authorization'] = 'Bearer ' + token;

        fetch(apiUrl(id ? '/logbook/' + encodeURIComponent(id) : '/logbook'), {
            method: method,
            headers: headers,
            body: body
        }).then(readResponse).then(function(responseData) {
            var modal = bootstrap.Modal.getInstance(document.getElementById('modalLogbook'));
            if (modal) modal.hide();
            return loadLogbook(true).then(function(loaded) {
                if (!loaded) {
                    Swal.fire({
                        icon: 'warning',
                        title: id ? 'Logbook Diperbarui' : 'Logbook Tersimpan',
                        text: window.apiResponseMessage(responseData, 'Logbook berhasil disimpan.') +
                            ' Daftar gagal dimuat ulang; silakan tekan tombol muat ulang.'
                    });
                    return;
                }
                Swal.fire({
                    icon: 'success',
                    title: id ? 'Logbook Diperbarui' : 'Logbook Terkirim',
                    text: window.apiResponseMessage(responseData, 'Logbook berhasil disimpan dan menunggu verifikasi.')
                });
            });
        }).catch(function(error) {
            Swal.fire('Logbook Gagal Disimpan', error.message, 'error');
        }).then(function() {
            $submit.prop('disabled', false);
        });
    });

    $(document).on('click', '.btn-edit-logbook, .btn-detail-logbook', function() {
        var item = dataLogbook.find(function(row) {
            return String(row.id) === String($(this).data('id'));
        }.bind(this));
        if (!item) return;

        if ($(this).hasClass('btn-edit-logbook')) {
            if (item.status_verifikasi === 'approved') {
                Swal.fire('Logbook Terkunci', 'Logbook yang sudah diverifikasi tidak dapat diedit.', 'info');
                return;
            }
            $('#logbookId').val(item.id);
            $('#idAbsensiLogbook').val(item.id_absensi);
            $('#idAbsensiLogbook').data('tanggal', item.tanggal);
            $('#tglLogbook').val(item.tanggal);
            $('#waktuMulai').val(formatTimeHI(item.waktu_mulai));
            $('#waktuSelesai').val(formatTimeHI(item.waktu_selesai));
            $('#deskripsiKegiatan').val(item.deskripsi_kegiatan);
            $('#fotoKegiatan').val('');
            $('#modalLogbookTitle').html('<i class="fas fa-edit me-2"></i>Edit / Revisi Logbook');

            var existingPhoto = item.foto_kegiatan_url || item.foto_kegiatan || item.file_lampiran || '';
            currentLogbookPhoto = existingPhoto;
            showExistingPhotoPreview(existingPhoto);

            bootstrap.Modal.getOrCreateInstance(document.getElementById('modalLogbook')).show();
            return;
        }

        var attachmentUrl = fileUrl(item.file_lampiran);
        var attachment = attachmentUrl
            ? '<a href="' + escapeHtml(attachmentUrl) + '" target="_blank" rel="noopener">Lihat foto kegiatan</a>'
            : '<span class="text-muted">Tidak ada foto kegiatan</span>';
        var paraf = parafImage(item.paraf_pembimbing, 'max-height: 100px;');
        var catatanPembimbing = item.catatan_pembimbing == null || item.catatan_pembimbing === ''
            ? '-' : item.catatan_pembimbing;
        $('#contentDetailLogbook').html(
            '<div class="mb-3"><strong>Tanggal & Waktu:</strong> ' + escapeHtml(item.tanggal) + ' (' +
            escapeHtml(item.waktu_mulai) + ' - ' + escapeHtml(item.waktu_selesai) + ')</div>' +
            '<div class="mb-3"><strong>Status:</strong> ' + escapeHtml(statusLabel(item.status_verifikasi)) + '</div>' +
            '<div class="mb-3"><strong>Deskripsi Kegiatan:</strong><div class="p-3 bg-light rounded">' +
            escapeHtml(item.deskripsi_kegiatan) + '</div></div>' +
            '<div class="mb-3"><strong>Foto Kegiatan:</strong> ' + attachment + '</div>' +
            '<div class="mb-3"><strong>Catatan Pembimbing:</strong> ' +
            escapeHtml(catatanPembimbing) + '</div>' +
            '<div class="mb-3"><strong>Paraf Pembimbing:</strong><br>' + paraf + '</div>'
        );
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalDetailLogbook')).show();
    });

    loadTodayAttendance();
    loadLogbook();
});

    // Handler foto dipusatkan di app.js — blok duplikat dihapus.
