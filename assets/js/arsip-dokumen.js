(function() {
    var fileField = 'file_surat_permohonan';

    function apiBase() {
        return (window.API_BASE || 'http://localhost:8000/backend-api').replace(/\/$/, '');
    }

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

    function readResponse(response) {
        return response.text().then(function(text) {
            var payload = {};
            if (text) {
                try {
                    payload = JSON.parse(text);
                } catch (error) {
                    payload = {};
                }
            }
            if (!response.ok) {
                var validationMessage = payload.errors && Object.keys(payload.errors).map(function(key) {
                    return payload.errors[key][0];
                })[0];
                throw new Error(validationMessage || payload.message ||
                    'Permintaan gagal (HTTP ' + response.status + ').');
            }
            return payload.data !== undefined ? payload.data : payload;
        });
    }

    function fileUrl(path) {
        if (!path) return '';
        try {
            var url = /^https?:/i.test(path)
                ? new URL(path)
                : new URL(path.replace(/^\//, ''), new URL(apiBase()).origin + '/');
            return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
        } catch (error) {
            return '';
        }
    }

    function downloadFromApi(path, filename, preview) {
        var previewWindow = preview ? window.open('about:blank', '_blank') : null;
        return fetch(apiUrl(path), {
            headers: { Accept: 'application/pdf, application/octet-stream, application/json' }
        }).then(function(response) {
            if (!response.ok) {
                return response.text().then(function(text) {
                    var message = 'Unduhan gagal (HTTP ' + response.status + ').';
                    try {
                        var payload = text ? JSON.parse(text) : {};
                        message = payload.message || message;
                    } catch (error) {}
                    throw new Error(message);
                });
            }
            return response.blob();
        }).then(function(blob) {
            var objectUrl = URL.createObjectURL(blob);
            if (previewWindow && !previewWindow.closed) {
                previewWindow.location.href = objectUrl;
            } else {
                var link = document.createElement('a');
                link.href = objectUrl;
                link.download = filename || 'dokumen-magang.pdf';
                document.body.appendChild(link);
                link.click();
                link.remove();
            }
            window.setTimeout(function() { URL.revokeObjectURL(objectUrl); }, 60000);
        }).catch(function(error) {
            if (previewWindow && !previewWindow.closed) previewWindow.close();
            throw error;
        });
    }

    function normalizeFile(value) {
        if (!value) return null;
        if (typeof value === 'string') {
            return { name: value.split('/').pop(), url: fileUrl(value) };
        }
        var path = value.url || value.file_url || value.path || value.file_path ||
            value.file_surat_permohonan || value.file_surat_balasan || '';
        return {
            name: value.name || value.filename || path.split('/').pop() || 'Surat Permohonan',
            url: fileUrl(path)
        };
    }

    function notifyError(error) {
        Swal.fire({
            icon: 'error',
            title: 'Arsip dokumen gagal diproses',
            text: error && error.message ? error.message : 'Terjadi kesalahan saat mengakses arsip.'
        });
    }

    function renderParticipant(root, documents) {
        var file = normalizeFile(documents && documents[fileField]);
        var balasan = normalizeFile(documents && documents.file_surat_balasan);
        var status = documents && documents.status_dokumen;
        if (!status) status = file && balasan ? 'lengkap' : 'pending';
        var permohonanButton = file
            ? '<button type="button" class="btn btn-outline-primary btn-sm btn-download-archive" data-api-path="/download-surat-permohonan" data-file-name="' +
                escapeHtml(file.name || 'surat-permohonan.pdf') + '" data-preview="true"><i class="fas fa-eye me-1"></i>Lihat / Unduh Surat</button>'
            : '<span class="archive-document-empty">Belum diunggah</span>';
        var balasanButton = balasan
            ? '<button type="button" class="btn btn-outline-primary btn-sm btn-download-archive" data-api-path="/download-surat-balasan" data-file-name="' +
                escapeHtml(balasan.name || 'surat-balasan.pdf') + '" data-preview="true"><i class="fas fa-eye me-1"></i>Lihat / Unduh Surat Balasan</button>'
            : '<span class="archive-document-empty">Menunggu diunggah oleh Pembimbing</span>';

        root.innerHTML = `
            <div class="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
                <div>
                    <h5 class="page-title mb-1">Arsip Dokumen Magang</h5>
                    <p class="page-subtitle mb-0">Kelola surat permohonan dan lihat surat balasan magang Anda.</p>
                </div>
                <span class="badge ${status === 'lengkap' ? 'bg-success' : 'bg-secondary'} archive-status-badge">
                    ${status === 'lengkap' ? 'Lengkap' : 'Pending'}
                </span>
            </div>
            <div class="row g-3">
                <div class="col-lg-6">
                    <section class="card h-100 archive-document-card">
                        <div class="card-header bg-white"><h6 class="mb-0 fw-bold"><i class="fas fa-file-arrow-up text-primary me-2"></i>Surat Permohonan</h6></div>
                        <div class="card-body d-flex flex-column justify-content-between gap-3">
                            <p class="text-muted small mb-0">Unggah surat permohonan resmi dari sekolah atau perguruan tinggi (PDF maksimal 5 MB).</p>
                            <div class="archive-action-stack">${permohonanButton}</div>
                            <form id="formSuratPermohonan" class="d-flex flex-column gap-2">
                                <label for="fileSuratPermohonan" class="form-label small mb-0">Pilih file PDF</label>
                                <input id="fileSuratPermohonan" class="form-control form-control-sm" type="file" name="file_surat_permohonan" accept="application/pdf,.pdf" required>
                                <button type="submit" class="btn btn-primary btn-sm"><i class="fas fa-upload me-1"></i>Upload Surat Permohonan</button>
                            </form>
                        </div>
                    </section>
                </div>
                <div class="col-lg-6">
                    <section class="card h-100 archive-document-card">
                        <div class="card-header bg-white"><h6 class="mb-0 fw-bold"><i class="fas fa-file-circle-check text-success me-2"></i>Surat Balasan</h6></div>
                        <div class="card-body d-flex flex-column justify-content-between gap-3">
                            <p class="text-muted small mb-0">${balasan ? 'Surat balasan dari pembimbing sudah tersedia.' : 'Menunggu diunggah oleh Pembimbing.'}</p>
                            <div class="archive-action-stack">${balasanButton}</div>
                        </div>
                    </section>
                </div>
            </div>
        `;

        root.querySelector('#formSuratPermohonan').addEventListener('submit', function(event) {
            event.preventDefault();
            var input = root.querySelector('#fileSuratPermohonan');
            var selectedFile = input.files && input.files[0];
            if (!selectedFile) return;
            if ((selectedFile.type && selectedFile.type !== 'application/pdf') ||
                !/\.pdf$/i.test(selectedFile.name)) {
                Swal.fire('Format Tidak Valid', 'Berkas surat harus berformat PDF.', 'warning');
                return;
            }
            if (selectedFile.size > 5 * 1024 * 1024) {
                Swal.fire('Berkas Terlalu Besar', 'Ukuran file PDF maksimal 5 MB.', 'warning');
                return;
            }

            var formData = new FormData();
            formData.append(fileField, selectedFile, selectedFile.name);
            var button = event.currentTarget.querySelector('button[type="submit"]');
            button.disabled = true;
            fetch(apiUrl('/upload-surat-permohonan'), {
                method: 'POST',
                body: formData,
                headers: { Accept: 'application/json' }
            }).then(readResponse).then(function() {
                return loadDocuments(root, 'peserta_magang').then(function(loaded) {
                    if (!loaded) return;
                    Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Surat permohonan berhasil diunggah',
                    showConfirmButton: false,
                    timer: 1800
                    });
                });
            }).catch(notifyError).then(function() {
                button.disabled = false;
            });
        });
    }

    function renderOtherRole(root, responseData, role) {
        var records = Array.isArray(responseData) ? responseData :
            (responseData.peserta || responseData.items || responseData.dokumen ||
                responseData.anak_bimbingan || responseData.peserta_bimbingan || [responseData]);
        if (!Array.isArray(records)) records = records ? [records] : [];
        var isMentor = role === 'pembimbing';
        var isAdmin = role === 'admin';
        root.innerHTML = `
            <div class="mb-4">
                <h5 class="page-title mb-1">Arsip Dokumen Magang</h5>
                <p class="page-subtitle mb-0">${isMentor
                    ? 'Lihat surat permohonan peserta bimbingan dan unggah surat balasan.'
                    : 'Lihat arsip dokumen peserta magang.'}</p>
            </div>
            <div class="card table-card"><div class="card-body">
                ${records.length ? `<div class="table-responsive"><table class="table table-hover align-middle mb-0">
                    <thead><tr><th>Peserta Magang</th><th>Status Arsip</th><th>Surat Permohonan</th><th>Surat Balasan</th>${isMentor ? '<th>Aksi</th>' : ''}</tr></thead>
                    <tbody>${records.map(function(record) {
                        var participant = record.peserta || record.peserta_magang || record;
                        participant = participant.peserta_magang || participant;
                        var permohonanValue = record.url_surat_permohonan || record.file_surat_permohonan ||
                            participant.file_surat_permohonan;
                        var balasanValue = record.url_surat_balasan || record.file_surat_balasan ||
                            participant.file_surat_balasan;
                        var permohonan = normalizeFile(permohonanValue);
                        var balasan = normalizeFile(balasanValue);
                        var hasPermohonan = record.has_surat_permohonan === true ||
                            record.has_surat_permohonan === 1 ||
                            String(record.has_surat_permohonan).toLowerCase() === 'true' || Boolean(permohonan);
                        var hasBalasan = record.has_surat_balasan === true ||
                            record.has_surat_balasan === 1 ||
                            String(record.has_surat_balasan).toLowerCase() === 'true' || Boolean(balasan);
                        var complete = (record.status_dokumen || participant.status_dokumen) === 'lengkap' ||
                            (hasPermohonan && hasBalasan);
                        var participantId = participant.id_peserta_magang || participant.id || record.id_peserta_magang ||
                            record.id_peserta || record.peserta_id || record.id;
                        function link(file, label, kind, exists) {
                            if (!exists) return '<span class="text-muted small">Belum diunggah</span>';
                            if (isMentor) {
                                var filename = escapeHtml(file && file.name || ('surat-' + kind + '.pdf'));
                                if (file && file.url) {
                                    var url = escapeHtml(file.url);
                                    return '<div class="btn-group btn-group-sm" role="group">' +
                                        '<a class="btn btn-outline-primary" href="' + url +
                                            '" target="_blank" rel="noopener noreferrer" aria-label="Lihat ' + escapeHtml(label) +
                                            '" title="Lihat"><i class="fas fa-eye"></i></a>' +
                                        '<a class="btn btn-outline-primary" href="' + url + '" download="' + filename +
                                            '" aria-label="Unduh ' + escapeHtml(label) + '" title="Unduh">' +
                                            '<i class="fas fa-download"></i></a></div>';
                                }
                                if (!participantId) return '<span class="text-muted small">Dokumen tersedia</span>';
                                var mentorPath = '/download-surat-' + kind + '/' + encodeURIComponent(participantId);
                                return '<div class="btn-group btn-group-sm" role="group">' +
                                    '<button type="button" class="btn btn-outline-primary btn-download-archive" data-api-path="' +
                                        escapeHtml(mentorPath) + '" data-file-name="' + filename +
                                        '" data-preview="true" aria-label="Lihat ' + escapeHtml(label) +
                                        '" title="Lihat"><i class="fas fa-eye"></i></button>' +
                                    '<button type="button" class="btn btn-outline-primary btn-download-archive" data-api-path="' +
                                        escapeHtml(mentorPath) + '" data-file-name="' + filename +
                                        '" data-preview="false" aria-label="Unduh ' + escapeHtml(label) +
                                        '" title="Unduh"><i class="fas fa-download"></i></button></div>';
                            }
                            if (!file || !participantId) return '<span class="text-muted small">Dokumen tersedia</span>';
                            var path = isAdmin
                                ? '/admin/dokumen/surat-' + kind + '/' + encodeURIComponent(participantId)
                                : '/download-surat-' + kind + '/' + encodeURIComponent(participantId);
                            return '<button type="button" class="btn btn-outline-primary btn-sm btn-download-archive" data-api-path="' +
                                escapeHtml(path) + '" data-file-name="' + escapeHtml(file.name || ('surat-' + kind + '.pdf')) +
                                '" data-preview="true"><i class="fas fa-eye me-1"></i>' + label + '</button>';
                        }
                        var action = !isMentor ? '' : participantId
                            ? '<td><button type="button" class="btn ' + (hasBalasan
                                ? 'btn-secondary'
                                : 'btn-primary') + ' btn-sm btn-upload-balasan" data-peserta-id="' +
                                escapeHtml(participantId) + '" data-has-balasan="' + hasBalasan + '">' +
                                '<i class="fas fa-upload me-1"></i>' +
                                (hasBalasan ? 'Ganti Surat Balasan' : 'Upload Surat Balasan') + '</button></td>'
                            : '<td><span class="text-danger small">ID peserta tidak tersedia; unggahan tidak dapat dilakukan.</span></td>';
                        var account = participant.pengguna || {};
                        var participantName = record.nama_peserta || participant.nama || participant.nama_lengkap ||
                            participant.name || account.nama_lengkap || '-';
                        var participantDetails = isMentor
                            ? '<div class="small text-muted">' + escapeHtml(participant.asal_sekolah_kampus ||
                                participant.instansi || record.asal_sekolah_kampus || '-') + '</div>'
                            : '<div class="small text-muted">' + escapeHtml(participant.nim ||
                                participant.username || account.username || '') + '</div>';
                        return '<tr><td><strong>' + escapeHtml(participantName) +
                            '</strong>' + participantDetails + '</td><td><span class="badge ' +
                            (complete ? 'bg-success' : isMentor ? 'bg-warning text-dark' : 'bg-secondary') +
                            '">' + (complete ? 'Lengkap' : 'Pending') + '</span></td><td>' +
                            link(permohonan, isMentor ? 'Surat Permohonan' : 'Lihat/Unduh Surat Permohonan',
                                'permohonan', hasPermohonan) + '</td><td>' +
                            link(balasan, isMentor ? 'Surat Balasan' : 'Lihat/Unduh Surat Balasan',
                                'balasan', hasBalasan) + '</td>' + action + '</tr>';
                    }).join('')}</tbody>
                </table></div>` : '<div class="empty-state py-5"><i class="fas fa-folder-open"></i><h6>Tidak ada dokumen yang tersedia</h6></div>'}
            </div></div>
            ${isMentor ? `
                <div class="modal fade" id="modalUploadSuratBalasan" tabindex="-1" aria-labelledby="modalUploadSuratBalasanLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <form id="formUploadSuratBalasan">
                                <div class="modal-header">
                                    <h5 class="modal-title" id="modalUploadSuratBalasanLabel">Upload Surat Balasan</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button>
                                </div>
                                <div class="modal-body">
                                    <input type="hidden" id="pesertaIdSuratBalasan">
                                    <label for="fileSuratBalasan" class="form-label">Pilih file surat balasan (PDF, maks. 5 MB)</label>
                                    <input id="fileSuratBalasan" class="form-control" type="file" name="file_surat_balasan" accept="application/pdf,.pdf" required>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-light" data-bs-dismiss="modal">Batal</button>
                                    <button type="submit" class="btn btn-primary"><i class="fas fa-upload me-1"></i>Upload Surat Balasan</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>` : ''}
        `;

        if (isMentor) {
            root.querySelectorAll('.btn-upload-balasan').forEach(function(button) {
                button.addEventListener('click', function() {
                    var form = root.querySelector('#formUploadSuratBalasan');
                    var fileInput = root.querySelector('#fileSuratBalasan');
                    var hasBalasan = button.getAttribute('data-has-balasan') === 'true';
                    root.querySelector('#pesertaIdSuratBalasan').value = button.getAttribute('data-peserta-id');
                    fileInput.value = '';
                    root.querySelector('#modalUploadSuratBalasanLabel').textContent = hasBalasan
                        ? 'Ganti Surat Balasan'
                        : 'Upload Surat Balasan';
                    form.querySelector('button[type="submit"]').innerHTML =
                        '<i class="fas fa-upload me-1"></i>' + (hasBalasan ? 'Ganti Surat Balasan' : 'Upload Surat Balasan');
                    bootstrap.Modal.getOrCreateInstance(root.querySelector('#modalUploadSuratBalasan')).show();
                });
            });
            root.querySelector('#formUploadSuratBalasan').addEventListener('submit', function(event) {
                event.preventDefault();
                var form = event.currentTarget;
                var input = root.querySelector('#fileSuratBalasan');
                var selectedFile = input.files && input.files[0];
                if (!selectedFile) return;
                if ((selectedFile.type && selectedFile.type !== 'application/pdf') ||
                    !/\.pdf$/i.test(selectedFile.name)) {
                    Swal.fire('Format Tidak Valid', 'Berkas surat balasan harus berformat PDF.', 'warning');
                    return;
                }
                if (selectedFile.size > 5 * 1024 * 1024) {
                    Swal.fire('Berkas Terlalu Besar', 'Ukuran file PDF maksimal 5 MB.', 'warning');
                    return;
                }
                var participantId = root.querySelector('#pesertaIdSuratBalasan').value;
                var formData = new FormData();
                formData.append('file_surat_balasan', selectedFile, selectedFile.name);
                var button = form.querySelector('button[type="submit"]');
                button.disabled = true;
                fetch(apiUrl('/upload-surat-balasan/' + encodeURIComponent(participantId)), {
                    method: 'POST',
                    body: formData,
                    headers: { Accept: 'application/json' }
                }).then(readResponse).then(function() {
                    bootstrap.Modal.getInstance(root.querySelector('#modalUploadSuratBalasan')).hide();
                    return loadDocuments(root, role);
                }).then(function(loaded) {
                    if (!loaded) return;
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'Surat balasan berhasil diunggah',
                        showConfirmButton: false,
                        timer: 1800
                    });
                }).catch(notifyError).then(function() {
                    button.disabled = false;
                });
            });
        }
    }

    function loadDocuments(root, role) {
        root.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Memuat arsip...</span></div></div>';
        var path = role === 'peserta_magang' ? '/me' :
            (role === 'pembimbing' ? '/pembimbing/peserta-bimbingan' : '/admin/dokumen');
        if (role === 'pembimbing') {
            return window.apiRequestAll(path, []).then(function(records) {
                renderOtherRole(root, records, role);
                return true;
            }).catch(function(error) {
                root.innerHTML = '<div class="alert alert-danger" role="alert"></div>';
                root.querySelector('.alert').textContent = error.message;
                return false;
            });
        }
        if (role === 'admin') {
            return window.apiRequestAll(path, ['dokumen', 'peserta', 'items', 'data_dokumen'])
                .then(function(records) {
                    renderOtherRole(root, records, role);
                    return true;
                }).catch(function(error) {
                    root.innerHTML = '<div class="alert alert-danger" role="alert"></div>';
                    root.querySelector('.alert').textContent = error.message;
                    return false;
                });
        }
        var token = localStorage.getItem('token') || localStorage.getItem('siamag_token') || '';
        var headers = { Accept: 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        return fetch(apiUrl(path), { headers: headers })
            .then(readResponse)
            .then(function(data) {
                if (role === 'peserta_magang') {
                    var user = data && (data.user || data.data || data);
                    var participant = user && (user.peserta_magang || user.peserta || user.profile);
                    renderParticipant(root, participant || user || {});
                } else {
                    var archiveData = data || {};
                    var records = Array.isArray(archiveData) ? archiveData :
                        (archiveData.dokumen || archiveData.peserta || archiveData.items);
                    if (!Array.isArray(records)) records = [];
                    renderOtherRole(root, records, role);
                }
                return true;
            }).catch(function(error) {
                root.innerHTML = '<div class="alert alert-danger" role="alert"></div>';
                root.querySelector('.alert').textContent = error.message;
                return false;
            });
    }

    $(document).on('click', '.btn-download-archive', function() {
        var $button = $(this).prop('disabled', true);
        downloadFromApi(
            $button.attr('data-api-path'),
            $button.attr('data-file-name'),
            $button.attr('data-preview') === 'true'
        ).catch(notifyError).then(function() {
            $button.prop('disabled', false);
        });
    });

    function renderArchivePage() {
        var root = document.getElementById('arsipDokumenApp');
        if (!root) return;
        var pathname = window.location.pathname.toLowerCase();
        var user = null;
        try { user = JSON.parse(localStorage.getItem('token') ? localStorage.getItem('user') : localStorage.getItem('siamag_user') || 'null'); } catch (error) { user = null; }
        if (!user) {
            try { user = JSON.parse(localStorage.getItem('siamag_user') || 'null'); } catch (e) {}
        }
        var userRole = String((user && user.role) || '').toLowerCase();

        var isPeserta = pathname.indexOf('/peserta/') !== -1 ||
            userRole === 'peserta' || userRole === 'peserta_magang' || userRole === 'peserta magang';
        var isPembimbing = pathname.indexOf('/pembimbing/') !== -1 || userRole === 'pembimbing';

        var role = isPeserta ? 'peserta_magang' : (isPembimbing ? 'pembimbing' : 'admin');
        loadDocuments(root, role);
    }

    window.arsipDokumen = { load: loadDocuments };
    $(document).ready(renderArchivePage);
})();
