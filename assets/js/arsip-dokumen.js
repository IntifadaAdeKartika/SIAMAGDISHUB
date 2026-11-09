(function() {
    var databasePromise;
    var fieldByType = {
        permohonan: 'file_surat_permohonan',
        balasan: 'file_surat_balasan'
    };
    var labelByType = {
        permohonan: 'Surat Permohonan',
        balasan: 'Surat Balasan'
    };

    function openDatabase() {
        if (!window.indexedDB) {
            return Promise.reject(new Error('Browser ini tidak mendukung penyimpanan arsip dokumen.'));
        }
        if (!databasePromise) {
            databasePromise = new Promise(function(resolve, reject) {
                var request = window.indexedDB.open('siamag-arsip-dokumen', 1);
                request.onupgradeneeded = function() {
                    if (!request.result.objectStoreNames.contains('documents')) {
                        request.result.createObjectStore('documents', { keyPath: 'id' });
                    }
                };
                request.onsuccess = function() {
                    resolve(request.result);
                };
                request.onerror = function() {
                    reject(request.error || new Error('Penyimpanan arsip tidak dapat dibuka.'));
                };
            });
        }
        return databasePromise;
    }

    function samplePdf(participant, type) {
        function ascii(value) {
            return String(value || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^\x20-\x7E]/g, '?');
        }

        function escapePdf(value) {
            return ascii(value).replace(/([\\()])/g, '\\$1');
        }

        var title = labelByType[type];
        var lines = [
            'Dokumen contoh SIAMAG Dishub Ponorogo',
            title,
            'Nama: ' + participant.nama,
            'Nomor peserta: ' + participant.nim,
            'Instansi: ' + participant.instansi,
            'Dokumen contoh untuk data master; bukan surat resmi.'
        ];
        var content = 'BT\n/F1 16 Tf\n50 760 Td\n(' + escapePdf(lines[0]) + ') Tj\n/F1 13 Tf\n0 -32 Td\n(' +
            escapePdf(lines[1]) + ') Tj\n/F1 11 Tf\n';
        lines.slice(2).forEach(function(line) {
            content += '0 -24 Td\n(' + escapePdf(line) + ') Tj\n';
        });
        content += 'ET';

        var objects = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
            '<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream'
        ];
        var pdf = '%PDF-1.4\n';
        var offsets = [0];
        objects.forEach(function(object, index) {
            offsets.push(pdf.length);
            pdf += (index + 1) + ' 0 obj\n' + object + '\nendobj\n';
        });
        var xrefOffset = pdf.length;
        pdf += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
        offsets.slice(1).forEach(function(offset) {
            pdf += String(offset).padStart(10, '0') + ' 00000 n \n';
        });
        pdf += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF';
        return new Blob([pdf], { type: 'application/pdf' });
    }

    function get(participant, type) {
        var field = fieldByType[type];
        if (!field) return Promise.reject(new Error('Jenis dokumen tidak dikenal.'));
        return openDatabase().then(function(database) {
            return new Promise(function(resolve, reject) {
                var transaction = database.transaction('documents', 'readonly');
                var request = transaction.objectStore('documents').get(participant.nim + ':' + type);
                request.onsuccess = function() {
                    var stored = request.result;
                    if (stored) {
                        resolve(stored);
                    } else if (participant[field]) {
                        resolve({
                            id: participant.nim + ':' + type,
                            nim: participant.nim,
                            type: type,
                            name: participant[field],
                            updatedAt: '',
                            blob: samplePdf(participant, type),
                            isSample: true
                        });
                    } else {
                        resolve(null);
                    }
                };
                request.onerror = function() {
                    reject(request.error || new Error('Arsip dokumen gagal dibaca.'));
                };
            });
        });
    }

    function save(participant, type, file) {
        var field = fieldByType[type];
        if (!field) return Promise.reject(new Error('Jenis dokumen tidak dikenal.'));
        var record = {
            id: participant.nim + ':' + type,
            nim: participant.nim,
            type: type,
            name: file.name,
            size: file.size,
            updatedAt: new Date().toISOString(),
            blob: file
        };
        return openDatabase().then(function(database) {
            return new Promise(function(resolve, reject) {
                var transaction = database.transaction('documents', 'readwrite');
                transaction.objectStore('documents').put(record);
                transaction.oncomplete = function() {
                    participant[field] = file.name;
                    participant.status_dokumen = participant.file_surat_permohonan && participant.file_surat_balasan
                        ? 'lengkap'
                        : 'pending';
                    resolve(record);
                };
                transaction.onerror = function() {
                    reject(transaction.error || new Error('Dokumen gagal disimpan.'));
                };
                transaction.onabort = function() {
                    reject(transaction.error || new Error('Penyimpanan dokumen dibatalkan.'));
                };
            });
        });
    }

    function download(participant, type) {
        return get(participant, type).then(function(documentRecord) {
            if (!documentRecord) {
                throw new Error(labelByType[type] + ' belum tersedia.');
            }
            var url = URL.createObjectURL(documentRecord.blob);
            var link = document.createElement('a');
            link.href = url;
            link.download = documentRecord.name;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(function() {
                URL.revokeObjectURL(url);
            }, 60000);
        });
    }

    function preview(participant, type) {
        return get(participant, type).then(function(documentRecord) {
            if (!documentRecord) {
                throw new Error(labelByType[type] + ' belum tersedia.');
            }
            var url = URL.createObjectURL(documentRecord.blob);
            return Swal.fire({
                title: labelByType[type],
                html: '<div class="small text-muted text-truncate mb-2">' +
                    escapeHtml(documentRecord.name) + '</div>' +
                    (documentRecord.isSample
                        ? '<div class="alert alert-warning text-start small mb-2">Dokumen ini adalah contoh dari data master, bukan surat resmi.</div>'
                        : '') +
                    '<iframe class="archive-preview-frame" title="' + escapeHtml(labelByType[type]) + '" src="' + url + '"></iframe>',
                width: 900,
                customClass: { popup: 'archive-preview-popup' },
                showCancelButton: true,
                confirmButtonText: '<i class="fas fa-download me-1"></i> Unduh PDF',
                cancelButtonText: 'Tutup',
                confirmButtonColor: '#2563eb',
                didClose: function() {
                    URL.revokeObjectURL(url);
                }
            }).then(function(result) {
                if (result.isConfirmed) return download(participant, type);
            });
        });
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[character];
        });
    }

    function notifyError(error) {
        Swal.fire({
            icon: 'error',
            title: 'Arsip dokumen gagal diproses',
            text: error && error.message ? error.message : 'Terjadi kesalahan saat mengakses arsip.'
        });
    }

    function documentActions(participant, type, documentRecord, canUpload) {
        var label = labelByType[type];
        var actions = documentRecord
            ? '<button type="button" class="btn btn-outline-primary btn-sm" data-archive-action="preview" data-nim="' +
                escapeHtml(participant.nim) + '" data-type="' + type + '"><i class="fas fa-eye me-1"></i>Lihat ' + label + '</button>' +
              '<button type="button" class="btn btn-outline-secondary btn-sm" data-archive-action="download" data-nim="' +
                escapeHtml(participant.nim) + '" data-type="' + type + '"><i class="fas fa-download me-1"></i>Unduh ' + label + '</button>'
            : '<span class="archive-document-empty">Belum diunggah</span>';
        var upload = canUpload
            ? '<button type="button" class="btn btn-primary btn-sm" data-archive-action="upload" data-nim="' +
                escapeHtml(participant.nim) + '" data-type="' + type + '"><i class="fas fa-upload me-1"></i>' +
                (documentRecord ? 'Upload Ulang ' : 'Upload ') + label + '</button>' +
              '<input type="file" class="d-none" accept="application/pdf,.pdf" data-archive-input="' +
                escapeHtml(participant.nim) + ':' + type + '">'
            : '';
        return '<div class="archive-action-stack">' + upload + actions + '</div>';
    }

    function roleFromPath() {
        var segments = window.location.pathname.split('/');
        if (segments.indexOf('admin') !== -1) return 'admin';
        if (segments.indexOf('pembimbing') !== -1) return 'pembimbing';
        return 'peserta_magang';
    }

    function currentParticipant() {
        var user = JSON.parse(sessionStorage.getItem('user') || 'null');
        var name = user && (user.nama || user.username);
        return window.getMasterPeserta(name) || window.masterPeserta[0];
    }

    function currentMentor() {
        var user = JSON.parse(sessionStorage.getItem('user') || 'null');
        var name = user && (user.nama || user.username);
        return window.masterPembimbing.find(function(item) {
            return item.nama === name;
        }) || window.masterPembimbing[4];
    }

    function renderArchivePage() {
        var root = document.getElementById('arsipDokumenApp');
        if (!root) return;
        var role = roleFromPath();
        var participant = role === 'peserta_magang' ? currentParticipant() : null;
        var mentor = role === 'pembimbing' ? currentMentor() : null;
        var participants = role === 'admin'
            ? window.masterPeserta.slice()
            : role === 'pembimbing'
                ? window.masterPeserta.filter(function(item) { return item.unitId === mentor.unitId; })
                : [participant];

        function refresh() {
            return Promise.all(participants.map(function(item) {
                return Promise.all([get(item, 'permohonan'), get(item, 'balasan')]).then(function(documents) {
                    return { participant: item, permohonan: documents[0], balasan: documents[1] };
                });
            })).then(function(rows) {
                if (role === 'peserta_magang') {
                    renderParticipantPage(rows[0]);
                } else if (role === 'pembimbing') {
                    renderMentorPage(rows);
                } else {
                    renderAdminPage(rows);
                }
            }).catch(notifyError);
        }

        function renderParticipantPage(row) {
            var statusComplete = row.permohonan && row.balasan;
            root.innerHTML = `
                <div class="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
                    <div>
                        <h5 class="page-title mb-1">Arsip Dokumen Magang</h5>
                        <p class="page-subtitle mb-0">Kelola surat permohonan dan surat balasan magang Anda.</p>
                    </div>
                    <span class="badge ${statusComplete ? 'bg-success' : 'bg-secondary'} archive-status-badge">${statusComplete ? 'Lengkap' : 'Pending'}</span>
                </div>
                <div class="alert alert-info small"><i class="fas fa-circle-info me-2"></i>Dokumen disimpan di browser ini selama backend belum tersedia. Unggah hanya berkas PDF maksimal 5 MB.</div>
                <div class="row g-3">
                    <div class="col-lg-6">
                        <section class="card h-100 archive-document-card">
                            <div class="card-header bg-white"><h6 class="mb-0 fw-bold"><i class="fas fa-file-arrow-up text-primary me-2"></i>Surat Permohonan</h6></div>
                            <div class="card-body d-flex flex-column justify-content-between gap-3">
                                <p class="text-muted small mb-0">Unggah surat permohonan resmi dari sekolah atau perguruan tinggi.</p>
                                ${documentActions(row.participant, 'permohonan', row.permohonan, true)}
                            </div>
                        </section>
                    </div>
                    <div class="col-lg-6">
                        <section class="card h-100 archive-document-card">
                            <div class="card-header bg-white"><h6 class="mb-0 fw-bold"><i class="fas fa-file-circle-check text-success me-2"></i>Surat Balasan</h6></div>
                            <div class="card-body d-flex flex-column justify-content-between gap-3">
                                <p class="text-muted small mb-0">${row.balasan ? 'Surat balasan dari pembimbing sudah tersedia.' : 'Tombol lihat dan unduh akan tersedia setelah pembimbing mengunggah surat balasan.'}</p>
                                ${documentActions(row.participant, 'balasan', row.balasan, false)}
                            </div>
                        </section>
                    </div>
                </div>
            `;
        }

        function renderMentorPage(rows) {
            root.innerHTML = `
                <div class="mb-4">
                    <h5 class="page-title mb-1">Arsip Dokumen Magang</h5>
                    <p class="page-subtitle mb-0">Lihat surat permohonan peserta dan kelola surat balasan untuk anak bimbingan.</p>
                </div>
                <div class="alert alert-info small"><i class="fas fa-circle-info me-2"></i>Unggah surat balasan resmi yang telah ditandatangani Dishub. Berkas PDF maksimal 5 MB.</div>
                <div class="card table-card">
                    <div class="card-body">
                        ${rows.length ? `<div class="table-responsive"><table class="table table-hover align-middle mb-0 archive-table archive-table--mentor">
                            <colgroup><col><col><col><col></colgroup>
                            <thead><tr><th>Peserta Magang</th><th class="text-center">Status Arsip</th><th>Surat Permohonan</th><th>Surat Balasan</th></tr></thead>
                            <tbody>${rows.map(function(row) {
                                var complete = row.permohonan && row.balasan;
                                return `<tr>
                                    <td class="archive-participant-cell"><strong>${escapeHtml(row.participant.nama)}</strong><div class="small text-muted">${escapeHtml(row.participant.nim)}</div><div class="small text-muted">${escapeHtml(row.participant.instansi)}</div></td>
                                    <td class="text-center"><span class="badge ${complete ? 'bg-success' : 'bg-secondary'}">${complete ? 'Lengkap' : 'Pending'}</span></td>
                                    <td>${documentActions(row.participant, 'permohonan', row.permohonan, false)}</td>
                                    <td>${documentActions(row.participant, 'balasan', row.balasan, true)}</td>
                                </tr>`;
                            }).join('')}</tbody>
                        </table></div>` : '<div class="empty-state py-5"><i class="fas fa-folder-open"></i><h6>Tidak ada anak bimbingan</h6></div>'}
                    </div>
                </div>
            `;
        }

        function renderAdminPage(rows) {
            root.innerHTML = `
                <div class="mb-4">
                    <h5 class="page-title mb-1">Arsip Dokumen Magang</h5>
                    <p class="page-subtitle mb-0">Monitoring kelengkapan dokumen peserta tanpa mengubah arsip.</p>
                </div>
                <div class="card table-card">
                    <div class="card-body">
                        <div class="table-responsive"><table class="table table-hover align-middle mb-0 archive-table archive-table--admin">
                            <colgroup><col><col><col><col></colgroup>
                            <thead><tr><th>Peserta Magang</th><th>Asal Sekolah / Kampus</th><th>Status Arsip</th><th class="text-center">Arsip</th></tr></thead>
                            <tbody>${rows.map(function(row, index) {
                                var complete = row.permohonan && row.balasan;
                                return `<tr>
                                    <td class="archive-participant-cell"><strong>${escapeHtml(row.participant.nama)}</strong><div class="small text-muted">${escapeHtml(row.participant.nim)}</div></td>
                                    <td class="archive-origin-cell">${escapeHtml(row.participant.instansi)}</td>
                                    <td><span class="badge ${complete ? 'bg-success' : 'bg-secondary'}">${complete ? 'Lengkap' : 'Pending'}</span></td>
                                    <td class="text-center"><button type="button" class="btn btn-outline-primary btn-sm archive-admin-action" data-archive-action="admin-details" data-index="${index}"><i class="fas fa-folder-open me-1"></i>Lihat Arsip</button></td>
                                </tr>`;
                            }).join('')}</tbody>
                        </table></div>
                    </div>
                </div>
            `;
            root.querySelectorAll('[data-archive-action="admin-details"]').forEach(function(button) {
                button.addEventListener('click', function() {
                    showAdminDetails(rows[Number(button.dataset.index)]);
                });
            });
        }

        function showAdminDetails(row) {
            var documents = [
                { type: 'permohonan', record: row.permohonan },
                { type: 'balasan', record: row.balasan }
            ];
            Swal.fire({
                title: 'Arsip ' + escapeHtml(row.participant.nama),
                html: '<div class="text-start">' + documents.map(function(item) {
                    return '<div class="border rounded p-3 mb-2"><div class="fw-semibold mb-2">' +
                        labelByType[item.type] + '</div>' +
                        (item.record
                            ? '<div class="small text-muted text-break mb-2">' + escapeHtml(item.record.name) + '</div>' +
                              '<button type="button" class="btn btn-outline-primary btn-sm me-2" data-admin-document="preview" data-type="' + item.type + '"><i class="fas fa-eye me-1"></i>Lihat</button>' +
                              '<button type="button" class="btn btn-outline-secondary btn-sm" data-admin-document="download" data-type="' + item.type + '"><i class="fas fa-download me-1"></i>Unduh</button>'
                            : '<span class="badge bg-secondary">Pending</span>') + '</div>';
                }).join('') + '</div>',
                showConfirmButton: false,
                showCloseButton: true,
                didOpen: function() {
                    document.querySelectorAll('[data-admin-document]').forEach(function(button) {
                        button.addEventListener('click', function() {
                            var action = button.dataset.adminDocument === 'preview' ? preview : download;
                            action(row.participant, button.dataset.type).catch(notifyError);
                        });
                    });
                }
            });
        }

        root.addEventListener('click', function(event) {
            var button = event.target.closest('[data-archive-action="upload"]');
            if (!button) return;
            var input = root.querySelector('[data-archive-input="' + button.dataset.nim + ':' + button.dataset.type + '"]');
            if (input) input.click();
        });
        root.addEventListener('change', function(event) {
            var input = event.target.closest('[data-archive-input]');
            if (!input || !input.files || !input.files[0]) return;
            var file = input.files[0];
            var parts = input.dataset.archiveInput.split(':');
            var target = window.getMasterPeserta(parts[0]);
            if (!target) {
                notifyError(new Error('Data peserta tidak ditemukan.'));
                return;
            }
            if ((file.type && file.type !== 'application/pdf') || !/\.pdf$/i.test(file.name)) {
                Swal.fire('Format Tidak Valid', 'Berkas surat harus berformat PDF.', 'warning');
                input.value = '';
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                Swal.fire('Berkas Terlalu Besar', 'Ukuran file PDF maksimal 5 MB.', 'warning');
                input.value = '';
                return;
            }
            save(target, parts[1], file).then(function() {
                input.value = '';
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Dokumen berhasil disimpan', showConfirmButton: false, timer: 1800 });
                return refresh();
            }).catch(notifyError);
        });
        root.addEventListener('click', function(event) {
            var button = event.target.closest('[data-archive-action="preview"], [data-archive-action="download"]');
            if (!button) return;
            var target = window.getMasterPeserta(button.dataset.nim);
            var action = button.dataset.archiveAction === 'preview' ? preview : download;
            if (target) action(target, button.dataset.type).catch(notifyError);
        });

        refresh();
    }

    window.arsipDokumen = {
        get: get,
        save: save,
        preview: preview,
        download: download
    };

    $(document).ready(renderArchivePage);
})();
