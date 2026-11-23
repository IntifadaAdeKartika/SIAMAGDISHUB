$(document).ready(function() {
    var records = [];
    var table = $('#tabelMonitoringLogbook').DataTable({
        responsive: true,
        language: {
            search: 'Cari Jurnal/Peserta:',
            lengthMenu: 'Tampilkan _MENU_ data',
            zeroRecords: 'Belum ada data',
            info: 'Menampilkan _START_ s/d _END_ dari _TOTAL_ logbook',
            infoEmpty: 'Menampilkan 0 data',
            paginate: { first: 'Awal', last: 'Akhir', next: '→', previous: '←' }
        },
        order: [[1, 'desc']]
    });

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    function participant(item) {
        var person = item.peserta_magang || item.peserta || {};
        var account = person.pengguna || {};
        var placement = person.penempatan || item.penempatan || {};
        var unit = item.unit_kerja || person.unit_kerja || placement.unit_kerja || {};
        var mentor = item.pembimbing || item.pembimbing_lapangan || person.pembimbing ||
            person.pembimbing_lapangan || unit.pembimbing || placement.pembimbing || {};
        var mentorAccount = mentor.pengguna || mentor.user || {};
        return {
            name: item.nama_peserta || account.nama_lengkap || person.nama_lengkap || person.nama || '-',
            nim: item.nim || account.username || person.nim || '-',
            school: item.asal_sekolah_kampus || person.asal_sekolah_kampus || person.instansi || '-',
            unit: item.nama_unit_kerja || unit.nama_unit || unit.nama || '-',
            unitId: item.id_unit_kerja || person.id_unit_kerja || unit.id || '',
            mentor: item.nama_pembimbing || mentor.nama_lengkap || mentor.nama ||
                mentorAccount.nama_lengkap || '-'
        };
    }

    function statusLabel(status) {
        return {
            pending: 'Pending',
            approved: 'Approved',
            rejected: 'Rejected'
        }[String(status || '').toLowerCase()] || status || '-';
    }

    function documentFileUrl(path) {
        var value = String(path || '').trim();
        if (/^https?:\/\//i.test(value)) return value;
        var apiOrigin = String(window.API_BASE || window.location.origin).match(/^(https?:\/\/[^/]+)/i);
        return apiOrigin && value ? apiOrigin[1] + '/' + value.replace(/^\/+/, '') : '';
    }

    function render() {
        var unitFilter = String($('#filterUnit').val() || '');
        var statusFilter = $('#filterStatus').val();
        var visible = records.filter(function(item) {
            var person = participant(item);
            return (!unitFilter || String(person.unitId) === unitFilter) &&
                (!statusFilter || String(item.status_verifikasi || item.status || '').toLowerCase() === statusFilter);
        });
        table.clear();
        visible.forEach(function(item, index) {
            var person = participant(item);
            var status = String(item.status_verifikasi || item.status || 'pending').toLowerCase();
            var badge = status === 'approved' ? 'bg-success' :
                status === 'rejected' ? 'bg-danger' : 'bg-warning text-dark';
            table.row.add([
                index + 1,
                escapeHtml(item.tanggal || '-'),
                '<div class="fw-bold">' + escapeHtml(person.name) + '</div><div class="small text-muted">' +
                    escapeHtml(person.school + ' · ' + person.nim) + '</div>',
                '<div class="small fw-semibold text-primary">' + escapeHtml(person.unit) +
                    '</div><div class="small text-muted">Pembimbing: ' + escapeHtml(person.mentor) + '</div>',
                '<div class="text-truncate" style="max-width:280px" title="' + escapeHtml(item.kegiatan || '') + '">' +
                    escapeHtml(item.kegiatan || '-') + '</div>',
                '<span class="badge ' + badge + '">' + escapeHtml(statusLabel(status)) + '</span>',
                '<button class="btn btn-sm btn-outline-primary btn-detail-log" data-id="' +
                    escapeHtml(item.id || item.id_logbook) + '"><i class="fas fa-eye"></i> Detail</button>'
            ]);
        });
        table.draw();
        $('#statTotalLog').text(records.length);
        $('#statDiverif').text(records.filter(function(row) {
            return String(row.status_verifikasi || row.status).toLowerCase() === 'approved';
        }).length);
        $('#statMenunggu').text(records.filter(function(row) {
            return String(row.status_verifikasi || row.status).toLowerCase() === 'pending';
        }).length);
    }

    function load() {
        $('#btnReloadTable').prop('disabled', true);
        window.apiSetTableState(table, 'loading');
        return window.apiRequestAll('/admin/logbook', ['logbook', 'logbooks']).then(function(rows) {
            records = rows;
            render();
            window.apiSetTableState(table, 'loaded');
            return true;
        }).catch(function(error) {
            window.apiSetTableState(table, 'error');
            Swal.fire('Data Logbook Gagal Dimuat', error.message, 'error');
            return false;
        }).then(function() {
            $('#btnReloadTable').prop('disabled', false);
        });
    }

    function loadUnits() {
        var $filter = $('#filterUnit').prop('disabled', true).empty()
            .append(new Option('Semua Unit Kerja', ''));
        return window.apiRequestAll('/admin/unit-kerja', ['unit_kerja', 'units']).then(function(units) {
            units.forEach(function(unit) {
                var id = unit.id || unit.id_unit_kerja;
                var name = unit.nama_unit || unit.nama_unit_kerja || unit.nama || unit.name;
                if (id != null && name) $filter.append(new Option(name, id));
            });
            $filter.prop('disabled', false).removeAttr('title');
        }).catch(function(error) {
            $filter.prop('disabled', false);
            Swal.fire('Unit Kerja Gagal Dimuat', error.message, 'error');
        });
    }

    $('#filterStatus, #filterUnit').on('change', render);
    $('#btnResetFilter').on('click', function() {
        $('#filterUnit, #filterStatus').val('');
        render();
    });
    $('#btnReloadTable').on('click', load);
    $(document).on('click', '.btn-detail-log', function() {
        var item = records.find(function(row) {
            return String(row.id || row.id_logbook) === String($(this).data('id'));
        }.bind(this));
        if (!item) return;
        var person = participant(item);
        $('#modalNama').text(person.name);
        $('#modalNimInstansi').text(person.nim + ' - ' + person.school);
        $('#modalUnit').text(person.unit);
        $('#modalPembimbing').text('Pembimbing: ' + person.mentor);
        $('#modalTanggal').text((item.tanggal || '-') + ' (' + (item.jam_mulai || '-') + ' - ' + (item.jam_selesai || '-') + ')');
        $('#modalUraian').text(item.kegiatan || '-');
        $('#modalCatatanPembimbing').text(item.catatan_pembimbing == null || item.catatan_pembimbing === ''
            ? '-' : item.catatan_pembimbing);
        $('#modalStatus').text(statusLabel(item.status_verifikasi || item.status));
                var file = item.foto_kegiatan_url || item.url_foto_kegiatan || item.foto_kegiatan;
        if (file) {
            var filePath = typeof file === 'string'
                ? file
                : file.url || file.file_url || file.path || file.file_path || '';
            var fileUrl = documentFileUrl(filePath);
            var fileType = typeof file === 'object' ? String(file.mime_type || file.type || '').toLowerCase() : '';
            var isImage = (fileType.indexOf('image/') === 0) ||
                          /^data:image\//i.test(fileUrl) ||
                          /.(png|jpe?g|gif|webp|bmp|svg)($|\?)/i.test(filePath);
            var isPdf = (fileType === 'application/pdf') ||
                        /^data:application\/pdf/i.test(fileUrl) ||
                        /\.pdf($|\?)/i.test(filePath);

            if (isImage) {
                $('#modalFotoBox').html(
                    '<div class="mb-2 text-center">' +
                        '<img src="' + escapeHtml(fileUrl) + '" alt="Foto kegiatan" class="img-fluid rounded border shadow-sm" style="max-height:260px; object-fit:contain; cursor:pointer;" onclick="window.openImageInNewTab && window.openImageInNewTab(\'' + escapeHtml(fileUrl) + '\', \'Foto Kegiatan\')">' +
                    '</div>' +
                    '<div>' +
                        '<a href="' + escapeHtml(fileUrl) + '" target="_blank" rel="noopener noreferrer" class="link-lihat-foto text-primary text-decoration-underline fw-medium small">' +
                            '<i class="fas fa-external-link-alt me-1"></i>Buka Foto di Tab Baru' +
                        '</a>' +
                    '</div>'
                ).show();
                $('#modalNoFoto').hide();
            } else if (isPdf) {
                $('#modalFotoBox').html(
                    '<i class="fas fa-file-pdf text-danger fa-3x mb-2"></i>' +
                    '<div class="fw-semibold small text-dark mb-2">Dokumen Lampiran (PDF)</div>' +
                    '<a class="btn btn-outline-danger btn-sm link-lihat-foto" href="' + escapeHtml(fileUrl) + '" target="_blank" rel="noopener noreferrer">' +
                        '<i class="fas fa-external-link-alt me-1"></i>Lihat Dokumen PDF' +
                    '</a>'
                ).show();
                $('#modalNoFoto').hide();
            } else {
                var fileName = typeof file === 'string'
                    ? (filePath.startsWith('data:') ? 'Lampiran Dokumentasi' : filePath.split('/').pop())
                    : file.name || file.filename || 'Lampiran kegiatan';
                $('#modalFotoBox').html(
                    '<i class="fas fa-paperclip text-secondary fa-3x mb-2"></i>' +
                    '<div class="fw-semibold small text-dark mb-1">' + escapeHtml(fileName) + '</div>' +
                    '<a href="' + escapeHtml(fileUrl) + '" target="_blank" rel="noopener noreferrer" class="link-lihat-foto text-primary small">' +
                        '<i class="fas fa-download me-1"></i>Buka / Unduh Berkas' +
                    '</a>'
                ).show();
                $('#modalNoFoto').hide();
            }
        } else {
            $('#modalFotoBox').hide();
            $('#modalNoFoto').show();
        }
        var modal = document.getElementById('modalDetailLogbook');
        if (modal) bootstrap.Modal.getOrCreateInstance(modal).show();
    });
    loadUnits();
    load();
});

    // Handler Klik Buka Foto di Tab Baru (Mendukung Data URI Base64 & URL Biasa)
    $(document).on('click', '.link-lihat-foto, a[href^="data:image/"]', function(e) {
        var href = $(this).attr('href');
        if (!href) return;
        if (/^data:image\//i.test(href)) {
            e.preventDefault();
            if (typeof window.openImageInNewTab === 'function') {
                window.openImageInNewTab(href, 'Foto Kegiatan');
            } else {
                try {
                    var arr = href.split(',');
                    var mime = arr[0].match(/:(.*?);/)[1];
                    var bstr = atob(arr[1]);
                    var n = bstr.length;
                    var u8arr = new Uint8Array(n);
                    while (n--) {
                        u8arr[n] = bstr.charCodeAt(n);
                    }
                    var blob = new Blob([u8arr], { type: mime });
                    var blobUrl = URL.createObjectURL(blob);
                    window.open(blobUrl, '_blank');
                } catch (err) {
                    var win = window.open('');
                    if (win) {
                        win.document.write('<!DOCTYPE html><html><head><title>Foto Kegiatan</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{margin:0;background:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;}img{max-width:95%;max-height:95vh;border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,0.5);}</style></head><body><img src="' + href + '" alt="Foto Kegiatan"></body></html>');
                        win.document.close();
                    }
                }
            }
        }
    });
