/* pembimbing-monitoring.js
   Monitoring peserta melalui API backend.
 */

$(document).ready(function() {
    var anakBimbingan = [];
    var lintasBidang = [];
    var table = $('#tabelLintasBidang').DataTable({
        language: {
            search: 'Cari Peserta / Unit:',
            lengthMenu: 'Tampilkan _MENU_ data',
            zeroRecords: 'Belum ada data',
            info: 'Menampilkan _START_ sampai _END_ dari _TOTAL_ peserta lintas bidang',
            infoEmpty: 'Menampilkan 0 data',
            infoFiltered: '(disaring dari _MAX_ total data)',
            paginate: { first: 'Awal', last: 'Akhir', next: 'Berikutnya', previous: 'Sebelumnya' }
        },
        pageLength: 10,
        order: [[1, 'asc']]
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

    function escapeRegex(value) {
        return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function readResponse(response) {
        return response.text().then(function(text) {
            var payload = null;
            if (text) {
                try { payload = JSON.parse(text); } catch (error) {
                    if (!response.ok) throw new Error('Gagal memuat monitoring (HTTP ' + response.status + ').');
                    throw new Error('Server mengembalikan respons yang tidak valid.');
                }
            }
            if (!response.ok) {
                throw new Error(window.apiResponseMessage(payload, 'Gagal memuat monitoring (HTTP ' + response.status + ').'));
            }
            if (payload && payload.success === false) {
                throw new Error(window.apiResponseMessage(payload, 'Gagal memuat monitoring.'));
            }
            return window.apiResponseData(payload);
        });
    }

    function setUserInfo() {
        var user = null;
        try { user = JSON.parse(localStorage.getItem('siamag_user') || 'null'); } catch (error) { user = null; }
        window.setUserTopbar(user, 'pembimbing');
    }

    function todayString() {
        var today = new Date();
        return today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' +
            String(today.getDate()).padStart(2, '0');
    }

    function hasTodayDate(value) {
        if (!value) return false;
        var dateText = String(value).trim();
        var datePart = '';
        if (/[zZ]|[+-]\d{2}:\d{2}$/.test(dateText)) {
            var zonedDate = new Date(value);
            if (!Number.isNaN(zonedDate.getTime())) {
                datePart = zonedDate.getFullYear() + '-' + String(zonedDate.getMonth() + 1).padStart(2, '0') + '-' +
                    String(zonedDate.getDate()).padStart(2, '0');
            }
        } else if (/^\d{4}-\d{2}-\d{2}/.test(dateText)) {
            datePart = dateText.slice(0, 10);
        }
        if (!datePart) {
            var parsedDate = new Date(value);
            if (Number.isNaN(parsedDate.getTime())) return false;
            datePart = parsedDate.getFullYear() + '-' + String(parsedDate.getMonth() + 1).padStart(2, '0') + '-' +
                String(parsedDate.getDate()).padStart(2, '0');
        }
        return datePart === todayString();
    }

    function activityDate(item) {
        return item.tanggal_jam || item.tanggal || item.tanggal_absensi || item.tanggal_presensi ||
            item.attendance_date || item.tanggal_kegiatan || item.date || item.created_at || '';
    }

    function participantActivityDate(item) {
        return item.tanggal_jam || item.tanggal || item.tanggal_absensi || item.tanggal_presensi ||
            item.attendance_date || item.tanggal_kegiatan || item.date || '';
    }

    function todayRecord(source) {
        var records = Array.isArray(source) ? source : source && typeof source === 'object' ? [source] : [];
        var matching = records.filter(function(item) {
            if (!item || typeof item !== 'object' || Object.keys(item).length === 0) return false;
            var dateValue = activityDate(item);
            return !!dateValue && hasTodayDate(dateValue);
        });
        matching.sort(function(left, right) {
            return String(activityDate(right)).localeCompare(String(activityDate(left)));
        });
        var datedMatch = matching.find(function(item) { return !!activityDate(item); });
        return datedMatch || matching.find(function(item) { return !activityDate(item); }) || null;
    }

    function normalizeParticipant(record) {
        var participant = record.peserta_magang || record.peserta || record;
        var account = participant.pengguna || participant.user || {};
        var attendance = todayRecord(record.absensi_terakhir) || todayRecord(record.absensi) ||
            todayRecord(record.presensi_terakhir) || todayRecord(record.presensi) ||
            todayRecord(participant.absensi_terakhir) || todayRecord(participant.absensi) ||
            todayRecord(participant.presensi_terakhir) || todayRecord(participant.presensi);
        var logbook = todayRecord(record.logbook_terakhir) || todayRecord(record.logbook) ||
            todayRecord(participant.logbook_terakhir) || todayRecord(participant.logbook);
        var directActivityDate = participantActivityDate(record);
        var recordIsToday = !!directActivityDate && hasTodayDate(directActivityDate);
        if (!attendance && recordIsToday && (record.status_presensi || record.status_hadir || record.tanggal_jam)) {
            attendance = record;
        }
        if (!logbook && recordIsToday && (record.status_logbook || record.status_logbook_terakhir)) {
            logbook = record;
        }
        attendance = attendance || {};
        logbook = logbook || {};
        var directAttendanceStatus = record.status_presensi_hari_ini || record.status_presensi ||
            participant.status_presensi_hari_ini || participant.status_presensi || '';
        var placement = participant.penempatan || record.penempatan || {};
        var academic = participant.pembimbing_akademik || record.pembimbing_akademik || {};
        var academicAccount = academic && typeof academic === 'object'
            ? academic.pengguna || academic.user || {}
            : {};
        var attendanceStatus = attendance.status_presensi || attendance.status_hadir ||
            attendance.status || directAttendanceStatus ||
            (attendance === record ? record.status_presensi || record.status_hadir : '');
        attendanceStatus = String(attendanceStatus || '');
        var normalizedAttendanceStatus = attendanceStatus.toLowerCase();
        if (normalizedAttendanceStatus === 'masuk' || normalizedAttendanceStatus === 'keluar') {
            attendanceStatus = normalizedAttendanceStatus.charAt(0).toUpperCase() +
                normalizedAttendanceStatus.slice(1);
        }
        var attendanceTimestamp = attendance.tanggal_jam || attendance.tanggal || '';
        var attendanceTime = attendance.jam_masuk || attendance.check_in || attendance.waktu ||
            attendance.jam || '';
        if (!attendanceTime && attendanceTimestamp) {
            attendanceTime = String(attendanceTimestamp).split(/[T ]/)[1] || attendanceTimestamp;
        }
        attendanceTime = attendanceTime === '-' ? '' : String(attendanceTime).slice(0, 5);
        var academicName = typeof academic === 'string' || typeof academic === 'number'
            ? academic
            : academic && (academic.nama_lengkap || academic.nama || academic.name) ||
                academicAccount.nama_lengkap || participant.pembimbing_akademik_nama ||
                record.pembimbing_akademik_nama || '-';
        var logbookStatus = typeof logbook === 'string' ? logbook :
            logbook.status_verifikasi || logbook.status ||
            record.status_logbook_hari_ini || record.status_logbook || record.status_logbook_terakhir ||
            participant.status_logbook_hari_ini || participant.status_logbook || '';
        var attendanceDate = activityDate(attendance) || '';
        return {
            id: record.id || participant.id || record.peserta_id,
            nisn: record.nisn || participant.nisn || account.nisn || account.username || '-',
            nama: record.nama_peserta || account.nama_lengkap || participant.nama_lengkap ||
                participant.nama || record.nama || record.name || '-',
            instansi: record.asal_sekolah_kampus || participant.asal_sekolah_kampus ||
                record.instansi || record.asal_instansi || record.asal_sekolah || '-',
            unit: record.unit_kerja || record.nama_unit || placement.unit_kerja || placement.nama_unit || '-',
            pembimbing: record.pembimbing || record.nama_pembimbing || '-',
            pembimbingAkademik: academicName,
            nipAkademik: participant.nip_pembimbing_akademik || record.nip_pembimbing_akademik ||
                (academic && typeof academic === 'object' && (academic.nip || academic.nidn)) || '-',
            hpAkademik: participant.no_hp_pembimbing_akademik || record.no_hp_pembimbing_akademik ||
                (academic && typeof academic === 'object' && (academic.no_hp || academic.telepon)) || '-',
            attendanceTime: attendanceTime || '',
            attendanceStatus: attendanceStatus || 'Belum Absen',
            attendanceCardStatus: directAttendanceStatus
                ? (attendanceStatus || 'Belum Absen')
                : attendanceStatus ? 'Masuk jam ' + (attendanceTime || '--:--') : 'Belum Absen',
            attendanceDate: attendanceDate,
            logbookStatus: logbookStatus || ''
        };
    }

    function findRows(value, keys, depth, allowArray) {
        var wrappers = ['data', 'items', 'rows', 'list', 'result', 'results'];
        depth = depth || 0;
        allowArray = allowArray === undefined ? keys.length === 0 : allowArray;
        if (depth > 8) return null;
        if (Array.isArray(value)) return allowArray ? value : null;
        if (!value || typeof value !== 'object') return null;

        for (var index = 0; index < keys.length; index++) {
            if (Array.isArray(value[keys[index]])) return value[keys[index]];
        }
        for (var keyIndex = 0; keyIndex < keys.length; keyIndex++) {
            var nested = value[keys[keyIndex]];
            if (nested && typeof nested === 'object') {
                var nestedRows = findRows(nested, [], depth + 1, true);
                if (nestedRows) return nestedRows;
            }
        }
        for (var wrapperIndex = 0; wrapperIndex < wrappers.length; wrapperIndex++) {
            var wrapped = value[wrappers[wrapperIndex]];
            if (wrapped && typeof wrapped === 'object') {
                var wrappedRows = findRows(wrapped, keys, depth + 1, allowArray);
                if (wrappedRows) return wrappedRows;
            }
        }
        return null;
    }

    function normalizeMonitoring(payload) {
        var anakKeys = ['anak_bimbingan', 'peserta_bimbingan', 'internal', 'peserta', 'data_peserta'];
        var lintasKeys = ['lintas_bidang', 'peserta_lintas_bidang', 'lintas'];
        var anak = findRows(payload, anakKeys);
        var lintas = findRows(payload, lintasKeys);
        if (anak || lintas) return { anak: anak || [], lintas: lintas || [] };

        var rows = findRows(payload, []);
        return rows ? { anak: rows, lintas: [] } : null;
    }

    function statusBadge(status, isAttendance) {
        var value = String(status || '').trim();
        var normalized = value.toLowerCase();
        if (!normalized || normalized.indexOf('belum') !== -1) {
            return { label: 'Belum Mengisi', className: 'bg-secondary text-white' };
        }
        if (normalized.indexOf('pending') !== -1 || normalized.indexOf('menunggu') !== -1) {
            return { label: 'Menunggu Verifikasi', className: 'bg-warning text-dark' };
        }
        if (normalized.indexOf('approved') !== -1 || normalized.indexOf('disetujui') !== -1) {
            return { label: 'Disetujui', className: 'bg-success text-white' };
        }
        if (normalized.indexOf('rejected') !== -1 || normalized.indexOf('ditolak') !== -1) {
            return { label: 'Ditolak', className: 'bg-danger text-white' };
        }
        if (isAttendance && (normalized.indexOf('masuk') !== -1 || normalized.indexOf('keluar') !== -1)) {
            return { label: value, className: 'bg-success text-white' };
        }
        return { label: value, className: 'bg-secondary text-white' };
    }

    function renderCards() {
        var cards = anakBimbingan.map(function(item) {
            var attendanceBadge = statusBadge(item.attendanceCardStatus, true);
            var logbookBadge = statusBadge(item.logbookStatus, false);
            return `
                <div class="col-12 col-md-6 col-xl-4">
                    <article class="card bimbingan-card h-100">
                        <div class="card-body">
                            <div class="bimbingan-card-header">
                                <div class="bimbingan-card-identity">
                                    <h6>${escapeHtml(item.nama)}</h6>
                                    <p>${escapeHtml(item.instansi)}</p>
                                </div>
                                <span class="bimbingan-card-nim"><i class="fas fa-id-card"></i>NISN: ${escapeHtml(item.nisn)}</span>
                            </div>
                            <div class="bimbingan-card-activity">
                                <span class="monitoring-status ${attendanceBadge.className}">
                                    <i class="fas ${attendanceBadge.className.indexOf('bg-success') !== -1 ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>${escapeHtml(attendanceBadge.label)}
                                </span>
                                <span class="monitoring-status ${logbookBadge.className}">
                                    <i class="fas fa-book"></i>${escapeHtml(logbookBadge.label)}
                                </span>
                            </div>
                            <button type="button" class="btn btn-sm btn-outline-primary align-self-start btn-detail-peserta" data-index="${anakBimbingan.indexOf(item)}">
                                <i class="fas fa-circle-info me-1"></i>Lihat Detail
                            </button>
                        </div>
                    </article>
                </div>`;
        }).join('');
        $('#cardsAnakBimbingan').html(cards);
        $('#emptyInternalMonitoring').toggle(anakBimbingan.length === 0);
        $('#labelUnitSendiri').text('Anak Bimbingan');
        $('#monitoringAlertText').text(anakBimbingan.length
            ? 'Ringkasan presensi dan logbook hari ini.'
            : 'Belum ada anak bimbingan aktif.');
    }

    function showParticipantDetails(index) {
        var item = anakBimbingan[index];
        if (!item) return;
        $('#detailMonitoringBody').html(
            '<div class="mb-3"><strong>Peserta:</strong><br>' + escapeHtml(item.nama) + '</div>' +
            '<div class="mb-3"><strong>Asal Sekolah / Kampus:</strong><br>' + escapeHtml(item.instansi) + '</div>' +
            '<div class="mb-3"><strong>NISN:</strong><br>' + escapeHtml(item.nisn) + '</div>' +
            '<hr><div class="mb-3"><strong>Pembimbing Akademik:</strong><br>' +
                escapeHtml(item.pembimbingAkademik) + '</div>' +
            '<div class="mb-3"><strong>NIDN/NIP:</strong><br>' + escapeHtml(item.nipAkademik) + '</div>' +
            '<div><strong>HP/WA:</strong><br>' + escapeHtml(item.hpAkademik) + '</div>'
        );
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalDetailMonitoring')).show();
    }

    function renderLintasTable() {
        table.clear();
        lintasBidang.forEach(function(item, index) {
            var colParticipant = '<div><strong>' + escapeHtml(item.nama) + '</strong><div class="small text-muted">' +
                escapeHtml(item.instansi) + '</div><div class="small text-primary">Pembimbing Akademik: ' +
                escapeHtml(item.pembimbingAkademik) + '</div><div class="small text-muted">NIDN/NIP: ' +
                escapeHtml(item.nipAkademik) + ' · HP: ' + escapeHtml(item.hpAkademik) + '</div></div>';
            var status = escapeHtml(item.attendanceStatus);
            var badgeClass = /hadir/i.test(item.attendanceStatus) ? 'badge-approved' :
                /belum|menunggu/i.test(item.attendanceStatus) ? 'badge-pending' : 'badge-rejected';
            table.row.add([
                index + 1,
                colParticipant,
                escapeHtml(item.unit),
                escapeHtml(item.pembimbing),
                escapeHtml(item.attendanceTime),
                '<span class="badge ' + badgeClass + '">' + status + '</span>',
                '<span class="small">' + escapeHtml(item.logbookStatus || 'Belum ada logbook') + '</span>'
            ]);
        });
        table.draw();
    }

    function loadUnitKerja() {
        var $unit = $('#filterUnitLintas').empty().append(new Option('Semua Unit Kerja Dishub', ''));
        return window.apiRequestAll('/pembimbing/unit-kerja', ['unit_kerja', 'units', 'data_unit_kerja'])
            .then(function(units) {
                var names = Array.from(new Set(units.map(function(unit) {
                    if (typeof unit === 'string') return unit.trim();
                    var relatedUnit = unit.unit_kerja;
                    return unit.nama_unit || unit.nama_unit_kerja || unit.nama || unit.name ||
                        (typeof relatedUnit === 'string' ? relatedUnit : relatedUnit &&
                            (relatedUnit.nama_unit || relatedUnit.nama || relatedUnit.name)) || '';
                }).filter(Boolean)));
                names.forEach(function(name) {
                    $unit.append(new Option(name, name));
                });
            }).catch(function(error) {
                Swal.fire('Gagal Memuat Unit Kerja', error.message, 'error');
            });
    }

    function loadMonitoring() {
        $('#btnRefreshMonitoring').prop('disabled', true);
        var hasPreviousData = anakBimbingan.length > 0 || lintasBidang.length > 0;
        if (!hasPreviousData) {
            $('#cardsAnakBimbingan').html('<div class="col-12 text-center text-muted py-4">Memuat data...</div>');
            window.apiSetTableState(table, 'loading');
        }
        $('#monitoringAlertText').text('Memuat data monitoring...');
        var token = localStorage.getItem('token') || localStorage.getItem('siamag_token') || '';
        return fetch(apiUrl('/monitoring'), {
            headers: {
                'Accept': 'application/json',
                'Authorization': 'Bearer ' + token
            }
        })
            .then(readResponse)
            .then(function(payload) {
                var sections = normalizeMonitoring(payload);
                if (!sections) throw new Error('Format data monitoring pembimbing dari server tidak valid.');
                anakBimbingan = sections.anak.map(normalizeParticipant);
                lintasBidang = sections.lintas.map(normalizeParticipant);
                renderCards();
                renderLintasTable();
                window.apiSetTableState(table, 'loaded');
                var latest = anakBimbingan.concat(lintasBidang).map(function(item) {
                    return item.attendanceDate;
                }).filter(Boolean).sort().pop();
                $('#labelTanggalMonitoring').text(latest ? 'Data terakhir: ' + latest : '');
            }).catch(function(error) {
                if (!hasPreviousData) {
                    $('#cardsAnakBimbingan').html('<div class="col-12 text-center text-danger py-4">' +
                        escapeHtml(error.message) + '</div>');
                    window.apiSetTableState(table, 'error');
                }
                $('#monitoringAlertText').text('Data monitoring gagal dimuat. ' + error.message);
                Swal.fire('Monitoring Gagal Dimuat', error.message, 'error');
            }).then(function() {
                $('#btnRefreshMonitoring').prop('disabled', false);
            });
    }

    setUserInfo();
    $('#tab-lintas-tab').on('shown.bs.tab', function() { table.columns.adjust().draw(false); });
    $('#filterUnitLintas').on('change', function() {
        var unit = String($(this).val() || '');
        table.column(2).search(unit ? '^' + escapeRegex(unit) + '$' : '', true, false).draw();
    });
    $('#filterStatusLintas').on('change', function() { table.column(5).search($(this).val()).draw(); });
    $('#cardsAnakBimbingan').on('click', '.btn-detail-peserta', function() {
        showParticipantDetails(Number($(this).data('index')));
    });
    $('#btnResetFilterLintas').on('click', function() {
        $('#filterUnitLintas, #filterStatusLintas').val('');
        table.search('').columns().search('').draw();
    });
    $('#btnRefreshMonitoring').on('click', loadMonitoring);
    loadUnitKerja();
    loadMonitoring();
});
