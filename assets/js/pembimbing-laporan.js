/* Modul Laporan Pembimbing Lapangan
   Rekapitulasi presensi & logbook khusus anak bimbingan (Seksi Angkutan Orang)
*/

$(document).ready(function() {
    var anakBimbingan = [];
    var dataKehadiran = [];
    var dataLogbook = [];
    var reportLoaded = false;

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    function personInfo(row, isParticipant) {
        var nestedParticipant = row.peserta_magang || row.peserta;
        var participant = nestedParticipant || row;
        var account = participant.pengguna || {};
        return {
            id: row.id_peserta_magang || row.peserta_id ||
                (nestedParticipant && nestedParticipant.id) || (isParticipant ? participant.id : '') || '',
            nama: row.nama_peserta || row.nama || account.nama_lengkap || participant.nama_lengkap || participant.nama || '-',
            nim: row.nim || row.username || participant.nim || account.username || participant.username || '-',
            instansi: row.asal_sekolah_kampus || row.instansi || participant.asal_sekolah_kampus || participant.instansi || '-'
        };
    }

    function normalizeRows(rows) {
        return rows.map(function(row) {
            var person = personInfo(row);
            return Object.assign({}, row, person, {
                id_peserta_magang: person.id
            });
        });
    }

    function reportEndpoint(jenis) {
        return jenis === 'presensi' ? '/pembimbing/rekap-absensi' : '/pembimbing/logbook';
    }

    function reportArrayKeys(jenis) {
        return jenis === 'presensi'
            ? ['absensi', 'rekap_absensi', 'data_absensi', 'presensi', 'rekap_presensi']
            : ['logbook', 'logbooks'];
    }

    function dateParameter(selector) {
        var value = String($(selector).val() || '');
        return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
    }

    function reportRequestUrl(jenis) {
        var params = new URLSearchParams();
        params.set('tanggal_mulai', dateParameter('#tglMulai'));
        params.set('tanggal_selesai', dateParameter('#tglSelesai'));
        params.set('jenis_laporan', jenis === 'presensi' ? 'absensi' : 'logbook');
        var participantId = $('#filterPeserta').val();
        if (participantId) params.set('id_peserta_magang', participantId);
        return reportEndpoint(jenis) + '?' + params.toString();
    }

    function loadReport() {
        $('#btnFilter').prop('disabled', true);
        $('#tabelLaporanPresensi tbody').html(
            '<tr><td colspan="8" class="text-center py-4 text-muted">Memuat data...</td></tr>');
        $('#tabelLaporanLogbook tbody').html(
            '<tr><td colspan="6" class="text-center py-4 text-muted">Memuat data...</td></tr>');
        return Promise.all([
            window.apiRequestAll('/pembimbing/rekap-absensi', reportArrayKeys('presensi')),
            window.apiRequestAll('/pembimbing/logbook', reportArrayKeys('logbook'))
        ]).then(function(results) {
            dataKehadiran = normalizeRows(results[0]);
            dataLogbook = normalizeRows(results[1]);

            var seen = Object.create(null);
            anakBimbingan = dataKehadiran.concat(dataLogbook).map(function(row) {
                return personInfo(row);
            }).filter(function(person) {
                if (!person.id || seen[String(person.id)]) return false;
                seen[String(person.id)] = true;
                return true;
            });
            var $filter = $('#filterPeserta').empty().append(new Option('Semua Anak Bimbingan', ''));
            anakBimbingan.forEach(function(person) {
                $filter.append(new Option(person.nama + ' (' + person.instansi + ')', person.id));
            });

            reportLoaded = true;
            renderLaporan();
        }).catch(function(error) {
            $('#tabelLaporanPresensi tbody').html(
                '<tr><td colspan="8" class="text-center py-4 text-danger">' + escapeHtml(error.message) + '</td></tr>');
            $('#tabelLaporanLogbook tbody').html(
                '<tr><td colspan="6" class="text-center py-4 text-danger">' + escapeHtml(error.message) + '</td></tr>');
            Swal.fire('Laporan Gagal Dimuat', error.message, 'error');
        }).then(function() {
            $('#btnFilter').prop('disabled', false);
        });
    }

    function applyFilters() {
        var jenis = $('#jenisLaporan').val();
        var table = jenis === 'presensi' ? '#tabelLaporanPresensi' : '#tabelLaporanLogbook';
        var colspan = jenis === 'presensi' ? 8 : 6;
        var message = '<tr><td colspan="' + colspan +
            '" class="text-center py-4 text-muted">Memuat data...</td></tr>';
        $(table + ' tbody').html(message);
        $('#btnFilter').prop('disabled', true);
        return window.apiRequestAll(reportRequestUrl(jenis), reportArrayKeys(jenis))
            .then(function(rows) {
                if (jenis === 'presensi') {
                    dataKehadiran = normalizeRows(rows);
                } else {
                    dataLogbook = normalizeRows(rows);
                }
                reportLoaded = true;
                renderLaporan();
            }).catch(function(error) {
                $(table + ' tbody').html(
                    '<tr><td colspan="' + colspan + '" class="text-center py-4 text-danger">' +
                    escapeHtml(error.message) + '</td></tr>');
                Swal.fire('Laporan Gagal Dimuat', error.message, 'error');
            }).then(function() {
                $('#btnFilter').prop('disabled', false);
            });
    }

    // Default Tanggal
    var today = new Date();
    var firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    function toDateInput(date) {
        var local = new Date(date);
        local.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        return local.toJSON().slice(0,10);
    }
    if (!$('#tglMulai').val()) $('#tglMulai').val(toDateInput(firstDay));
    if (!$('#tglSelesai').val()) $('#tglSelesai').val(toDateInput(today));

    function renderLaporan() {
        if (!reportLoaded) return;
        var jenis = $('#jenisLaporan').val();
        var nim = $('#filterPeserta').val();
        var tglMulai = $('#tglMulai').val();
        var tglSelesai = $('#tglSelesai').val();

        if (jenis === 'presensi') {
            $('#labelStatUtama').text('Event Masuk');
            $('#labelStatKedua').text('Event Keluar');
            $('#sectionLaporanPresensi').show();
            $('#sectionLaporanLogbook').hide();
            
            var filtered = dataKehadiran.filter(function(r) {
                var mNim = !nim || String(r.id || r.id_peserta_magang) === String(nim);
                var mTgl = true;
                var date = String(r.tanggal_jam || r.tanggal || r.tanggal_presensi || '').slice(0, 10);
                if (tglMulai && date < tglMulai) mTgl = false;
                if (tglSelesai && date > tglSelesai) mTgl = false;
                return mNim && mTgl;
            });

            var tbody = $('#tabelLaporanPresensi tbody');
            tbody.empty();

            var masuk = 0, keluar = 0;
            if (filtered.length === 0) {
                tbody.append('<tr><td colspan="8" class="text-center py-4 text-muted">Tidak ada data presensi.</td></tr>');
            } else {
                filtered.forEach(function(r, idx) {
                    var attendanceType = String(r.status || r.status_presensi || r.status_event || '').toLowerCase();
                    if (attendanceType === 'masuk') masuk++;
                    if (attendanceType === 'keluar') keluar++;
                    var statusClass = r.status_verifikasi === 'approved' ? 'badge-approved' :
                        r.status_verifikasi === 'rejected' ? 'badge-rejected' : 'badge-pending';
                    var coordinates = r.latitude != null && r.longitude != null
                        ? escapeHtml(r.latitude) + ', ' + escapeHtml(r.longitude)
                        : '-';
                    var photoUrl = r.foto_selfie_url || r.foto_selfie || '';
                    var photo = photoUrl
                        ? '<a href="' + escapeHtml(photoUrl) + '" target="_blank" rel="noopener noreferrer">Lihat foto</a>'
                        : '-';
                    var tr = `
                        <tr>
                            <td class="text-center">${idx + 1}</td>
                            <td class="text-center">${escapeHtml(formatTanggalJam(r.tanggal_jam || r.tanggal || r.tanggal_presensi || r.created_at))}</td>
                            <td>
                                <div class="fw-bold">${escapeHtml(r.nama)}</div>
                                <small class="text-muted">NIM. ${escapeHtml(r.nim)} | ${escapeHtml(r.instansi)}</small>
                            </td>
                            <td class="text-center">${escapeHtml(r.status || r.status_presensi || r.status_event || '-')}</td>
                            <td>${escapeHtml(r.lokasi || '-')}</td>
                            <td class="font-monospace">${coordinates}</td>
                            <td>${photo}</td>
                            <td><span class="badge ${statusClass}">${escapeHtml(r.status_verifikasi || 'pending')}</span></td>
                        </tr>
                    `;
                    tbody.append(tr);
                });
            }

            $('#statHadir').text(masuk);
            $('#statTerlambat').text(keluar);
        } else {
            $('#sectionLaporanPresensi').hide();
            $('#sectionLaporanLogbook').show();
            $('#labelStatUtama').text('Total Logbook');
            $('#labelStatKedua').text('Logbook Disetujui');

            var filteredLog = dataLogbook.filter(function(r) {
                var mNama = !nim || String(r.id || r.id_peserta_magang) === String(nim);
                var mTgl = true;
                var date = String(r.tanggal || '').slice(0, 10);
                if (tglMulai && date < tglMulai) mTgl = false;
                if (tglSelesai && date > tglSelesai) mTgl = false;
                return mNama && mTgl;
            });

            var tbodyLog = $('#tabelLaporanLogbook tbody');
            tbodyLog.empty();
            var approvedLogbook = filteredLog.filter(function(row) {
                return String(row.status_verifikasi || '').toLowerCase() === 'approved';
            }).length;

            if (filteredLog.length === 0) {
                tbodyLog.append('<tr><td colspan="6" class="text-center py-4 text-muted">Tidak ada data logbook.</td></tr>');
            } else {
                filteredLog.forEach(function(r, idx) {
                    var tr = `
                        <tr>
                            <td class="text-center">${idx + 1}</td>
                            <td class="text-center">${escapeHtml(r.tanggal)}</td>
                            <td>
                                <div class="fw-bold">${escapeHtml(r.nama)}</div>
                                <small class="text-muted">${escapeHtml(r.instansi)}</small>
                            </td>
                            <td>${escapeHtml(r.kegiatan)}</td>
                            <td class="small text-muted">${escapeHtml(r.catatan_pembimbing || '-')}</td>
                            <td class="text-center"><span class="badge ${r.status_verifikasi === 'approved' ? 'bg-success' : (r.status_verifikasi === 'rejected' ? 'bg-danger' : 'bg-warning text-dark')}">${escapeHtml(r.status_verifikasi || 'pending')}</span></td>
                        </tr>
                    `;
                    tbodyLog.append(tr);
                });
            }
            $('#statHadir').text(filteredLog.length);
            $('#statTerlambat').text(approvedLogbook);
        }
    }

    $('#btnFilter').on('click', applyFilters);
    $('#jenisLaporan').on('change', renderLaporan);
    $('#btnReset').on('click', function() {
        $('#filterPeserta').val('');
        $('#jenisLaporan').val('presensi');
        $('#tglMulai').val(toDateInput(firstDay));
        $('#tglSelesai').val(toDateInput(today));
        applyFilters();
    });

    $('#btnCetakLaporan').on('click', function() {
        window.print();
    });

    // Helper: ambil teks bersih dari HTML
    function stripHtml(html) {
        var tmp = document.createElement('div');
        tmp.innerHTML = html;
        return (tmp.textContent || tmp.innerText || '').trim().replace(/\s+/g, ' ');
    }

    function csvEsc(val) {
        val = String(val).replace(/"/g, '""');
        if (val.indexOf(',') !== -1 || val.indexOf('"') !== -1 || val.indexOf('\n') !== -1) {
            val = '"' + val + '"';
        }
        return val;
    }

    $('#btnExportExcel').on('click', function() {
        var jenis = $('#jenisLaporan').val();
        var tabel = jenis === 'presensi' ? document.getElementById('tabelLaporanPresensi') : document.getElementById('tabelLaporanLogbook');

        if (!tabel) return;

        var rows = tabel.querySelectorAll('tr');
        var csvLines = [];
        rows.forEach(function(row) {
            var cells = row.querySelectorAll('th, td');
            var cols = [];
            cells.forEach(function(cell) {
                cols.push(csvEsc(stripHtml(cell.innerHTML)));
            });
            csvLines.push(cols.join(','));
        });

        var csvContent = '\uFEFF' + csvLines.join('\n');
        var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        var tglSelesai = $('#tglSelesai').val() || new Date().toISOString().slice(0, 10);
        link.setAttribute('href', url);
        link.setAttribute('download', 'rekap_bimbingan_' + jenis + '_' + tglSelesai + '.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });

    loadReport();
});
