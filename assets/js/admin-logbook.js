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

    var detailItem = null;
    var previewObjectUrl = null;

    function lampiranFileInfo(file) {
        var raw = typeof file === 'string' ? file : '';
        var path = raw;
        var mime = '';
        var name = '';

        if (file && typeof file === 'object') {
            path = String(file.url || file.file_url || file.path || file.file_path || '');
            mime = String(file.mime_type || file.type || '').toLowerCase();
            name = file.name || file.filename || '';
        }

        var dataMatch = /^data:([^;,]+)/i.exec(raw);
        if (!mime && dataMatch) mime = dataMatch[1].toLowerCase();

        var extMatch = /\.([a-z0-9]{2,5})(?:[?#]|$)/i.exec(path);
        var ext = extMatch ? extMatch[1].toLowerCase() : '';

        if (!mime && ext) {
            if (ext === 'pdf') mime = 'application/pdf';
            else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].indexOf(ext) >= 0) {
                mime = 'image/' + (ext === 'jpg' ? 'jpeg' : ext);
            }
        }

        // SVG berpotensi berisi skrip; perlakukan sebagai berkas unduhan.
        if (mime === 'image/svg+xml') mime = 'application/octet-stream';

        if (!name) {
            if (raw.indexOf('data:') === 0) name = 'Lampiran Dokumentasi';
            else if (path) name = path.split('?')[0].split('/').pop();
        }

        return { mime: mime, ext: ext, name: name || 'Lampiran kegiatan' };
    }

    function lampiranRequest(item, download) {
        var id = item ? (item.id || item.id_logbook) : '';
        if (!id) return Promise.reject(new Error('Data logbook tidak lengkap.'));

        var token = window.getAuthToken ? window.getAuthToken() : (localStorage.getItem('token') || localStorage.getItem('siamag_token') || '');
        var headers = { Accept: 'application/json' };
        if (token) headers.Authorization = 'Bearer ' + token;

        var url = window.apiUrl('/logbook/' + encodeURIComponent(id) + '/lampiran' + (download ? '?download=1' : ''));

        return fetch(url, { headers: headers }).then(function(response) {
            if (response.status === 401) {
                if (typeof window.handleUnauthorized === 'function') window.handleUnauthorized();
                throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
            }

            if (!response.ok) {
                return response.text().then(function(text) {
                    var message = 'Lampiran tidak dapat diambil (HTTP ' + response.status + ').';
                    if (text) {
                        try {
                            var payload = JSON.parse(text);
                            if (payload && payload.message) message = payload.message;
                        } catch (error) {
                            // Respons bukan JSON; gunakan pesan bawaan.
                        }
                    }
                    throw new Error(message);
                });
            }

            return response.blob().then(function(blob) {
                var disposition = response.headers.get('Content-Disposition') || '';
                var match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
                var filename = '';
                if (match) {
                    try {
                        filename = decodeURIComponent(match[1] || match[2]);
                    } catch (error) {
                        filename = match[2] || '';
                    }
                }
                return { blob: blob, filename: filename };
            });
        });
    }

    function simpanBlob(blob, filename) {
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = filename || 'lampiran-logbook';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        window.setTimeout(function() {
            link.remove();
            URL.revokeObjectURL(url);
        }, 60000);
    }

    function bukaLampiran(item, mode) {
        var id = item.id || item.id_logbook;
        var newWindow = null;

        if (mode === 'open') {
            newWindow = window.open('', '_blank');
            if (newWindow) {
                try {
                    newWindow.document.write('<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Lampiran Logbook</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif;font-size:14px}</style></head><body>Memuat lampiran...</body></html>');
                    newWindow.document.close();
                } catch (error) {
                    // Abaikan kegagalan menulis halaman sementara.
                }
            }
        }

        lampiranRequest(item, mode === 'download').then(function(result) {
            var inlineSafe = [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'application/pdf'
            ].indexOf(String(result.blob.type || '').toLowerCase()) >= 0;

            if (mode === 'download' || !inlineSafe) {
                if (newWindow) newWindow.close();
                simpanBlob(result.blob, result.filename || ('lampiran-logbook-' + id));
                return;
            }

            var url = URL.createObjectURL(result.blob);
            if (newWindow) {
                newWindow.location.href = url;
                window.setTimeout(function() {
                    URL.revokeObjectURL(url);
                }, 60000);
            } else {
                Swal.fire({
                    title: 'Lampiran Siap Dibuka',
                    html: '<a href="' + url + '" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">Buka Lampiran</a>',
                    showConfirmButton: false,
                    showCloseButton: true,
                    willClose: function() {
                        URL.revokeObjectURL(url);
                    }
                });
            }
        }).catch(function(error) {
            if (newWindow) newWindow.close();
            Swal.fire('Lampiran Tidak Dapat Dibuka', error.message, 'error');
        });
    }

    function clearPreviewObjectUrl() {
        if (previewObjectUrl) {
            URL.revokeObjectURL(previewObjectUrl);
            previewObjectUrl = null;
        }
    }

    function muatPreviewLampiran(item) {
        var image = document.querySelector('#modalFotoBox img[data-lampiran-preview="1"]');
        var loading = document.querySelector('#modalFotoBox [data-lampiran-loading]');
        if (!image) return;

        lampiranRequest(item, false).then(function(result) {
            clearPreviewObjectUrl();
            previewObjectUrl = URL.createObjectURL(result.blob);
            image.src = previewObjectUrl;
            image.style.display = '';
            if (loading) loading.style.display = 'none';
        }).catch(function(error) {
            image.style.display = 'none';
            if (loading) {
                loading.className = 'small text-danger';
                loading.textContent = error.message;
            }
        });
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
        detailItem = item;
        var file = item.foto_kegiatan_url || item.url_foto_kegiatan || item.foto_kegiatan;
        if (file) {
            var info = lampiranFileInfo(file);
            var isImage = info.mime.indexOf('image/') === 0;
            var isPdf = info.mime === 'application/pdf';
            var logbookId = item.id || item.id_logbook || '';

            if (isImage) {
                $('#modalFotoBox').html(
                    '<div class="mb-2 text-center">' +
                        '<img alt="Foto kegiatan" data-lampiran-preview="1" class="img-fluid rounded border shadow-sm" style="max-height:260px; object-fit:contain; cursor:pointer; display:none;">' +
                        '<div class="small text-muted" data-lampiran-loading>Memuat lampiran...</div>' +
                    '</div>' +
                    '<div>' +
                        '<a href="#" class="link-lampiran-logbook text-primary text-decoration-underline fw-medium small" data-logbook-id="' + escapeHtml(logbookId) + '" data-lampiran-mode="open">' +
                            '<i class="fas fa-external-link-alt me-1"></i>Buka Foto di Tab Baru' +
                        '</a>' +
                    '</div>'
                ).show();
                $('#modalNoFoto').hide();
                muatPreviewLampiran(item);
            } else if (isPdf) {
                $('#modalFotoBox').html(
                    '<i class="fas fa-file-pdf text-danger fa-3x mb-2"></i>' +
                    '<div class="fw-semibold small text-dark mb-2">Dokumen Lampiran (PDF)</div>' +
                    '<a class="link-lampiran-logbook btn btn-outline-danger btn-sm" href="#" data-logbook-id="' + escapeHtml(logbookId) + '" data-lampiran-mode="open">' +
                        '<i class="fas fa-external-link-alt me-1"></i>Lihat Dokumen PDF' +
                    '</a>'
                ).show();
                $('#modalNoFoto').hide();
            } else {
                $('#modalFotoBox').html(
                    '<i class="fas fa-paperclip text-secondary fa-3x mb-2"></i>' +
                    '<div class="fw-semibold small text-dark mb-1">' + escapeHtml(info.name) + '</div>' +
                    '<a href="#" class="link-lampiran-logbook text-primary small" data-logbook-id="' + escapeHtml(logbookId) + '" data-lampiran-mode="download">' +
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
    $(document).on('click', '.link-lampiran-logbook', function(e) {
        e.preventDefault();
        var id = String($(this).data('logbook-id') || '');
        var item = detailItem && String(detailItem.id || detailItem.id_logbook) === id
            ? detailItem
            : records.find(function(row) {
                return String(row.id || row.id_logbook) === id;
            });
        if (!item) return;
        bukaLampiran(item, $(this).data('lampiran-mode') === 'download' ? 'download' : 'open');
    });

    $(document).on('click', '#modalFotoBox img[data-lampiran-preview="1"]', function() {
        if (detailItem) bukaLampiran(detailItem, 'open');
    });

    $('#modalDetailLogbook').on('hidden.bs.modal', function() {
        clearPreviewObjectUrl();
        detailItem = null;
    });

    loadUnits();
    load();
});
