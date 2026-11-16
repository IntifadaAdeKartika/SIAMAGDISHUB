$(document).ready(function() {
    var attendanceRows = [];
    var logbookRows = [];
    var unitRecords = [];
    var participantRecords = [];
    var reportLoaded = false;

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    function relation(row) {
        var person = row.peserta || row.peserta_magang || {};
        var unit = row.unit_kerja || row.unit || person.unit_kerja || {};
        var mentor = row.pembimbing || row.pembimbing_lapangan || {};
        return {
            person: person,
            participantId: row.id_peserta_magang || person.id_peserta_magang || person.id || '',
            unitId: row.id_unit_kerja || row.unit_id || person.id_unit_kerja || unit.id || '',
            name: row.nama_peserta || row.nama || person.nama_lengkap || person.nama ||
                (person.pengguna && person.pengguna.nama_lengkap) || '-',
            identifier: row.nim || row.username || person.username || person.nim ||
                (person.pengguna && person.pengguna.username) || '-',
            organization: row.asal_sekolah_kampus || row.instansi || person.asal_sekolah_kampus || person.instansi || '-',
            unit: row.nama_unit_kerja || unit.nama_unit || unit.nama || '-',
            mentor: row.nama_pembimbing || mentor.nama_lengkap || mentor.nama || '-'
        };
    }

    function populateFilters() {
        var unit = $('#filterUnit').empty().append(new Option('Semua Unit Kerja', ''));
        unitRecords.forEach(function(row) {
            unit.append(new Option(row.nama_unit || row.nama || '-', row.id || row.id_unit_kerja));
        });
        updateParticipantOptions();
    }

    function updateParticipantOptions() {
        var selectedUnit = $('#filterUnit').val();
        var participant = $('#filterPeserta').empty().append(new Option('Semua Peserta', ''));
        participantRecords.forEach(function(row) {
            var info = relation(row);
            if (!selectedUnit || String(info.unitId) === String(selectedUnit)) {
                participant.append(new Option(info.name + ' - ' + info.organization, row.id || row.id_peserta_magang));
            }
        });
    }

    function filteredRows(rows, type) {
        var participantId = $('#filterPeserta').val();
        var unitId = $('#filterUnit').val();
        var start = $('#tglMulai').val();
        var end = $('#tglSelesai').val();
        return rows.filter(function(row) {
            var info = relation(row);
            var date = String(type === 'presensi' ? row.tanggal_jam : row.tanggal || '').slice(0, 10);
            return (!participantId || String(info.participantId) === String(participantId)) &&
                (!unitId || String(info.unitId) === String(unitId)) &&
                (!start || date >= start) && (!end || date <= end);
        });
    }

    function parafUrl(row) {
        var paraf = row.paraf_pembimbing_url || row.paraf_pembimbing;
        if (!paraf) return '';
        if (typeof paraf === 'object') {
            return paraf.url || paraf.file_url || paraf.path || paraf.file_path || '';
        }
        return String(paraf);
    }

    function renderAttendance() {
        var rows = filteredRows(attendanceRows, 'presensi');
        var tbody = $('#tabelLaporanPresensi tbody').empty();
        var counts = { masuk: 0, keluar: 0, pending: 0, rejected: 0 };
        if (!rows.length) tbody.append('<tr><td colspan="9" class="text-center py-4 text-muted">Tidak ada data absensi.</td></tr>');
        rows.forEach(function(row, index) {
            var info = relation(row);
            var status = String(row.status || '').toLowerCase();
            var verification = String(row.status_verifikasi || 'pending').toLowerCase();
            if (status in counts) counts[status]++;
            if (verification === 'pending') counts.pending++;
            if (verification === 'rejected') counts.rejected++;
            var verificationClass = verification === 'approved' ? 'bg-success' :
                verification === 'rejected' ? 'bg-danger' : 'bg-warning text-dark';
            tbody.append('<tr><td class="text-center">' + (index + 1) + '</td><td class="text-center">' +
                escapeHtml(formatTanggalJam(row.tanggal_jam || row.created_at)) + '</td><td><div class="fw-bold">' + escapeHtml(info.name) +
                '</div><small class="text-muted">' + escapeHtml(info.identifier + ' | ' + info.organization) +
                '</small></td><td>' + escapeHtml(info.unit) + '</td><td class="text-center"><span class="badge ' +
                (status === 'masuk' ? 'bg-primary' : 'bg-secondary') + '">' + escapeHtml(status) +
                '</span></td><td>' + escapeHtml(row.lokasi || '-') + '</td><td class="font-monospace">' +
                escapeHtml(row.latitude) + ', ' + escapeHtml(row.longitude) + '</td><td>' +
                escapeHtml(row.foto_selfie_url || row.foto_selfie || '-') + '</td><td class="small"><span class="badge ' +
                verificationClass + '">' + escapeHtml(verification) + '</span></td></tr>');
        });
        $('#statHadir').text(counts.masuk);
        $('#statTerlambat').text(counts.keluar);
        $('#statIzin').text(counts.pending);
        $('#statSakit').text(counts.rejected);
        $('#statTotalRecord').text(rows.length);
    }

    function renderLogbook() {
        var rows = filteredRows(logbookRows, 'logbook');
        var tbody = $('#tabelLaporanLogbook tbody').empty();
        if (!rows.length) tbody.append('<tr><td colspan="7" class="text-center py-4 text-muted">Tidak ada data logbook.</td></tr>');
        rows.forEach(function(row, index) {
            var info = relation(row);
            var status = String(row.status_verifikasi || 'pending').toLowerCase();
            var statusClass = status === 'approved' ? 'bg-success' :
                status === 'rejected' ? 'bg-danger' : 'bg-warning text-dark';
            var paraf = parafUrl(row);
            tbody.append('<tr><td class="text-center">' + (index + 1) + '</td><td class="text-center">' +
                escapeHtml(row.tanggal || '') + '</td><td><div class="fw-bold">' + escapeHtml(info.name) +
                '</div><small class="text-muted">' + escapeHtml(info.organization) + '</small></td><td>' +
                escapeHtml(info.unit) + '</td><td>' + escapeHtml(row.kegiatan || '-') +
                '</td><td class="text-center"><span class="badge ' + statusClass + '">' + escapeHtml(status) +
                '</span></td><td class="small">' + (paraf
                    ? '<img src="' + escapeHtml(paraf) +
                        '" alt="Paraf Pembimbing" style="height: 30px; display: block; margin: auto;">'
                    : '-') + '</td></tr>');
        });
        $('#statTotalRecord').text(rows.length);
    }

    function updateReport() {
        if (!reportLoaded) return;
        var type = $('#jenisLaporan').val();
        $('#sectionLaporanPresensi').toggle(type === 'presensi');
        $('#sectionLaporanLogbook').toggle(type !== 'presensi');
        if (type === 'presensi') renderAttendance();
        else renderLogbook();
    }

    function exportCsv() {
        var table = document.getElementById($('#jenisLaporan').val() === 'presensi'
            ? 'tabelLaporanPresensi'
            : 'tabelLaporanLogbook');
        var csv = Array.prototype.map.call(table.querySelectorAll('tr'), function(row) {
            return Array.prototype.map.call(row.querySelectorAll('th,td'), function(cell) {
                return '"' + String(cell.innerText || '').replace(/"/g, '""') + '"';
            }).join(',');
        }).join('\r\n');
        var url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
        var link = document.createElement('a');
        link.href = url;
        link.download = 'laporan_' + $('#jenisLaporan').val() + '_' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    }

    var today = new Date();
    var firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    function dateValue(date) {
        var local = new Date(date);
        local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
        return local.toISOString().slice(0, 10);
    }
    if (!$('#tglMulai').val()) $('#tglMulai').val(dateValue(firstDay));
    if (!$('#tglSelesai').val()) $('#tglSelesai').val(dateValue(today));

    $('#filterUnit').on('change', function() {
        updateParticipantOptions();
        updateReport();
    });
    $('#filterPeserta, #tglMulai, #tglSelesai').on('change', updateReport);
    $('#btnFilter, #jenisLaporan').on('click change', updateReport);
    $('#btnReset').on('click', function() {
        $('#filterUnit, #filterPeserta').val('');
        $('#jenisLaporan').val('presensi');
        $('#tglMulai').val(dateValue(firstDay));
        $('#tglSelesai').val(dateValue(today));
        updateReport();
    });
    $('#btnCetakLaporan').on('click', function() { window.print(); });
    $('#btnExportExcel').on('click', exportCsv);

    $('#tabelLaporanPresensi tbody').html(
        '<tr><td colspan="9" class="text-center py-4 text-muted">Memuat data...</td></tr>');
    $('#tabelLaporanLogbook tbody').html(
        '<tr><td colspan="7" class="text-center py-4 text-muted">Memuat data...</td></tr>');

    Promise.all([
        window.apiRequestAll('/admin/unit-kerja', ['unit_kerja', 'units']),
        window.apiRequestAll('/admin/peserta-magang', ['peserta_magang', 'peserta']),
        window.apiRequestAll('/admin/absensi', ['absensi']),
        window.apiRequestAll('/admin/logbook', ['logbook', 'logbooks'])
    ]).then(function(results) {
        unitRecords = results[0];
        participantRecords = results[1];
        attendanceRows = results[2];
        logbookRows = results[3];
        reportLoaded = true;
        populateFilters();
        updateReport();
    }).catch(function(error) {
        $('#tabelLaporanPresensi tbody').html(
            '<tr><td colspan="9" class="text-center py-4 text-danger">Data gagal dimuat. Silakan muat ulang halaman.</td></tr>');
        $('#tabelLaporanLogbook tbody').html(
            '<tr><td colspan="7" class="text-center py-4 text-danger">Data gagal dimuat. Silakan muat ulang halaman.</td></tr>');
        Swal.fire('Laporan Gagal Dimuat', error.message, 'error');
    });
});
