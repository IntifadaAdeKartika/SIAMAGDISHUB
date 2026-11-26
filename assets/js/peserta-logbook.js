/* peserta-logbook.js
   Pengisian, revisi, dan pengelolaan logbook peserta magang.
 */

$(document).ready(function() {
    var user;
    try {
        user = JSON.parse(localStorage.getItem('user') || localStorage.getItem('siamag_user') || 'null');
    } catch (error) {
        user = null;
    }

    var todayAttendance = null;
    var attendanceLoaded = false;
    var attendanceFetchFailed = false;
    var attendanceLoadError = '';
    var izinList = [];
    var izinLoaded = false;
    var izinLoadFailed = false;
    var izinLoadPromise = null;
    var logbookCreateAccess = null;

    function localDateString(date) {
        var d = date instanceof Date ? date : new Date();
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    function dateOnlyLocal(value) {
        if (!value) return '';
        var raw = String(value).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
        var date = new Date(raw);
        return isNaN(date.getTime()) ? raw.slice(0, 10) : localDateString(date);
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
            todayAttendance = checkIn
                ? {
                    id: checkIn.id,
                    tanggal: dateOnlyLocal(checkIn.tanggal_jam) || localDateString(),
                    status_verifikasi: checkIn.status_verifikasi || ''
                }
                : null;
            attendanceLoaded = true;
            attendanceFetchFailed = false;
            attendanceLoadError = '';
            return todayAttendance;
        }).catch(function(error) {
            todayAttendance = null;
            attendanceLoaded = true;
            attendanceFetchFailed = true;
            attendanceLoadError = error.message;
            return null;
        });
    }

    function normalizeIzin(item) {
        if (!item || typeof item !== 'object') return null;
        var status = String(item.status || '').toLowerCase();
        var mulai = String(item.tanggal_mulai || '').slice(0, 10);
        var selesai = String(item.tanggal_selesai || '').slice(0, 10);
        if (!status || !mulai || !selesai) return null;
        return {
            id: item.id,
            status: status,
            tanggal_mulai: mulai,
            tanggal_selesai: selesai,
            jenis: item.jenis || '',
            keterangan: item.keterangan || ''
        };
    }

    function loadIzinData(force) {
        if (izinLoadPromise && !force) return izinLoadPromise;
        izinLoadFailed = false;
        izinLoadPromise = window.apiRequestAll('/pengajuan-izin', ['pengajuan_izin', 'pengajuan-izins', 'izin', 'izins'])
            .then(function(rows) {
                izinList = rows.map(normalizeIzin).filter(Boolean);
                izinLoaded = true;
                return izinList;
            })
            .catch(function() {
                izinList = [];
                izinLoaded = true;
                izinLoadFailed = true;
                return [];
            });
        return izinLoadPromise;
    }

    function ensureCreateAccessData() {
        var attendancePromise = attendanceLoaded ? Promise.resolve() : loadTodayAttendance();
        var izinPromise = izinLoaded ? Promise.resolve() : loadIzinData();
        return Promise.all([attendancePromise, izinPromise]);
    }

    function findIzinByStatus(tanggal, status) {
        if (!tanggal) return null;
        return izinList.find(function(item) {
            return item.status === status &&
                item.tanggal_mulai <= tanggal &&
                item.tanggal_selesai >= tanggal;
        }) || null;
    }

    function setIzinNotice(message, variant) {
        var $notice = $('#izinLogbookNotice');
        if (!message) {
            $notice.hide().text('');
            return;
        }
        $notice.removeClass('alert-info alert-warning alert-danger')
            .addClass(variant === 'warning' ? 'alert-warning' : (variant === 'danger' ? 'alert-danger' : 'alert-info'))
            .text(message)
            .show();
    }

    function evaluateCreateAccess() {
        if ($('#logbookId').val()) {
            logbookCreateAccess = null;
            return null;
        }

        var tanggal = String($('#tglLogbook').val() || '').slice(0, 10);
        var today = localDateString();
        var approvedIzin = findIzinByStatus(tanggal, 'approved');
        var pendingIzin = findIzinByStatus(tanggal, 'pending');
        var rejectedIzin = findIzinByStatus(tanggal, 'rejected');
        var hasTodayAttendance = !!(todayAttendance && todayAttendance.tanggal === tanggal);

        if (hasTodayAttendance) {
            $('#idAbsensiLogbook').val(todayAttendance.id);
            $('#idAbsensiLogbook').data('tanggal', todayAttendance.tanggal);
        } else {
            $('#idAbsensiLogbook').val('');
            $('#idAbsensiLogbook').removeData('tanggal');
        }

        if (hasTodayAttendance) {
            $('#absensiLogbookNotice').hide();
            setIzinNotice('');
            logbookCreateAccess = { blocked: false, reason: 'absensi' };
            return logbookCreateAccess;
        }

        if (approvedIzin) {
            $('#absensiLogbookNotice').hide();
            setIzinNotice('Anda memiliki pengajuan izin yang disetujui pada tanggal ini. Anda tetap dapat mencatat kegiatan melalui Logbook.', 'info');
            logbookCreateAccess = { blocked: false, reason: 'izin-approved', izin: approvedIzin };
            return logbookCreateAccess;
        }

        if (izinLoadFailed) {
            $('#absensiLogbookNotice').hide();
            setIzinNotice('Data pengajuan izin gagal dimuat. Logbook tetap dapat dikirim dan akan divalidasi oleh server.', 'warning');
            logbookCreateAccess = { blocked: false, reason: 'izin-error' };
            return logbookCreateAccess;
        }

        if (attendanceFetchFailed) {
            $('#absensiLogbookNotice').hide();
            setIzinNotice('Status absensi hari ini gagal dimuat: ' + attendanceLoadError + ' Logbook tetap dapat dikirim dan akan divalidasi oleh server.', 'warning');
            logbookCreateAccess = { blocked: false, reason: 'absensi-error' };
            return logbookCreateAccess;
        }

        if (tanggal === today) {
            $('#absensiLogbookNotice').hide();
            if (pendingIzin) {
                setIzinNotice('Pengajuan izin pada tanggal ini masih menunggu persetujuan pembimbing sehingga belum dapat digunakan untuk mengisi Logbook.', 'warning');
                logbookCreateAccess = {
                    blocked: true,
                    reason: 'izin-pending',
                    title: 'Izin Belum Disetujui',
                    message: 'Pengajuan izin pada tanggal ini masih menunggu persetujuan. Lakukan check-in atau tunggu persetujuan pembimbing sebelum mengisi Logbook.'
                };
            } else if (rejectedIzin) {
                setIzinNotice('Pengajuan izin pada tanggal ini ditolak sehingga tidak dapat digunakan untuk mengisi Logbook.', 'warning');
                logbookCreateAccess = {
                    blocked: true,
                    reason: 'izin-rejected',
                    title: 'Izin Ditolak',
                    message: 'Pengajuan izin pada tanggal ini ditolak. Lakukan check-in terlebih dahulu untuk mengisi Logbook.'
                };
            } else {
                setIzinNotice('');
                $('#absensiLogbookNotice').show();
                logbookCreateAccess = {
                    blocked: true,
                    reason: 'tanpa-absensi',
                    title: 'Absensi Belum Tersedia',
                    message: 'Logbook harus terhubung ke record absensi pada hari yang sama. Lakukan check-in terlebih dahulu.'
                };
            }
            return logbookCreateAccess;
        }

        $('#absensiLogbookNotice').hide();
        if (pendingIzin) {
            setIzinNotice('Pengajuan izin pada tanggal ini masih menunggu persetujuan dan belum dianggap disetujui. Logbook hanya dapat disimpan jika terdapat absensi masuk yang disetujui pada tanggal tersebut.', 'warning');
        } else if (rejectedIzin) {
            setIzinNotice('Pengajuan izin pada tanggal ini ditolak. Logbook hanya dapat disimpan jika terdapat absensi masuk yang disetujui pada tanggal tersebut.', 'warning');
        } else {
            setIzinNotice('Tidak ada pengajuan izin yang disetujui pada tanggal ini. Logbook hanya dapat disimpan jika terdapat absensi masuk yang disetujui pada tanggal tersebut.', 'warning');
        }
        logbookCreateAccess = { blocked: false, reason: 'validasi-server' };
        return logbookCreateAccess;
    }
    var p = user && (user.peserta_magang || user.peserta || user.profile || {});
    var displayName = user && (user.nama_lengkap || p.nama_lengkap || user.nama || p.nama || user.name || p.name) ||
        'Pengguna';
    var initialMatch = String(displayName).match(/[a-zA-Z]/);
    var initial = initialMatch ? initialMatch[0].toUpperCase() : 'P';
    var dataLogbook = [];
    var currentEditingLogbook = null;
    var statusFilter = '';

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
        columnDefs: [{ orderable: false, targets: [2, 3, 4, 5] }]
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

    function toBoolean(value) {
        return value === true || value === 1 || String(value).toLowerCase() === 'true';
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

    function normalizeLogbook(item) {
        var status = String(item.status_verifikasi || item.status || 'pending').toLowerCase();
        var photo = item.foto_kegiatan_url || item.url_foto_kegiatan || item.foto_kegiatan || item.file_lampiran || item.lampiran || '';
        var riwayat = Array.isArray(item.riwayat_revisi) ? item.riwayat_revisi : [];
        return {
            id: item.id,
            tanggal: item.tanggal || '',
            waktu_mulai: formatTimeHI(item.waktu_mulai || item.jam_mulai),
            waktu_selesai: formatTimeHI(item.waktu_selesai || item.jam_selesai),
            deskripsi_kegiatan: item.deskripsi_kegiatan || item.kegiatan || '',
            file_lampiran: photo,
            foto_kegiatan: item.foto_kegiatan || '',
            foto_kegiatan_url: item.foto_kegiatan_url || photo,
            id_absensi: item.id_absensi || '',
            status_verifikasi: status,
            catatan_pembimbing: item.catatan_pembimbing != null ? item.catatan_pembimbing : (item.catatan || ''),
            pembimbing: item.pembimbing || item.nama_pembimbing || '',
            paraf_pembimbing: item.paraf_pembimbing_url || item.paraf_pembimbing || '',
            revisi_diminta: toBoolean(item.revisi_diminta),
            revisi_diminta_pada: item.revisi_diminta_pada || null,
            revisi_dikirim_pada: item.revisi_dikirim_pada || null,
            riwayat_revisi: riwayat,
            diverifikasi_pada: item.diverifikasi_pada || null
        };
    }

    function needsRevision(item) {
        return item.status_verifikasi === 'pending' && item.revisi_diminta;
    }

    function canEdit(item) {
        return item.status_verifikasi === 'pending';
    }

    function statusLabel(item) {
        if (item.status_verifikasi === 'approved') return 'Approved';
        if (item.status_verifikasi === 'rejected') return 'Rejected';
        return needsRevision(item) ? 'Perlu Revisi' : 'Pending';
    }

    function statusBadge(item) {
        if (item.status_verifikasi === 'approved') {
            return '<span class="badge badge-approved"><i class="fas fa-check-circle me-1"></i>Approved</span>';
        }
        if (item.status_verifikasi === 'rejected') {
            return '<span class="badge badge-rejected"><i class="fas fa-times-circle me-1"></i>Rejected</span>';
        }
        if (needsRevision(item)) {
            return '<span class="badge badge-revisi"><i class="fas fa-rotate-left me-1"></i>Perlu Revisi</span>';
        }
        return '<span class="badge badge-pending"><i class="fas fa-clock me-1"></i>Pending</span>';
    }

    function statusMetaHtml(item) {
        if (item.status_verifikasi === 'approved') {
            return '<div class="small text-success mt-1">Paraf:<br>' +
                parafImage(item.paraf_pembimbing, 'height: 30px;') + '</div>';
        }
        if (item.status_verifikasi === 'rejected') {
            return '<div class="small text-danger mt-1"><i class="fas fa-comment-dots me-1"></i>' +
                escapeHtml(truncate(item.catatan_pembimbing || 'Ditolak final oleh pembimbing', 90)) + '</div>';
        }
        if (needsRevision(item)) {
            var html = '<div class="small text-warning-emphasis mt-1"><i class="fas fa-comment-dots me-1"></i>' +
                escapeHtml(truncate(item.catatan_pembimbing || 'Perbaiki logbook sesuai catatan pembimbing', 90)) + '</div>';
            if (item.revisi_diminta_pada) {
                html += '<div class="small text-muted">Diminta: ' + escapeHtml(formatDateTimeLabel(item.revisi_diminta_pada)) + '</div>';
            }
            return html;
        }
        var pendingHtml = '<div class="small text-muted mt-1"><i class="fas fa-hourglass-half me-1"></i>Menunggu pemeriksaan pembimbing</div>';
        if (item.revisi_dikirim_pada) {
            pendingHtml += '<div class="small text-info-emphasis">Revisi dikirim: ' + escapeHtml(formatDateTimeLabel(item.revisi_dikirim_pada)) + '</div>';
        }
        return pendingHtml;
    }

    function updateStats() {
        $('#statTotalLogbook').text(dataLogbook.length);
        $('#statDiverifikasi').text(dataLogbook.filter(function(item) {
            return item.status_verifikasi === 'approved';
        }).length);
        $('#statMenunggu').text(dataLogbook.filter(function(item) {
            return item.status_verifikasi === 'pending' && !item.revisi_diminta;
        }).length);
        $('#statDitolak').text(dataLogbook.filter(function(item) {
            return needsRevision(item);
        }).length);
    }

    function renderTable() {
        table.clear();
        dataLogbook.forEach(function(item, index) {
            var attachmentUrl = fileUrl(item.file_lampiran);
            var attachment = attachmentUrl
                ? '<a href="' + escapeHtml(attachmentUrl) + '" target="_blank" rel="noopener noreferrer" class="link-lihat-foto text-primary text-decoration-underline fw-medium">Lihat Foto</a>'
                : '<span class="text-muted small">Tidak Ada</span>';
            var editButton = canEdit(item)
                ? '<button class="btn btn-sm btn-outline-secondary btn-aksi btn-edit-logbook" data-id="' +
                    escapeHtml(item.id) + '" title="' + (needsRevision(item) ? 'Perbaiki logbook' : 'Edit logbook') + '"><i class="fas fa-edit"></i></button>'
                : '';

            table.row.add([
                index + 1,
                '<div><strong>' + escapeHtml(item.tanggal) + '</strong><div class="small text-muted">' +
                    escapeHtml(item.waktu_mulai) + ' - ' + escapeHtml(item.waktu_selesai) + '</div></div>',
                '<div class="small">' + escapeHtml(item.deskripsi_kegiatan) + '</div>',
                attachment,
                '<div>' + statusBadge(item) + statusMetaHtml(item) + '</div>',
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

    $.fn.dataTable.ext.search.push(function(settings, searchData, dataIndex) {
        if (!settings.nTable || settings.nTable.id !== 'tabelLogbook') return true;
        if (!statusFilter) return true;
        var item = dataLogbook[dataIndex];
        if (!item) return true;
        if (statusFilter === 'revisi') return needsRevision(item);
        if (statusFilter === 'pending') return item.status_verifikasi === 'pending' && !item.revisi_diminta;
        return item.status_verifikasi === statusFilter;
    });

    $('#filterStatusLogbook').on('change', function() {
        statusFilter = $(this).val();
        table.draw();
    });
    $('#filterKeywordLogbook').on('keyup', function() {
        table.search($(this).val()).draw();
    });
    $('#btnResetFilterLogbook').on('click', function() {
        statusFilter = '';
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

    function resetRevisionNotice() {
        currentEditingLogbook = null;
        $('#catatanRevisiNotice').hide();
        $('#catatanRevisiText').text('');
        $('#catatanRevisiWaktu').text('');
        $('#btnSimpanLogbook').html('<i class="fas fa-save me-1"></i> Simpan Logbook');
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
        $('#izinLogbookNotice').hide().text('');
        $('#absensiLogbookNotice').hide();
        resetRevisionNotice();
    });

    $('#btnTambahLogbook').on('click', function() {
        $('#formLogbook')[0].reset();
        $('#logbookId').val('');
        $('#idAbsensiLogbook').val('');
        $('#idAbsensiLogbook').removeData('tanggal');
        $('#tglLogbook').val(localDateString());
        $('#waktuMulai').val('08:00');
        $('#waktuSelesai').val('15:00');
        $('#modalLogbookTitle').html('<i class="fas fa-edit me-2"></i>Isi Logbook Kegiatan Hari Ini');
        resetRevisionNotice();

        todayAttendance = null;
        attendanceLoaded = false;
        attendanceFetchFailed = false;
        attendanceLoadError = '';
        izinList = [];
        izinLoaded = false;
        izinLoadFailed = false;
        izinLoadPromise = null;
        logbookCreateAccess = null;
        $('#izinLogbookNotice').hide().text('');
        $('#absensiLogbookNotice').hide();

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
        ensureCreateAccessData().then(evaluateCreateAccess);
    });

    $('#tglLogbook').on('change', function() {
        if ($('#logbookId').val()) return;
        ensureCreateAccessData().then(evaluateCreateAccess);
    });

    $('#formLogbook').on('submit', function(event) {
        event.preventDefault();
        var id = $('#logbookId').val();
        var isEdit = !!id;
        var isRevisionSubmit = !!(currentEditingLogbook && needsRevision(currentEditingLogbook));
        var waktuMulai = formatTimeHI($('#waktuMulai').val());
        var waktuSelesai = formatTimeHI($('#waktuSelesai').val());
        if (waktuMulai >= waktuSelesai) {
            Swal.fire('Validasi Waktu', 'Waktu selesai harus lebih besar dari waktu mulai kegiatan.', 'warning');
            return;
        }

        var payload = {
            tanggal: $('#tglLogbook').val(),
            jam_mulai: waktuMulai,
            jam_selesai: waktuSelesai,
            kegiatan: $('#deskripsiKegiatan').val().trim()
        };
        var idAbsensi = $('#idAbsensiLogbook').val();
        if (idAbsensi) {
            payload.id_absensi = idAbsensi;
        }

        function submitLogbookRequest() {
            var fotoKegiatan = $('#fotoKegiatan')[0].files[0];
            var body;
            var method;
            var headers = {};

            if (fotoKegiatan) {
                body = new FormData();
                Object.keys(payload).forEach(function(key) { body.append(key, payload[key]); });
                body.append('foto_kegiatan', fotoKegiatan, fotoKegiatan.name);
                if (isEdit) {
                    body.append('_method', 'PUT');
                    method = 'POST';
                    headers['X-HTTP-Method-Override'] = 'PUT';
                } else {
                    method = 'POST';
                }
                headers['Accept'] = 'application/json';
            } else {
                body = JSON.stringify(payload);
                method = isEdit ? 'PUT' : 'POST';
                headers['Content-Type'] = 'application/json';
                headers['Accept'] = 'application/json';
            }
            var $submit = $('#formLogbook button[type="submit"]');
            $submit.prop('disabled', true);

            var token = localStorage.getItem('token') || localStorage.getItem('siamag_token') || '';
            headers['Authorization'] = 'Bearer ' + token;

            fetch(apiUrl(isEdit ? '/logbook/' + encodeURIComponent(id) : '/logbook'), {
                method: method,
                headers: headers,
                body: body
            }).then(readResponse).then(function(responseData) {
                var modal = bootstrap.Modal.getInstance(document.getElementById('modalLogbook'));
                if (modal) modal.hide();
                return loadLogbook(true).then(function(loaded) {
                    var serverMessage = window.apiResponseMessage(responseData,
                        isRevisionSubmit ? 'Revisi logbook berhasil dikirim.' : 'Logbook berhasil disimpan.');
                    if (!loaded) {
                        Swal.fire({
                            icon: 'warning',
                            title: isRevisionSubmit ? 'Revisi Terkirim' : (isEdit ? 'Logbook Diperbarui' : 'Logbook Tersimpan'),
                            text: serverMessage + ' Daftar gagal dimuat ulang; silakan tekan tombol muat ulang.'
                        });
                        return;
                    }
                    Swal.fire({
                        icon: 'success',
                        title: isRevisionSubmit ? 'Revisi Terkirim' : (isEdit ? 'Logbook Diperbarui' : 'Logbook Terkirim'),
                        text: serverMessage
                    });
                });
            }).catch(function(error) {
                Swal.fire('Logbook Gagal Disimpan', error.message, 'error');
            }).then(function() {
                $submit.prop('disabled', false);
            });
        }

        if (!isEdit) {
            ensureCreateAccessData().then(function() {
                evaluateCreateAccess();
                if (logbookCreateAccess && logbookCreateAccess.blocked) {
                    Swal.fire(logbookCreateAccess.title || 'Logbook Belum Dapat Disimpan', logbookCreateAccess.message, 'warning');
                    return;
                }
                var absensiId = $('#idAbsensiLogbook').val();
                if (absensiId) {
                    payload.id_absensi = absensiId;
                } else {
                    delete payload.id_absensi;
                }
                submitLogbookRequest();
            }).catch(function(error) {
                Swal.fire('Logbook Gagal Disimpan', error.message, 'error');
            });
            return;
        }

        submitLogbookRequest();
    });

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

    $(document).on('click', '.btn-edit-logbook, .btn-detail-logbook', function() {
        var item = dataLogbook.find(function(row) {
            return String(row.id) === String($(this).data('id'));
        }.bind(this));
        if (!item) return;

        if ($(this).hasClass('btn-edit-logbook')) {
            if (!canEdit(item)) {
                Swal.fire('Logbook Terkunci', 'Logbook yang sudah disetujui atau ditolak final tidak dapat diedit.', 'info');
                return;
            }
            currentEditingLogbook = item;
            logbookCreateAccess = null;
            $('#izinLogbookNotice').hide().text('');
            $('#absensiLogbookNotice').hide();
            $('#logbookId').val(item.id);
            $('#idAbsensiLogbook').val(item.id_absensi);
            if (item.id_absensi) {
                $('#idAbsensiLogbook').data('tanggal', item.tanggal);
            } else {
                $('#idAbsensiLogbook').removeData('tanggal');
            }
            $('#tglLogbook').val(item.tanggal);
            $('#waktuMulai').val(formatTimeHI(item.waktu_mulai));
            $('#waktuSelesai').val(formatTimeHI(item.waktu_selesai));
            $('#deskripsiKegiatan').val(item.deskripsi_kegiatan);
            $('#fotoKegiatan').val('');
            $('#modalLogbookTitle').html(needsRevision(item)
                ? '<i class="fas fa-rotate-left me-2"></i>Perbaiki Logbook (Revisi)'
                : '<i class="fas fa-edit me-2"></i>Edit Logbook');

            if (needsRevision(item)) {
                $('#catatanRevisiText').text(item.catatan_pembimbing || '-');
                $('#catatanRevisiWaktu').text(item.revisi_diminta_pada
                    ? 'Diminta pada ' + formatDateTimeLabel(item.revisi_diminta_pada)
                    : '');
                $('#catatanRevisiNotice').show();
                $('#btnSimpanLogbook').html('<i class="fas fa-paper-plane me-1"></i> Kirim Revisi');
            } else {
                $('#catatanRevisiNotice').hide();
                $('#btnSimpanLogbook').html('<i class="fas fa-save me-1"></i> Simpan Perubahan');
            }

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
        var revisionInfo = '';
        if (needsRevision(item)) {
            revisionInfo = '<div class="alert alert-warning py-2 small"><i class="fas fa-rotate-left me-1"></i>' +
                '<strong>Logbook perlu diperbaiki.</strong> Baca catatan pembimbing lalu kirim ulang hasil revisi.</div>';
        } else if (item.status_verifikasi === 'pending' && item.revisi_dikirim_pada) {
            revisionInfo = '<div class="alert alert-info py-2 small"><i class="fas fa-paper-plane me-1"></i>' +
                'Revisi telah dikirim pada ' + escapeHtml(formatDateTimeLabel(item.revisi_dikirim_pada)) +
                ' dan menunggu pemeriksaan pembimbing.</div>';
        }

        $('#contentDetailLogbook').html(
            '<div class="mb-3"><strong>Tanggal & Waktu:</strong> ' + escapeHtml(item.tanggal) + ' (' +
            escapeHtml(item.waktu_mulai) + ' - ' + escapeHtml(item.waktu_selesai) + ')</div>' +
            '<div class="mb-3"><strong>Status:</strong> ' + statusBadge(item) + '</div>' +
            revisionInfo +
            '<div class="mb-3"><strong>Deskripsi Kegiatan:</strong><div class="p-3 bg-light rounded">' +
            escapeHtml(item.deskripsi_kegiatan) + '</div></div>' +
            '<div class="mb-3"><strong>Foto Kegiatan:</strong> ' + attachment + '</div>' +
            '<div class="mb-3"><strong>Catatan Pembimbing:</strong> ' +
            escapeHtml(catatanPembimbing) + '</div>' +
            renderRiwayatRevisi(item.riwayat_revisi) +
            '<div class="mb-3"><strong>Paraf Pembimbing:</strong><br>' + paraf + '</div>'
        );
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalDetailLogbook')).show();
    });

    loadTodayAttendance();
    loadLogbook();
});
