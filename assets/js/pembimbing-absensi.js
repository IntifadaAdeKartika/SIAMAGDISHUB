/* pembimbing-absensi.js
   Verifikasi absensi dan upload paraf digital ke backend.
 */

$(document).ready(function() {
    var records = [];
    var currentId = null;
    var verificationProcessActive = false;
    var statusVerificationFilter = '';
    var user = null;
    try { user = JSON.parse(localStorage.getItem('siamag_user') || 'null'); } catch (error) { user = null; }
    window.setUserTopbar(user, 'pembimbing');

    var table = $('#tabelVerifAbsensi').DataTable({
        language: {
            search: 'Cari Data:',
            lengthMenu: 'Tampilkan _MENU_ data',
            zeroRecords: 'Belum ada data',
            info: 'Menampilkan _START_ sampai _END_ dari _TOTAL_ presensi',
            infoEmpty: 'Menampilkan 0 data',
            infoFiltered: '(disaring dari _MAX_ total data)',
            paginate: { first: 'Awal', last: 'Akhir', next: 'Berikutnya', previous: 'Sebelumnya' }
        },
        order: [[2, 'desc']],
        columnDefs: [{ orderable: false, targets: [4, 8] }]
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

    function readResponse(response) {
        return response.text().then(function(text) {
            var payload = null;
            if (text) {
                try { payload = JSON.parse(text); } catch (error) {
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

    function fileUrl(path) {
        if (!path) return '';
        try {
            return /^https?:/i.test(path) ? new URL(path).href :
                new URL(String(path).replace(/^\//, ''), new URL(apiUrl('/')).origin + '/').href;
        } catch (error) { return ''; }
    }

    function normalize(item) {
        var participant = item.peserta_magang || item.peserta || {};
        var account = participant.pengguna || {};
        var timestamp = item.tanggal_jam || '';
        var date = timestamp ? new Date(timestamp) : null;
        var tanggal = date && !isNaN(date.getTime())
            ? [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
            : String(timestamp).split(/[T ]/)[0];
        var waktu = date && !isNaN(date.getTime())
            ? [date.getHours(), date.getMinutes(), date.getSeconds()].map(function(value) {
                return String(value).padStart(2, '0');
            }).join(':')
            : (String(timestamp).split(/[T ]/)[1] || '').slice(0, 8);
        return {
            id: item.id,
            nim: account.username || item.nim || '',
            nama: account.nama_lengkap || item.nama_lengkap || item.nama || '-',
            instansi: participant.asal_sekolah_kampus || item.asal_sekolah_kampus || '-',
            tanggal: tanggal || '',
            waktu: waktu || '-',
            lokasi: item.lokasi || '',
            latitude: item.latitude,
            longitude: item.longitude,
            foto: item.foto_selfie_url || item.url_foto_selfie || item.foto_selfie || item.foto || '',
            status_event: String(item.status || '').toLowerCase(),
            status_verif: String(item.status_verifikasi || 'pending').toLowerCase(),
            paraf: item.paraf_pembimbing_url || item.paraf_pembimbing || '',
            paraf_oleh: item.diverifikasi_oleh || '',
            waktu_paraf: item.diverifikasi_pada || '',
            catatan: item.keterangan || ''
        };
    }

    function attendanceRecords(rows) {
        return rows.reduce(function(recordsFromMonitoring, row) {
            var status = String(row.status || '').toLowerCase();
            if (row.tanggal_jam || status === 'masuk' || status === 'keluar') {
                recordsFromMonitoring.push(row);
                return recordsFromMonitoring;
            }
            var attendance = row.absensi_hari_ini || row.absensi_terbaru || row.absensi_terakhir || row.absensi || row.presensi_terakhir || [];
            var participant = row.peserta_magang || row.peserta || row;
            var entries = Array.isArray(attendance) ? attendance : attendance && typeof attendance === 'object'
                ? [attendance] : [];
            entries.forEach(function(entry) {
                recordsFromMonitoring.push(Object.assign({}, entry, { peserta_magang: participant }));
            });
            return recordsFromMonitoring;
        }, []);
    }

    function updateStats() {
        $('#statPendingAbsen').text(records.filter(function(row) { return row.status_verif === 'pending'; }).length);
        $('#statDiparaf').text(records.filter(function(row) { return row.status_verif === 'approved'; }).length);
        $('#statDitolakAbsen').text(records.filter(function(row) { return row.status_verif === 'rejected'; }).length);
        $('.stat-card').filter(function() {
            return $(this).find('p').text().trim() === 'Anak Bimbingan';
        }).find('h3').text(new Set(records.map(function(row) { return row.nim; })).size + ' Org');
    }

    function setVerificationControls(disabled) {
        $('#btnVerifikasiSemua, #btnParafDariModal, #btnTolakDariModal, .btn-paraf-langsung, .btn-tolak-langsung')
            .prop('disabled', disabled);
    }

    function beginVerification() {
        if (verificationProcessActive) return false;
        verificationProcessActive = true;
        setVerificationControls(true);
        return true;
    }

    function endVerification() {
        verificationProcessActive = false;
        setVerificationControls(false);
    }

    function renderTable() {
        table.clear();
        var visibleRecords = records.filter(function(item) {
            return !statusVerificationFilter ||
                String(item.status_verif || '').toLowerCase() === statusVerificationFilter;
        });
        visibleRecords.forEach(function(item, index) {
            var imageUrl = fileUrl(item.foto);
            var photo = imageUrl
                ? '<button class="btn btn-link btn-sm p-0 btn-lihat-foto" data-src="' + escapeHtml(imageUrl) + '">Lihat foto</button>'
                : '<span class="text-muted">-</span>';
            var coordinates = item.latitude != null && item.longitude != null
                ? '<span class="small font-monospace">' + escapeHtml(item.latitude) + ', ' + escapeHtml(item.longitude) + '</span>'
                : '<span class="text-muted">-</span>';
            var eventClass = item.status_event === 'masuk' ? 'bg-primary' : 'bg-secondary';
            var eventLabel = item.status_event === 'masuk' ? 'Masuk' : (item.status_event === 'keluar' ? 'Keluar' : item.status_event);
            var parafUrl = item.status_verif === 'approved' ? fileUrl(item.paraf) : '';
            var verification = item.status_verif === 'approved'
                ? '<span class="badge badge-approved">Approved</span>' +
                    (parafUrl ? '<br><img src="' + escapeHtml(parafUrl) +
                        '" alt="Paraf" style="height: 30px; margin-top: 5px;">' : '')
                : item.status_verif === 'rejected'
                    ? '<span class="badge badge-rejected">Rejected</span>'
                    : '<span class="badge badge-pending">Pending</span>';
            var action = '<div class="action-buttons text-center"><button class="btn btn-sm btn-outline-primary btn-detail-absen" data-id="' +
                escapeHtml(item.id) + '"><i class="fas fa-eye me-1"></i>Detail</button>' +
                (item.status_verif === 'pending'
                    ? ' <button class="btn btn-sm btn-outline-success btn-paraf-langsung" data-id="' + escapeHtml(item.id) + '" title="Beri Paraf"' + (verificationProcessActive ? ' disabled' : '') + '><i class="fas fa-check"></i></button>' +
                      ' <button class="btn btn-sm btn-outline-danger btn-tolak-langsung" data-id="' + escapeHtml(item.id) + '" title="Tolak"' + (verificationProcessActive ? ' disabled' : '') + '><i class="fas fa-times"></i></button>'
                    : '') + '</div>';
            table.row.add([
                index + 1,
                '<div><strong>' + escapeHtml(item.nama) + '</strong><div class="small text-muted">' + escapeHtml(item.instansi) + '</div></div>',
                escapeHtml(item.tanggal),
                escapeHtml(item.waktu),
                photo,
                coordinates,
                '<span class="badge ' + eventClass + '">' + escapeHtml(eventLabel) + '</span>',
                verification,
                action
            ]);
        });
        table.draw();
        updateStats();
        var names = Array.from(new Map(records.map(function(row) { return [row.nim, row.nama]; })).values());
        var $filter = $('#filterPeserta').empty().append(new Option('Semua Anak Bimbingan', ''));
        names.forEach(function(name) { $filter.append(new Option(name, name)); });
    }

    function loadAttendance(silent) {
        $('#btnReloadTable').prop('disabled', true);
        window.apiSetTableState(table, 'loading');
        return window.apiRequestAll('/monitoring', [
            'absensi', 'presensi', 'anak_bimbingan', 'peserta_bimbingan',
            'internal', 'peserta', 'data_peserta', 'items'
        ]).then(function(rows) {
                records = attendanceRecords(rows).map(normalize);
                renderTable();
                window.apiSetTableState(table, 'loaded');
                return true;
            }).catch(function(error) {
                window.apiSetTableState(table, 'error');
                if (!silent) Swal.fire('Data Absensi Gagal Dimuat', error.message, 'error');
                return false;
            }).then(function(loaded) {
                $('#btnReloadTable').prop('disabled', false);
                return loaded;
            });
    }

    function requestSignature(title, description) {
        return Swal.fire({
            title: title,
            html: '<p>' + escapeHtml(description) + '</p><label for="parafDigital" class="form-label text-start w-100">Pilih gambar paraf (maks. 5 MB)</label><input id="parafDigital" type="file" class="form-control" accept="image/*" required>',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Kirim Verifikasi',
            cancelButtonText: 'Batal',
            preConfirm: function() {
                var input = Swal.getPopup().querySelector('#parafDigital');
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
                return file;
            }
        });
    }

    function postVerification(id, status, catatan, signature) {
        var formData = new FormData();
        formData.append('status_verifikasi', status);
        if (status === 'rejected') formData.append('alasan_penolakan', catatan);
        formData.append('paraf_digital', signature, signature.name);
        return fetch(apiUrl('/verifikasi-absensi/' + encodeURIComponent(id)), {
            method: 'POST',
            body: formData,
            headers: { Accept: 'application/json' }
        }).then(readResponse);
    }

    function approveOne(item) {
        if (!beginVerification()) return;
        requestSignature('Paraf & Setujui Absensi?', 'Setujui absensi ' + item.nama + ' tanggal ' + item.tanggal + '.')
            .then(function(result) {
                if (!result.isConfirmed) return;
                return postVerification(item.id, 'approved', '', result.value)
                    .then(function(responseData) {
                        return loadAttendance(true).then(function(loaded) {
                            return Swal.fire({
                                icon: loaded ? 'success' : 'warning',
                                title: loaded ? 'Berhasil' : 'Verifikasi Tersimpan, Daftar Belum Diperbarui',
                                text: window.apiResponseMessage(responseData, 'Absensi telah diverifikasi dan diparaf.') +
                                    (loaded ? '' : ' Daftar gagal dimuat ulang; silakan tekan tombol muat ulang.')
                            });
                        });
                    });
            }).catch(function(error) {
                return Swal.fire('Verifikasi Gagal', error.message || 'Verifikasi absensi gagal.', 'error');
            }).then(function() {
                endVerification();
            });
    }

    function rejectOne(item) {
        if (!beginVerification()) return;
        Swal.fire({
            title: 'Tolak Presensi?',
            html: '<label class="form-label text-start w-100" for="catatanTolakAbsen">Keterangan penolakan</label>' +
                '<textarea id="catatanTolakAbsen" class="form-control mb-3" rows="3" placeholder="Tuliskan alasan penolakan..."></textarea>' +
                '<label class="form-label text-start w-100" for="parafTolakAbsen">Paraf pembimbing (gambar, maks. 5 MB)</label>' +
                '<input id="parafTolakAbsen" type="file" class="form-control" accept="image/*" required>',
            showCancelButton: true,
            confirmButtonText: 'Tolak Presensi',
            cancelButtonText: 'Batal',
            preConfirm: function() {
                var popup = Swal.getPopup();
                var reason = popup.querySelector('#catatanTolakAbsen').value.trim();
                var signature = popup.querySelector('#parafTolakAbsen').files[0];
                if (!reason) {
                    Swal.showValidationMessage('Keterangan penolakan wajib diisi.');
                    return false;
                }
                if (!signature || !signature.type || signature.type.indexOf('image/') !== 0) {
                    Swal.showValidationMessage('Pilih file paraf berupa gambar.');
                    return false;
                }
                if (signature.size > 5 * 1024 * 1024) {
                    Swal.showValidationMessage('Ukuran file paraf maksimal 5 MB.');
                    return false;
                }
                return { reason: reason, signature: signature };
            }
        }).then(function(result) {
            if (!result.isConfirmed) return;
            return postVerification(item.id, 'rejected', result.value.reason, result.value.signature)
                .then(function(responseData) {
                    return loadAttendance(true).then(function(loaded) {
                        return Swal.fire({
                            icon: loaded ? 'success' : 'warning',
                            title: loaded ? 'Berhasil' : 'Verifikasi Tersimpan, Daftar Belum Diperbarui',
                            text: window.apiResponseMessage(responseData, 'Presensi ditolak.') +
                                (loaded ? '' : ' Daftar gagal dimuat ulang; silakan tekan tombol muat ulang.')
                        });
                    });
            });
        }).catch(function(error) {
            return Swal.fire('Penolakan Gagal', error.message || 'Penolakan absensi gagal.', 'error');
        }).then(function() {
            endVerification();
        });
    }

    $('#filterPeserta').on('change', function() { table.column(1).search($(this).val()).draw(); });
    $('#filterStatusVerif').on('change', function() {
        statusVerificationFilter = String($(this).val() || '').toLowerCase();
        renderTable();
    });
    $('#btnResetFilter').on('click', function() {
        $('#filterPeserta, #filterStatusVerif').val('');
        statusVerificationFilter = '';
        table.search('').columns().search('');
        renderTable();
    });
    $('#btnReloadTable').on('click', loadAttendance);

    $(document).on('click', '.btn-lihat-foto', function() {
        Swal.fire({ title: 'Foto Selfie Presensi', imageUrl: $(this).data('src'), imageWidth: 450, imageAlt: 'Foto selfie', confirmButtonText: 'Tutup' });
    });
    $(document).on('click', '.btn-paraf-langsung', function() {
        var item = records.find(function(row) { return String(row.id) === String($(this).data('id')); }.bind(this));
        if (item) approveOne(item);
    });
    $(document).on('click', '.btn-tolak-langsung', function() {
        var item = records.find(function(row) { return String(row.id) === String($(this).data('id')); }.bind(this));
        if (item) rejectOne(item);
    });

    $(document).on('click', '.btn-detail-absen', function() {
        var item = records.find(function(row) { return String(row.id) === String($(this).data('id')); }.bind(this));
        if (!item) return;
        currentId = item.id;
        var imageUrl = fileUrl(item.foto);
        var parafUrl = item.status_verif === 'approved' ? fileUrl(item.paraf) : '';
        var eventLabel = item.status_event === 'masuk' ? 'Masuk' :
            (item.status_event === 'keluar' ? 'Keluar' : item.status_event || '-');
        var verificationStatus = item.status_verif === 'approved'
            ? 'Diverifikasi'
            : item.status_verif === 'rejected' ? 'Ditolak' : 'Menunggu';
        $('#contentModalVerif').html(
            '<div class="text-center mb-3">' +
                (imageUrl
                    ? '<img src="' + escapeHtml(imageUrl) + '" alt="Foto selfie" class="img-fluid rounded" style="max-height:260px;">'
                    : '<span class="text-muted">Tidak ada foto selfie</span>') +
            '</div>' +
            '<dl class="row small"><dt class="col-5">Nama Peserta Magang</dt><dd class="col-7">' + escapeHtml(item.nama) +
            '</dd><dt class="col-5">Asal Sekolah / Kampus</dt><dd class="col-7">' + escapeHtml(item.instansi) +
            '</dd><dt class="col-5">Tanggal Presensi</dt><dd class="col-7">' + escapeHtml(item.tanggal) +
            '</dd><dt class="col-5">Waktu</dt><dd class="col-7">' + escapeHtml(item.waktu) +
            '</dd><dt class="col-5">Lokasi</dt><dd class="col-7">' +
            escapeHtml(item.lokasi || '-') + '</dd><dt class="col-5">Koordinat</dt><dd class="col-7">' +
            escapeHtml(item.latitude == null || item.longitude == null ? '-' : item.latitude + ', ' + item.longitude) +
            '</dd><dt class="col-5">Status Presensi</dt><dd class="col-7">' + escapeHtml(eventLabel) +
            '</dd><dt class="col-5">Status Verifikasi</dt><dd class="col-7">' +
            escapeHtml(verificationStatus) + '</dd>' +
            (parafUrl
                ? '<dt class="col-5">Paraf Pembimbing</dt><dd class="col-7"><img src="' +
                    escapeHtml(parafUrl) + '" alt="Paraf" style="height: 30px; margin-top: 5px;"></dd>'
                : '') +
            '</dl>'
        );
        $('#btnParafDariModal, #btnTolakDariModal').toggle(item.status_verif === 'pending');
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalVerifAbsen')).show();
    });
    $('#btnParafDariModal').on('click', function() {
        var item = records.find(function(row) { return String(row.id) === String(currentId); });
        bootstrap.Modal.getInstance(document.getElementById('modalVerifAbsen')).hide();
        if (item) approveOne(item);
    });
    $('#btnTolakDariModal').on('click', function() {
        var item = records.find(function(row) { return String(row.id) === String(currentId); });
        bootstrap.Modal.getInstance(document.getElementById('modalVerifAbsen')).hide();
        if (item) rejectOne(item);
    });

    $('#btnVerifikasiSemua').on('click', function() {
        if (!beginVerification()) return;
        var waiting = records.filter(function(item) { return item.status_verif === 'pending'; });
        if (!waiting.length) {
            endVerification();
            Swal.fire('Info', 'Tidak ada absensi yang menunggu verifikasi.', 'info');
            return;
        }
        requestSignature('Paraf Semua Absensi?', 'Akan memverifikasi ' + waiting.length + ' data absensi.')
            .then(function(result) {
                if (!result.isConfirmed) return;
                var completed = 0;
                return waiting.reduce(function(queue, item) {
                    return queue.then(function() {
                        return postVerification(item.id, 'approved', '', result.value)
                                .then(function() { completed++; });
                    });
                }, Promise.resolve()).then(function() {
                    return loadAttendance(true).then(function(loaded) {
                        return Swal.fire('Berhasil', completed + ' absensi telah diverifikasi.', 'success');
                    });
                }).catch(function(error) {
                    return loadAttendance(true).then(function() {
                        return Swal.fire('Paraf Massal Tidak Selesai',
                            completed + ' dari ' + waiting.length + ' absensi berhasil diverifikasi. ' + error.message,
                            'error');
                    });
                });
            }).catch(function(error) {
                return Swal.fire('Paraf Massal Tidak Selesai', error.message || 'Verifikasi massal gagal.', 'error');
            }).then(function() {
                endVerification();
            });
    });

    loadAttendance();
});
