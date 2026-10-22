/* Modul Laporan Pembimbing Lapangan
   Rekapitulasi presensi & logbook khusus anak bimbingan (Seksi Angkutan Orang)
*/

$(document).ready(function() {

    var context = window.pembimbingDemoData.getContext();
    var anakBimbingan = context.peserta;

    // Rekapitulasi kehadiran bimbingan
    var dataKehadiran = context.absensi.map(function(item) {
        return {
            tanggal: item.tanggal,
            nim: item.nim,
            nama: item.nama,
            instansi: item.instansi,
            jamMasuk: item.jamMasuk,
            jamPulang: item.jamPulang,
            status: item.status,
            terlambat: item.status === 'Terlambat' ? 1 : 0,
            paraf: item.statusVerif === 'Diverifikasi' ? context.pembimbing.nama : 'Menunggu verifikasi'
        };
    });

    // Rekapitulasi logbook bimbingan
    var dataLogbook = context.logbook.map(function(item) {
        return {
            tanggal: item.tanggal,
            nim: item.nim,
            nama: item.nama,
            instansi: item.instansi,
            kegiatan: item.kegiatan,
            catatan: item.catatan,
            status: item.status === 'Diverifikasi' ? 'Disetujui' : item.status
        };
    });

    // Populate dropdown anak bimbingan
    anakBimbingan.forEach(function(p) {
        $('#filterPeserta').append(new Option(p.nama + " (" + p.instansi + ")", p.nim));
    });
    $('#userName').text(context.pembimbing.nama);
    $('#userRole').text(context.unit.nama);
    $('#userInitial').text(context.pembimbing.nama.charAt(0).toUpperCase());

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
        var jenis = $('#jenisLaporan').val();
        var nim = $('#filterPeserta').val();
        var tglMulai = $('#tglMulai').val();
        var tglSelesai = $('#tglSelesai').val();

        if (jenis === 'presensi') {
            $('#sectionLaporanPresensi').show();
            $('#sectionLaporanLogbook').hide();
            
            var filtered = dataKehadiran.filter(function(r) {
                var mNim = !nim || r.nim === nim;
                var mTgl = true;
                if (tglMulai && r.tanggal < tglMulai) mTgl = false;
                if (tglSelesai && r.tanggal > tglSelesai) mTgl = false;
                return mNim && mTgl;
            });

            var tbody = $('#tabelLaporanPresensi tbody');
            tbody.empty();

            var hadir = 0, lambat = 0;
            if (filtered.length === 0) {
                tbody.append('<tr><td colspan="8" class="text-center py-4 text-muted">Tidak ada data presensi.</td></tr>');
            } else {
                filtered.forEach(function(r, idx) {
                    if (r.status.includes('Hadir')) hadir++;
                    if (r.terlambat > 0) lambat++;

                    var badge = r.terlambat > 0 ? 'bg-warning text-dark' : 'bg-success';
                    var paraf = r.paraf === 'Menunggu verifikasi'
                        ? `<span class="small text-warning"><i class="fas fa-clock me-1"></i>${r.paraf}</span>`
                        : `<span class="small text-success"><i class="fas fa-check-double me-1"></i>${r.paraf}</span>`;
                    var tr = `
                        <tr>
                            <td class="text-center">${idx + 1}</td>
                            <td class="text-center">${r.tanggal}</td>
                            <td>
                                <div class="fw-bold">${r.nama}</div>
                                <small class="text-muted">NIM. ${r.nim} | ${r.instansi}</small>
                            </td>
                            <td class="text-center font-monospace">${r.jamMasuk}</td>
                            <td class="text-center font-monospace">${r.jamPulang}</td>
                            <td class="text-center"><span class="badge ${badge}">${r.status}</span></td>
                            <td class="text-center">${r.terlambat > 0 ? r.terlambat + ' mnt' : '-'}</td>
                            <td>${paraf}</td>
                        </tr>
                    `;
                    tbody.append(tr);
                });
            }

            $('#statHadir').text(hadir);
            $('#statTerlambat').text(lambat);
        } else {
            $('#sectionLaporanPresensi').hide();
            $('#sectionLaporanLogbook').show();

            var filteredLog = dataLogbook.filter(function(r) {
                var mNama = true;
                if (nim) {
                    var m = anakBimbingan.find(x => x.nim === nim);
                    if (m) mNama = (r.nama === m.nama);
                }
                var mTgl = true;
                if (tglMulai && r.tanggal < tglMulai) mTgl = false;
                if (tglSelesai && r.tanggal > tglSelesai) mTgl = false;
                return mNama && mTgl;
            });

            var tbodyLog = $('#tabelLaporanLogbook tbody');
            tbodyLog.empty();

            if (filteredLog.length === 0) {
                tbodyLog.append('<tr><td colspan="6" class="text-center py-4 text-muted">Tidak ada data logbook.</td></tr>');
            } else {
                filteredLog.forEach(function(r, idx) {
                    var tr = `
                        <tr>
                            <td class="text-center">${idx + 1}</td>
                            <td class="text-center">${r.tanggal}</td>
                            <td>
                                <div class="fw-bold">${r.nama}</div>
                                <small class="text-muted">${r.instansi}</small>
                            </td>
                            <td>${r.kegiatan}</td>
                            <td class="small text-muted">${r.catatan}</td>
                            <td class="text-center"><span class="badge bg-success">${r.status}</span></td>
                        </tr>
                    `;
                    tbodyLog.append(tr);
                });
            }
        }
    }

    $('#btnFilter, #jenisLaporan').on('click change', renderLaporan);
    $('#btnReset').on('click', function() {
        $('#filterPeserta').val('');
        $('#jenisLaporan').val('presensi');
        $('#tglMulai').val(toDateInput(firstDay));
        $('#tglSelesai').val(toDateInput(today));
        renderLaporan();
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

    renderLaporan();
});
