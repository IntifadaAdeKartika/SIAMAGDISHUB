/* pembimbing-absensi.js
   Verifikasi absensi, permintaan revisi, dan upload paraf digital ke backend.
 */

$(document).ready(function() {
    var records = [];
    var currentId = null;
    var currentDetail = null;
    var verificationProcessActive = false;
    var revisionRequestActive = false;
    var statusVerificationFilter = '';
    var absensiParamHandled = false;
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

    function formatDateTimeLabel(value) {
        if (!value) return '-';
        if (typeof window.apiFormatDateTime === 'function') return window.apiFormatDateTime(value).full;
        return String(value).replace('T', ' ').slice(0, 16);
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
            nama: account.nama_lengkap || participant.nama_lengkap || item.nama_lengkap || item.nama || '-',
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
            catatan: item.keterangan || '',
            jumlah_resubmit: Number(item.jumlah_resubmit || 0),
            alasan_penolakan: item.alasan_penolakan || '',
            riwayat_penolakan: Array.isArray(item.riwayat_penolakan) ? item.riwayat_penolakan : [],
            catatan_pembimbing: item.catatan_pembimbing || '',
            revisi_diminta: Boolean(item.revisi_diminta),
            revisi_diminta_pada: item.revisi_diminta_pada || '',
            revisi_dikirim_pada: item.revisi_dikirim_pada || '',
            riwayat_revisi: Array.isArray(item.riwayat_revisi) ? item.riwayat_revisi : []
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

    function isWaitingRevision(item) {
        return item.status_verif === 'pending' && item.revisi_diminta;
    }

    function isRevisionSent(item) {
        return item.status_verif === 'pending' && !item.revisi_diminta && Boolean(item.revisi_dikirim_pada);
    }

    function canActOn(item) {
        return item.status_verif === 'pending' && !item.revisi_diminta;
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
        $('#btnVerifikasiSemua, #btnParafDariModal, #btnTolakDariModal, #btnMintaRevisiDariModal, .btn-paraf-langsung, .btn-tolak-langsung, .btn-minta-revisi-langsung')
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

    function statusBadge(item) {
        if (item.status_verif === 'approved') {
            return '<span class="badge badge-approved">Approved</span>';
        }
        if (item.status_verif === 'rejected') {
            return '<span class="badge badge-rejected">Rejected</span>';
        }
        if (item.revisi_diminta) {
            return '<span class="badge badge-revisi"><i class="fas fa-rotate-left me-1"></i>Menunggu Revisi Peserta</span>';
        }
        if (item.revisi_dikirim_pada) {
            return '<span class="badge badge-pending"><i class="fas fa-hourglass-half me-1"></i>Menunggu Verifikasi Ulang</span>';
        }
        return '<span class="badge badge-pending">Pending</span>';
    }

    function statusMetaHtml(item) {
        var html = '';
        if (item.status_verif === 'approved' && item.paraf) {
            html += '<img src="' + escapeHtml(fileUrl(item.paraf)) + '" alt="Paraf" style="height:30px;margin-top:5px;">';
        }
        if (item.catatan_pembimbing) {
            html += '<div class="small text-muted text-truncate" style="max-width:220px;" title="' +
                escapeHtml(item.catatan_pembimbing) + '">' + escapeHtml(item.catatan_pembimbing) + '</div>';
        }
        if (item.revisi_diminta && item.revisi_diminta_pada) {
            html += '<div class="small text-warning-emphasis">Diminta: ' +
                escapeHtml(formatDateTimeLabel(item.revisi_diminta_pada)) + '</div>';
        }
        if (item.revisi_dikirim_pada) {
            html += '<div class="small text-info-emphasis">Dikirim ulang: ' +
                escapeHtml(formatDateTimeLabel(item.revisi_dikirim_pada)) + '</div>';
        }
        if (item.riwayat_revisi.length) {
            html += '<div class="small text-muted">Pernah direvisi ' + item.riwayat_revisi.length + '×</div>';
        }
        return html;
    }

    function renderTable() {
        table.clear();
        var visibleRecords = records.filter(function(item) {
            if (!statusVerificationFilter) return true;
            if (statusVerificationFilter === 'revisi') return item.revisi_diminta;
            if (statusVerificationFilter === 'revisi_terkirim') return isRevisionSent(item);
            return String(item.status_verif || '').toLowerCase() === statusVerificationFilter;
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
            var resubmitBadge = item.jumlah_resubmit > 0
                ? ' <span class="badge bg-info text-dark">Pengajuan Ulang #' + escapeHtml(item.jumlah_resubmit) + '</span>'
                : '';
            var verification;
            if (item.status_verif === 'approved') {
                var parafUrl = fileUrl(item.paraf);
                verification = '<span class="badge badge-approved">Approved</span>' + resubmitBadge +
                    (parafUrl ? '<br><img src="' + escapeHtml(parafUrl) +
                        '" alt="Paraf" style="height: 30px; margin-top: 5px;">' : '') +
                    statusMetaHtml(item);
            } else if (item.status_verif === 'rejected') {
                verification = '<span class="badge badge-rejected">Rejected</span>' +
                    (item.alasan_penolakan
                        ? '<div class="small text-danger mt-1 text-truncate" style="max-width:220px;" title="' +
                            escapeHtml(item.alasan_penolakan) + '">' + escapeHtml(item.alasan_penolakan) + '</div>'
                        : '');
            } else {
                verification = statusBadge(item) + resubmitBadge + statusMetaHtml(item);
            }
            var action = '<div class="action-buttons text-center"><button class="btn btn-sm btn-outline-primary btn-detail-absen" data-id="' +
                escapeHtml(item.id) + '"><i class="fas fa-eye me-1"></i>Detail</button>' +
                (canActOn(item)
                    ? ' <button class="btn btn-sm btn-outline-success btn-paraf-langsung" data-id="' + escapeHtml(item.id) + '" title="Setujui Absensi"' + (verificationProcessActive ? ' disabled' : '') + '><i class="fas fa-check"></i></button>' +
                      ' <button class="btn btn-sm btn-outline-warning btn-minta-revisi-langsung" data-id="' + escapeHtml(item.id) + '" title="Minta Revisi"' + (verificationProcessActive ? ' disabled' : '') + '><i class="fas fa-rotate-left"></i></button>' +
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
        return window.apiRequestAll('/pembimbing/absensi?per_page=100', [
            'absensi', 'presensi', 'items'
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
                if (loaded) handleAbsensiParam();
                return loaded;
            });
    }

    function handleAbsensiParam() {
        if (absensiParamHandled) return;
        var params = new URLSearchParams(window.location.search);
        var id = params.get('absensi');
        if (!id) return;
        absensiParamHandled = true;
        if (window.history && typeof window.history.replaceState === 'function') {
            try {
                var url = new URL(window.location.href);
                url.searchParams.delete('absensi');
                window.history.replaceState(null, '', url.pathname + (url.search ? url.search : '') + url.hash);
            } catch (error) {
                window.history.replaceState(null, '', window.location.pathname);
            }
        }
        var item = records.find(function(row) { return String(row.id) === String(id); });
        openDetail(item || { id: id, nama: '-', instansi: '-', tanggal: '', waktu: '-', status_verif: 'pending', status_event: '' });
    }

    function requestSignature(title, description) {
        return Swal.fire({
            title: title,
            html: '<p>' + description + '</p><label for="parafDigital" class="form-label text-start w-100">Pilih gambar paraf (maks. 5 MB)</label><input id="parafDigital" type="file" class="form-control" accept="image/*" required>',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Setujui Absensi',
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
        if (status === 'rejected') {
            formData.append('alasan_penolakan', catatan || '');
        } else if (signature) {
            formData.append('paraf_digital', signature, signature.name);
        }
        return fetch(apiUrl('/verifikasi-absensi/' + encodeURIComponent(id)), {
            method: 'POST',
            body: formData,
            headers: { Accept: 'application/json' }
        }).then(readResponse);
    }

    function approveOne(item) {
        if (!beginVerification()) return;
        var revisionNote = isRevisionSent(item)
            ? '<p class="small text-info-emphasis mb-2">Peserta sudah mengirim hasil revisi pada ' +
                escapeHtml(formatDateTimeLabel(item.revisi_dikirim_pada)) + '. Data terbaru akan disetujui.</p>'
            : '';
        requestSignature('Setujui Absensi?', revisionNote + '<p class="small mb-0">Setujui absensi ' +
            escapeHtml(item.nama) + ' tanggal ' + escapeHtml(item.tanggal) + '.</p>')
            .then(function(result) {
                if (!result.isConfirmed) return;
                return postVerification(item.id, 'approved', '', result.value)
                    .then(function(responseData) {
                        return loadAttendance(true).then(function(loaded) {
                            return Swal.fire({
                                icon: loaded ? 'success' : 'warning',
                                title: loaded ? 'Absensi Disetujui' : 'Verifikasi Tersimpan, Daftar Belum Diperbarui',
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
        var jenisPresensi = item.status_event === 'keluar' ? 'Check-out' : 'Check-in';
        Swal.fire({
            title: 'Tolak Presensi?',
            html: '<p class="small text-muted mb-2">Peserta: <strong>' + escapeHtml(item.nama) + '</strong> · ' +
                escapeHtml(jenisPresensi) + ' tanggal ' + escapeHtml(item.tanggal) + '</p>' +
                '<label class="form-label text-start w-100" for="catatanTolakAbsen">Keterangan Penolakan</label>' +
                '<textarea id="catatanTolakAbsen" class="form-control mb-3" rows="3" placeholder="Tuliskan alasan penolakan..."></textarea>' +
                '<div class="small text-muted text-start">Peserta akan menerima notifikasi beserta alasan ini untuk memperbaiki presensinya.</div>',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Kirim Penolakan ke Peserta',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#dc3545',
            preConfirm: function() {
                var popup = Swal.getPopup();
                var reason = popup.querySelector('#catatanTolakAbsen').value.trim();
                if (!reason) {
                    Swal.showValidationMessage('Keterangan penolakan wajib diisi.');
                    return false;
                }
                if (reason.length > 500) {
                    Swal.showValidationMessage('Keterangan penolakan maksimal 500 karakter.');
                    return false;
                }
                return { reason: reason };
            }
        }).then(function(result) {
            if (!result.isConfirmed) return;
            return postVerification(item.id, 'rejected', result.value.reason, null)
                .then(function(responseData) {
                    return loadAttendance(true).then(function(loaded) {
                        return Swal.fire({
                            icon: loaded ? 'success' : 'warning',
                            title: loaded ? 'Penolakan Terkirim' : 'Penolakan Tersimpan, Daftar Belum Diperbarui',
                            text: window.apiResponseMessage(responseData, 'Penolakan berhasil dikirim kepada peserta.') +
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

    function partRow(detail, key) {
        return detail && detail.pasangan && detail.pasangan[key] ? detail.pasangan[key] : null;
    }

    function partBlockReason(row) {
        if (!row) return 'belum tersedia';
        var status = String(row.status_verifikasi || 'pending').toLowerCase();
        if (status === 'approved') return 'sudah disetujui';
        if (status === 'rejected') return 'menunggu perbaikan peserta';
        if (row.revisi_diminta) return 'sedang menunggu revisi peserta';
        return '';
    }

    function partEligible(row) {
        return Boolean(row) && String(row.status_verifikasi || '') === 'pending' && !row.revisi_diminta;
    }

    function openRevisiModal(item) {
        currentId = item.id;
        var detailModalEl = document.getElementById('modalVerifAbsen');
        var detailInstance = bootstrap.Modal.getInstance(detailModalEl);
        if (detailInstance && detailModalEl.classList.contains('show')) detailInstance.hide();

        $('#catatanRevisiAbsen').val('');
        $('#bagianRevisiHint').text('');
        $('#bagianRevisiAbsen option').prop('disabled', false);
        $('#infoRevisiAbsen').html('<strong>' + escapeHtml(item.nama) + '</strong> · ' +
            escapeHtml(item.tanggal || '-') + ' · ' + escapeHtml(item.waktu || '-'));

        var original = $('#btnKirimRevisiAbsen').data('originalHtml') ||
            $('#btnKirimRevisiAbsen').html();
        $('#btnKirimRevisiAbsen').data('originalHtml', original)
            .prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-1"></i>Memuat...');

        window.apiRequest('/pembimbing/absensi/' + encodeURIComponent(item.id)).then(function(payload) {
            var detail = window.apiResponseData(payload);
            var checkIn = partRow(detail, 'check_in');
            var checkOut = partRow(detail, 'check_out');
            var reasons = [];
            var eligibleCheckIn = partEligible(checkIn);
            var eligibleCheckOut = partEligible(checkOut);

            $('#bagianRevisiAbsen option[value="check-in"]').prop('disabled', !eligibleCheckIn);
            $('#bagianRevisiAbsen option[value="check-out"]').prop('disabled', !eligibleCheckOut);
            $('#bagianRevisiAbsen option[value="both"]').prop('disabled', !(eligibleCheckIn && eligibleCheckOut));

            if (!eligibleCheckIn && checkIn === null) reasons.push('Check-in belum tersedia');
            else if (!eligibleCheckIn && checkIn) reasons.push('Check-in ' + partBlockReason(checkIn));
            if (!eligibleCheckOut && checkOut === null) reasons.push('Check-out belum tersedia');
            else if (!eligibleCheckOut && checkOut) reasons.push('Check-out ' + partBlockReason(checkOut));
            $('#bagianRevisiHint').text(reasons.length ? reasons.join('. ') + '.' : '');

            var desired = item.status_event === 'keluar' ? 'check-out' : 'check-in';
            if ($('#bagianRevisiAbsen option[value="' + desired + '"]').prop('disabled')) {
                if (eligibleCheckIn) desired = 'check-in';
                else if (eligibleCheckOut) desired = 'check-out';
                else if (eligibleCheckIn && eligibleCheckOut) desired = 'both';
            }
            if ($('#bagianRevisiAbsen option[value="' + desired + '"]').prop('disabled')) {
                $('#btnKirimRevisiAbsen').prop('disabled', false).html(original);
                Swal.fire('Revisi Tidak Tersedia', 'Tidak ada bagian presensi yang dapat diminta revisi saat ini.', 'info');
                return;
            }

            $('#bagianRevisiAbsen').val(desired);
            $('#btnKirimRevisiAbsen').prop('disabled', false).html(original);
            bootstrap.Modal.getOrCreateInstance(document.getElementById('modalMintaRevisiAbsen')).show();
        }).catch(function(error) {
            $('#btnKirimRevisiAbsen').prop('disabled', false).html(original);
            Swal.fire('Detail Absensi Gagal Dimuat', error.message || 'Detail absensi tidak dapat dimuat.', 'error');
        });
    }

    function closeRevisiModal() {
        var el = document.getElementById('modalMintaRevisiAbsen');
        var instance = bootstrap.Modal.getOrCreateInstance(el);
        return new Promise(function(resolve) {
            if (!instance._isShown) {
                resolve();
                return;
            }
            var settled = false;
            var finish = function() {
                if (settled) return;
                settled = true;
                el.removeEventListener('hidden.bs.modal', finish);
                resolve();
            };
            el.addEventListener('hidden.bs.modal', finish);
            var doHide = function() {
                instance.hide();
            };
            if (instance._isTransitioning) {
                el.addEventListener('shown.bs.modal', doHide, { once: true });
            } else {
                doHide();
            }
            setTimeout(finish, 900);
        });
    }

    function submitRevisionRequest() {
        if (revisionRequestActive) return;
        var item = currentItem();
        if (!item) return;
        var bagian = String($('#bagianRevisiAbsen').val() || '');
        var catatan = String($('#catatanRevisiAbsen').val() || '').trim();
        if (!bagian) {
            Swal.fire('Bagian Belum Dipilih', 'Pilih bagian presensi yang perlu direvisi.', 'warning');
            return;
        }
        if (!catatan) {
            Swal.fire('Catatan Wajib Diisi', 'Tuliskan catatan revisi untuk peserta.', 'warning');
            $('#catatanRevisiAbsen').trigger('focus');
            return;
        }
        if (catatan.length > 1000) {
            Swal.fire('Catatan Terlalu Panjang', 'Catatan revisi maksimal 1000 karakter.', 'warning');
            return;
        }

        revisionRequestActive = true;
        var $button = $('#btnKirimRevisiAbsen');
        var original = $button.data('originalHtml') || $button.html();
        $button.data('originalHtml', original)
            .prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-1"></i>Mengirim...');

        window.apiRequest('/pembimbing/absensi/' + encodeURIComponent(item.id) + '/minta-revisi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bagian: bagian, catatan: catatan })
        }).then(function(payload) {
            $('#catatanRevisiAbsen').val('');
            return closeRevisiModal().then(function() {
                return loadAttendance(true);
            }).then(function(loaded) {
                return Swal.fire({
                    icon: loaded ? 'success' : 'warning',
                    title: loaded ? 'Permintaan Revisi Terkirim' : 'Revisi Tersimpan, Daftar Belum Diperbarui',
                    text: window.apiResponseMessage(payload, 'Permintaan revisi berhasil dikirim kepada peserta.') +
                        (loaded ? '' : ' Daftar gagal dimuat ulang; silakan tekan tombol muat ulang.')
                });
            });
        }).catch(function(error) {
            Swal.fire('Permintaan Revisi Gagal', error.message || 'Permintaan revisi gagal dikirim.', 'error');
        }).then(function() {
            revisionRequestActive = false;
            $button.prop('disabled', false).html(original);
        });
    }

    function revisionStatusMeta(status) {
        return {
            menunggu_peserta: { label: 'Menunggu Perbaikan Peserta', cls: 'badge-revisi' },
            siap_dikirim: { label: 'Perbaikan Tersimpan, Belum Dikirim', cls: 'badge-pending' },
            menunggu_verifikasi: { label: 'Menunggu Verifikasi Pembimbing', cls: 'badge-pending' },
            disetujui: { label: 'Disetujui', cls: 'badge-approved' },
            ditolak: { label: 'Ditolak', cls: 'badge-rejected' },
            revisi_diulang: { label: 'Revisi Diulang', cls: 'bg-secondary' }
        }[status] || { label: status || '-', cls: 'badge-pending' };
    }

    function snapshotValue(snapshot, key) {
        if (!snapshot) return '-';
        var value = snapshot[key];
        return value == null || value === '' ? '-' : String(value);
    }

    function snapshotCoordinates(snapshot) {
        if (!snapshot || snapshot.latitude == null || snapshot.longitude == null) return '-';
        return String(snapshot.latitude) + ', ' + String(snapshot.longitude);
    }

    function snapshotPhoto(snapshot) {
        if (!snapshot || !snapshot.foto_selfie) return '<span class="text-muted">-</span>';
        var url = fileUrl(snapshot.foto_selfie);
        return url
            ? '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">Lihat foto</a>'
            : '<span class="text-muted">-</span>';
    }

    function snapshotCompareTable(before, after) {
        var rows = [
            { label: 'Waktu', before: formatDateTimeLabel(snapshotValue(before, 'tanggal_jam')), after: formatDateTimeLabel(snapshotValue(after, 'tanggal_jam')) },
            { label: 'Lokasi', before: snapshotValue(before, 'lokasi'), after: snapshotValue(after, 'lokasi') },
            { label: 'Koordinat', before: snapshotCoordinates(before), after: snapshotCoordinates(after) },
            { label: 'Keterangan', before: snapshotValue(before, 'keterangan'), after: snapshotValue(after, 'keterangan') }
        ];
        var html = '<div class="table-responsive mt-2"><table class="table table-sm table-bordered small mb-2">' +
            '<thead><tr><th style="width:22%">Data</th><th>Sebelum Revisi</th><th>Setelah Revisi</th></tr></thead><tbody>';
        rows.forEach(function(row) {
            var changed = after && row.before !== row.after;
            html += '<tr' + (changed ? ' class="table-warning"' : '') + '><td class="fw-semibold">' + row.label +
                '</td><td>' + escapeHtml(row.before) + '</td><td>' +
                (after ? escapeHtml(row.after) : '<span class="text-muted">Belum ada</span>') + '</td></tr>';
        });
        html += '<tr><td class="fw-semibold">Foto Selfie</td><td>' + snapshotPhoto(before) + '</td><td>' +
            (after ? snapshotPhoto(after) : '<span class="text-muted">Belum ada</span>') + '</td></tr>';
        html += '</tbody></table></div>';
        return html;
    }

    function renderRiwayatRevisi(riwayat) {
        if (!riwayat || !riwayat.length) return '';
        var items = riwayat.map(function(entry, index) {
            var meta = revisionStatusMeta(entry.status);
            var bagian = entry.bagian === 'keluar' || entry.bagian === 'check-out' ? 'Check-out' :
                (entry.bagian === 'masuk' || entry.bagian === 'check-in' ? 'Check-in' : (entry.bagian || '-'));
            var lines = [
                '<div class="small text-muted">Diminta: ' + escapeHtml(formatDateTimeLabel(entry.diminta_pada)) + '</div>'
            ];
            if (entry.diperbaiki_pada) {
                lines.push('<div class="small text-muted">Diperbaiki peserta: ' + escapeHtml(formatDateTimeLabel(entry.diperbaiki_pada)) + '</div>');
            }
            if (entry.dikirim_pada) {
                lines.push('<div class="small text-muted">Dikirim ulang: ' + escapeHtml(formatDateTimeLabel(entry.dikirim_pada)) + '</div>');
            }
            if (entry.diputuskan_pada) {
                lines.push('<div class="small text-muted">Diputuskan: ' + escapeHtml(formatDateTimeLabel(entry.diputuskan_pada)) +
                    ' oleh ' + escapeHtml(entry.diputuskan_oleh_nama || 'Pembimbing') + '</div>');
            }
            if (entry.alasan_penolakan) {
                lines.push('<div class="small text-danger">Alasan penolakan: ' + escapeHtml(entry.alasan_penolakan) + '</div>');
            }
            return '<div class="border-start border-3 border-warning ps-3 mb-3">' +
                '<div class="small fw-semibold">Revisi #' + (index + 1) + ' · ' + escapeHtml(bagian) + ' · ' +
                    '<span class="badge ' + meta.cls + '">' + escapeHtml(meta.label) + '</span></div>' +
                '<div class="small mb-1">' + escapeHtml(entry.catatan || '-') + '</div>' +
                '<div class="small text-muted mb-1">Pembimbing: ' + escapeHtml(entry.pembimbing_nama || '-') + '</div>' +
                lines.join('') +
                (entry.data_sebelum ? snapshotCompareTable(entry.data_sebelum, entry.data_setelah) : '') +
                '</div>';
        }).join('');
        return '<div class="mt-3"><strong>Riwayat Revisi:</strong><div class="mt-2">' + items + '</div></div>';
    }

    function detailRow(raw) {
        if (!raw) return null;
        var formatted = window.apiFormatDateTime(raw.tanggal_jam);
        return {
            id: raw.id,
            tanggal: formatted.date,
            waktu: formatted.time,
            full: formatted.full,
            lokasi: raw.lokasi || '',
            latitude: raw.latitude,
            longitude: raw.longitude,
            foto: fileUrl(raw.foto_selfie_url || raw.foto_selfie),
            status: String(raw.status_verifikasi || 'pending').toLowerCase(),
            keterangan: raw.keterangan || '',
            catatan: raw.catatan_pembimbing || '',
            revisi_diminta: Boolean(raw.revisi_diminta),
            revisi_diminta_pada: raw.revisi_diminta_pada || '',
            revisi_dikirim_pada: raw.revisi_dikirim_pada || '',
            paraf: fileUrl(raw.paraf_pembimbing_url || raw.paraf_pembimbing)
        };
    }

    function rowStatusBadge(row) {
        if (!row) return '<span class="badge bg-light text-muted border">Tidak Ada</span>';
        if (row.status === 'approved') return '<span class="badge badge-approved">Approved</span>';
        if (row.status === 'rejected') return '<span class="badge badge-rejected">Rejected</span>';
        if (row.revisi_diminta) return '<span class="badge badge-revisi"><i class="fas fa-rotate-left me-1"></i>Revisi Diminta</span>';
        if (row.revisi_dikirim_pada) return '<span class="badge badge-pending">Menunggu Verifikasi Ulang</span>';
        return '<span class="badge badge-pending">Pending</span>';
    }

    function partCard(title, row) {
        if (!row) {
            return '<div class="col-md-6"><div class="border rounded p-3 h-100">' +
                '<div class="d-flex justify-content-between align-items-center mb-2"><strong>' + title +
                '</strong><span class="badge bg-light text-muted border">Tidak Ada</span></div>' +
                '<div class="text-muted small">Belum ada data ' + title.toLowerCase() + ' pada tanggal ini.</div></div></div>';
        }
        var info = '<div class="small"><div><span class="text-muted">Waktu:</span> ' + escapeHtml(row.waktu || '-') + '</div>' +
            '<div><span class="text-muted">Lokasi:</span> ' + escapeHtml(row.lokasi || '-') + '</div>' +
            '<div><span class="text-muted">Koordinat:</span> ' +
            escapeHtml(row.latitude == null || row.longitude == null ? '-' : row.latitude + ', ' + row.longitude) + '</div>' +
            (row.keterangan ? '<div><span class="text-muted">Keterangan:</span> ' + escapeHtml(row.keterangan) + '</div>' : '') +
            '</div>';
        var photo = row.foto
            ? '<a href="' + escapeHtml(row.foto) + '" target="_blank" rel="noopener noreferrer">' +
                '<img src="' + escapeHtml(row.foto) + '" alt="Foto selfie" class="img-fluid rounded mt-2" style="max-height:120px;"></a>'
            : '<div class="small text-muted mt-2">Tidak ada foto</div>';
        var revisionInfo = '';
        if (row.revisi_diminta) {
            revisionInfo = '<div class="alert alert-warning py-1 px-2 small mt-2 mb-0">' +
                '<i class="fas fa-rotate-left me-1"></i><strong>Menunggu revisi peserta.</strong>' +
                (row.catatan ? '<div>Catatan: ' + escapeHtml(row.catatan) + '</div>' : '') +
                (row.revisi_diminta_pada ? '<div class="text-muted">Diminta: ' + escapeHtml(formatDateTimeLabel(row.revisi_diminta_pada)) + '</div>' : '') +
                '</div>';
        } else if (row.revisi_dikirim_pada && row.status === 'pending') {
            revisionInfo = '<div class="alert alert-info py-1 px-2 small mt-2 mb-0">' +
                '<i class="fas fa-paper-plane me-1"></i>Peserta mengirim ulang revisi pada ' +
                escapeHtml(formatDateTimeLabel(row.revisi_dikirim_pada)) + '.</div>';
        }
        return '<div class="col-md-6"><div class="border rounded p-3 h-100">' +
            '<div class="d-flex justify-content-between align-items-center mb-2"><strong>' + title + '</strong>' +
            rowStatusBadge(row) + '</div>' + photo + info + revisionInfo + '</div></div>';
    }

    function renderDetail(item, detail) {
        var absensi = detail && detail.absensi ? detail.absensi : null;
        var normalizedAnchor = absensi ? normalize(absensi) : item;
        var checkIn = detailRow(partRow(detail, 'check_in'));
        var checkOut = detailRow(partRow(detail, 'check_out'));
        var anchorRow = absensi
            ? detailRow(String(absensi.status) === 'keluar' ? partRow(detail, 'check_out') : partRow(detail, 'check_in'))
            : null;
        if (!anchorRow) {
            anchorRow = detailRow({
                id: normalizedAnchor.id,
                tanggal_jam: item.tanggal + 'T' + item.waktu,
                lokasi: item.lokasi,
                latitude: item.latitude,
                longitude: item.longitude,
                foto_selfie_url: item.foto,
                status_verifikasi: item.status_verif,
                keterangan: item.catatan,
                catatan_pembimbing: item.catatan_pembimbing,
                revisi_diminta: item.revisi_diminta,
                revisi_diminta_pada: item.revisi_diminta_pada,
                revisi_dikirim_pada: item.revisi_dikirim_pada,
                paraf_pembimbing_url: item.paraf
            });
        }

        var participantName = normalizedAnchor.nama || item.nama || '-';
        var participantSchool = normalizedAnchor.instansi || item.instansi || '-';
        var tanggalLabel = checkIn && checkIn.tanggal ? checkIn.tanggal : (checkOut && checkOut.tanggal ? checkOut.tanggal : item.tanggal);
        var riwayat = detail && Array.isArray(detail.riwayat_revisi)
            ? detail.riwayat_revisi
            : (Array.isArray(item.riwayat_revisi) ? item.riwayat_revisi : []);

        var revisionInfo = '';
        if (anchorRow && anchorRow.revisi_diminta) {
            revisionInfo = '<div class="alert alert-warning py-2 small"><i class="fas fa-rotate-left me-1"></i>' +
                '<strong>Menunggu peserta mengirim ulang revisi.</strong> Presensi dapat diverifikasi kembali setelah revisi dikirim.</div>';
        } else if (anchorRow && anchorRow.status === 'pending' && anchorRow.revisi_dikirim_pada) {
            revisionInfo = '<div class="alert alert-info py-2 small"><i class="fas fa-paper-plane me-1"></i>' +
                'Peserta mengirim ulang revisi pada ' + escapeHtml(formatDateTimeLabel(anchorRow.revisi_dikirim_pada)) +
                '. Mohon periksa hasil revisi.</div>';
        }

        $('#contentModalVerif').html(
            '<div class="mb-3"><strong>Peserta:</strong> ' + escapeHtml(participantName) +
                ' <span class="text-muted">(' + escapeHtml(participantSchool) + ')</span></div>' +
            '<div class="mb-3"><strong>Tanggal Presensi:</strong> ' + escapeHtml(tanggalLabel || '-') + '</div>' +
            '<div class="row g-2 mb-2">' + partCard('Check-in', checkIn) + partCard('Check-out', checkOut) + '</div>' +
            revisionInfo +
            (anchorRow && anchorRow.catatan_pembimbing
                ? '<div class="small mb-2"><strong>Catatan Pembimbing Terakhir:</strong> ' +
                    escapeHtml(anchorRow.catatan_pembimbing) + '</div>'
                : (item.catatan_pembimbing
                    ? '<div class="small mb-2"><strong>Catatan Pembimbing Terakhir:</strong> ' +
                        escapeHtml(item.catatan_pembimbing) + '</div>'
                    : '')) +
            renderRiwayatRevisi(riwayat)
        );

        var canAct = anchorRow ? anchorRow.status === 'pending' && !anchorRow.revisi_diminta : canActOn(item);
        $('#btnParafDariModal, #btnTolakDariModal, #btnMintaRevisiDariModal').toggle(canAct);
        $('#btnMintaRevisiDariModal').html(anchorRow && anchorRow.revisi_dikirim_pada
            ? '<i class="fas fa-rotate-left me-1"></i> Minta Revisi Kembali'
            : '<i class="fas fa-rotate-left me-1"></i> Minta Revisi');
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalVerifAbsen')).show();
    }

    function openDetail(item) {
        currentId = item.id;
        currentDetail = null;
        $('#contentModalVerif').html('<div class="text-center py-4 text-muted">' +
            '<i class="fas fa-spinner fa-spin me-2"></i>Memuat detail presensi...</div>');
        $('#btnParafDariModal, #btnTolakDariModal, #btnMintaRevisiDariModal').hide();
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalVerifAbsen')).show();

        return window.apiRequest('/pembimbing/absensi/' + encodeURIComponent(item.id)).then(function(payload) {
            currentDetail = window.apiResponseData(payload);
            renderDetail(item, currentDetail);
        }).catch(function(error) {
            currentDetail = null;
            renderDetail(item, null);
            $('#contentModalVerif').prepend('<div class="alert alert-warning py-2 small">' +
                '<i class="fas fa-triangle-exclamation me-1"></i>Detail lengkap gagal dimuat: ' +
                escapeHtml(error.message || 'Terjadi kesalahan.') + '</div>');
        });
    }

    function currentItem() {
        var item = records.find(function(row) { return String(row.id) === String(currentId); });
        if (item) return item;
        if (currentDetail && currentDetail.absensi) return normalize(currentDetail.absensi);
        return null;
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
    $('#btnReloadTable').on('click', function() { loadAttendance(); });

    $(document).on('click', '.btn-lihat-foto', function() {
        Swal.fire({ title: 'Foto Selfie Presensi', imageUrl: $(this).data('src'), imageWidth: 450, imageAlt: 'Foto selfie', confirmButtonText: 'Tutup' });
    });
    $(document).on('click', '.btn-paraf-langsung', function() {
        var item = records.find(function(row) { return String(row.id) === String($(this).data('id')); }.bind(this));
        if (item) approveOne(item);
    });
    $(document).on('click', '.btn-minta-revisi-langsung', function() {
        var item = records.find(function(row) { return String(row.id) === String($(this).data('id')); }.bind(this));
        if (item) openRevisiModal(item);
    });
    $(document).on('click', '.btn-tolak-langsung', function() {
        var item = records.find(function(row) { return String(row.id) === String($(this).data('id')); }.bind(this));
        if (item) rejectOne(item);
    });

    function riwayatPenolakanHtml(item) {
        if (!item.riwayat_penolakan.length) return '';
        var rows = item.riwayat_penolakan.slice().reverse().map(function(entry) {
            var oleh = entry.pembimbing_nama ? escapeHtml(entry.pembimbing_nama) : 'Pembimbing';
            return '<li class="mb-1"><span class="text-danger">' + escapeHtml(entry.alasan || '-') + '</span>' +
                '<div class="text-muted" style="font-size:0.72rem;">' + oleh + ' · ' +
                escapeHtml(formatDateTimeLabel(entry.pada)) + '</div></li>';
        }).join('');
        return '<ul class="list-unstyled mb-0">' + rows + '</ul>';
    }

    $(document).on('click', '.btn-detail-absen', function() {
        var item = records.find(function(row) { return String(row.id) === String($(this).data('id')); }.bind(this));
        if (item) openDetail(item);
    });

    $('#btnParafDariModal').on('click', function() {
        var item = currentItem();
        bootstrap.Modal.getInstance(document.getElementById('modalVerifAbsen')).hide();
        if (item) approveOne(item);
    });
    $('#btnMintaRevisiDariModal').on('click', function() {
        var item = currentItem();
        if (item) openRevisiModal(item);
    });
    $('#btnTolakDariModal').on('click', function() {
        var item = currentItem();
        bootstrap.Modal.getInstance(document.getElementById('modalVerifAbsen')).hide();
        if (item) rejectOne(item);
    });
    $('#btnKirimRevisiAbsen').on('click', submitRevisionRequest);

    $('#btnVerifikasiSemua').on('click', function() {
        if (!beginVerification()) return;
        var waiting = records.filter(canActOn);
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