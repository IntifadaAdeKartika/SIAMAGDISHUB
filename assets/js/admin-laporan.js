// Rekapitulasi Laporan Presensi & Logbook Peserta (Admin)

$(document).ready(function() {

    // Data Unit Kerja
    var masterUnitKerja = window.masterUnitKerja;

    // Data Peserta Magang
    var masterPeserta = window.masterPeserta;

    // Rekapitulasi Presensi
    var dataRekapPresensi = [
        {
            tanggal: "2026-10-14",
            nim: "220102001",
            nama: "Intifada Ade Kartika",
            instansi: "Univ. Muhammadiyah Ponorogo",
            unitId: 1,
            unitNama: "Sekretariat",
            jamMasuk: "07:32",
            jamPulang: "13:59",
            status: "Hadir",
            terlambat: 0,
            paraf: "Dra. Ida"
        },
        {
            tanggal: "2026-10-14",
            nim: "220203002",
            nama: "Ayu Sri",
            instansi: "Universitas Brawijaya",
            unitId: 5,
            unitNama: "Seksi Angkutan Orang",
            jamMasuk: "07:22",
            jamPulang: "13:50",
            status: "Hadir",
            terlambat: 0,
            paraf: "Adi, S.T."
        },
        {
            tanggal: "2026-10-14",
            nim: "220304003",
            nama: "Siti Aminah",
            instansi: "SMKN 1 Jenangan Ponorogo",
            unitId: 5,
            unitNama: "Seksi Angkutan Orang",
            jamMasuk: "08:01",
            jamPulang: "13:55",
            status: "Terlambat",
            terlambat: 1,
            paraf: "Menunggu verifikasi"
        }
    ];

    // Rekapitulasi Logbook Kegiatan
    var dataRekapLogbook = [
        {
            tanggal: "2026-10-14",
            nama: "Intifada Ade Kartika",
            instansi: "Univ. Muhammadiyah Ponorogo",
            unitId: 1,
            unitNama: "Sekretariat",
            kegiatan: "Membantu mencetak SPMK dan melanjutkan pengembangan frontend sistem absensi magang.",
            status: "Disetujui",
            paraf: "Dra. Ida"
        },
        {
            tanggal: "2026-10-14",
            nama: "Ayu Sri",
            instansi: "Universitas Brawijaya",
            unitId: 5,
            unitNama: "Seksi Angkutan Orang",
            kegiatan: "Pengarsipan surat masuk dan surat keluar bidang kepegawaian Dishub.",
            status: "Disetujui",
            paraf: "Adi, S.T."
        },
        {
            tanggal: "2026-10-14",
            nama: "Siti Aminah",
            instansi: "SMKN 1 Jenangan Ponorogo",
            unitId: 5,
            unitNama: "Seksi Angkutan Orang",
            kegiatan: "Membantu mengarsipkan dokumen.",
            status: "Menunggu",
            paraf: "-"
        }
    ];

    [dataRekapPresensi, dataRekapLogbook].forEach(function(rows) {
        rows.forEach(function(item) {
            var penempatan = window.getMasterPenempatanPeserta(item.nim || item.nama);
            if (!penempatan) return;
            item.nim = penempatan.peserta.nim;
            item.nama = penempatan.peserta.nama;
            item.instansi = penempatan.peserta.instansi;
            item.unitId = penempatan.unit.id;
            item.unitNama = penempatan.unit.nama;
            if (item.paraf !== "-" && item.paraf !== "Menunggu verifikasi") item.paraf = penempatan.namaPembimbing;
        });
    });

    // Populate Dropdown Unit Kerja
    masterUnitKerja.forEach(function(u) {
        $('#filterUnit').append(new Option(u.nama + " (" + u.kode + ")", u.id));
    });

    // Populate Dropdown Peserta
    masterPeserta.forEach(function(p) {
        $('#filterPeserta').append(new Option(p.nama + " - " + p.instansi, p.id));
    });

    // Handle Perubahan Unit Kerja -> sesuaikan dropdown peserta
    $('#filterUnit').on('change', function() {
        var unitId = $(this).val();
        $('#filterPeserta').empty().append(new Option("-- Semua Peserta --", ""));
        
        masterPeserta.forEach(function(p) {
            if (!unitId || p.unitId == unitId) {
                $('#filterPeserta').append(new Option(p.nama + " - " + p.instansi, p.id));
            }
        });
    });

    // Set Default Tanggal (Bulan Ini)
    var today = new Date();
    var firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    function toDateInputValue(date) {
        var local = new Date(date);
        local.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        return local.toJSON().slice(0,10);
    }

    if (!$('#tglMulai').val()) $('#tglMulai').val(toDateInputValue(firstDay));
    if (!$('#tglSelesai').val()) $('#tglSelesai').val(toDateInputValue(today));

    // Render Tabel & Statistik
    function updateLaporan() {
        var jenisLaporan = $('#jenisLaporan').val();
        var unitId = $('#filterUnit').val();
        var pesertaId = $('#filterPeserta').val();
        var tglMulai = $('#tglMulai').val();
        var tglSelesai = $('#tglSelesai').val();

        if (jenisLaporan === 'presensi') {
            $('#sectionLaporanPresensi').show();
            $('#sectionLaporanLogbook').hide();
            renderPresensi(unitId, pesertaId, tglMulai, tglSelesai);
        } else {
            $('#sectionLaporanPresensi').hide();
            $('#sectionLaporanLogbook').show();
            renderLogbook(unitId, pesertaId, tglMulai, tglSelesai);
        }
    }

    function renderPresensi(unitId, pesertaId, tglMulai, tglSelesai) {
        var filtered = dataRekapPresensi.filter(function(row) {
            var matchUnit = !unitId || row.unitId == unitId;
            var matchPeserta = true;
            if (pesertaId) {
                var p = masterPeserta.find(item => item.id == pesertaId);
                if (p) matchPeserta = (row.nim === p.nim);
            }
            var matchTgl = true;
            if (tglMulai && row.tanggal < tglMulai) matchTgl = false;
            if (tglSelesai && row.tanggal > tglSelesai) matchTgl = false;
            return matchUnit && matchPeserta && matchTgl;
        });

        // Hitung Statistik
        var totalHadir = 0;
        var totalTerlambat = 0;
        var totalIzin = 0;
        var totalSakit = 0;

        var tbody = $('#tabelLaporanPresensi tbody');
        tbody.empty();

        if (filtered.length === 0) {
            tbody.append('<tr><td colspan="9" class="text-center py-4 text-muted">Tidak ada data rekap presensi untuk filter yang dipilih.</td></tr>');
        } else {
            filtered.forEach(function(r, idx) {
                if (r.status === 'Hadir') {
                    totalHadir++;
                } else if (r.status === 'Terlambat' || r.terlambat > 0) {
                    totalTerlambat++;
                } else if (r.status === 'Izin') {
                    totalIzin++;
                } else if (r.status === 'Sakit') {
                    totalSakit++;
                }

                var badgeStatus = 'bg-success';
                if (r.status.includes('Terlambat')) badgeStatus = 'bg-warning text-dark';
                else if (r.status === 'Izin') badgeStatus = 'bg-info text-dark';
                else if (r.status === 'Sakit') badgeStatus = 'bg-danger';

                var parafCell = r.paraf === 'Menunggu verifikasi'
                    ? '<span class="text-warning"><i class="fas fa-clock me-1"></i>Menunggu verifikasi</span>'
                    : '<span class="text-success"><i class="fas fa-check-circle me-1"></i>' + r.paraf + '</span>';
                var tr = `
                    <tr>
                        <td class="text-center">${idx + 1}</td>
                        <td class="text-center">${r.tanggal}</td>
                        <td>
                            <div class="fw-bold">${r.nama}</div>
                            <small class="text-muted">NIM. ${r.nim} | ${r.instansi}</small>
                        </td>
                        <td>${r.unitNama}</td>
                        <td class="text-center font-monospace">${r.jamMasuk}</td>
                        <td class="text-center font-monospace">${r.jamPulang}</td>
                        <td class="text-center"><span class="badge ${badgeStatus}">${r.status}</span></td>
                        <td class="text-center">${r.terlambat > 0 ? r.terlambat + ' mnt' : '-'}</td>
                        <td class="small">${parafCell}</td>
                    </tr>
                `;
                tbody.append(tr);
            });
        }

        // Tampilkan Summary Widget
        $('#statHadir').text(totalHadir);
        $('#statTerlambat').text(totalTerlambat);
        $('#statIzin').text(totalIzin);
        $('#statSakit').text(totalSakit);
        $('#statTotalRecord').text(filtered.length);
    }

    function renderLogbook(unitId, pesertaId, tglMulai, tglSelesai) {
        var filtered = dataRekapLogbook.filter(function(row) {
            var matchUnit = !unitId || row.unitId == unitId;
            var matchPeserta = true;
            if (pesertaId) {
                var p = masterPeserta.find(item => item.id == pesertaId);
                if (p) matchPeserta = (row.nama === p.nama);
            }
            var matchTgl = true;
            if (tglMulai && row.tanggal < tglMulai) matchTgl = false;
            if (tglSelesai && row.tanggal > tglSelesai) matchTgl = false;
            return matchUnit && matchPeserta && matchTgl;
        });

        var tbody = $('#tabelLaporanLogbook tbody');
        tbody.empty();

        if (filtered.length === 0) {
            tbody.append('<tr><td colspan="7" class="text-center py-4 text-muted">Tidak ada data rekap logbook untuk filter yang dipilih.</td></tr>');
        } else {
            filtered.forEach(function(r, idx) {
                var parafCell = r.status === 'Menunggu'
                    ? '<span class="text-warning"><i class="fas fa-clock me-1"></i>Menunggu verifikasi</span>'
                    : '<span class="text-success"><i class="fas fa-check-circle me-1"></i>' + r.paraf + '</span>';
                var tr = `
                    <tr>
                        <td class="text-center">${idx + 1}</td>
                        <td class="text-center">${r.tanggal}</td>
                        <td>
                            <div class="fw-bold">${r.nama}</div>
                            <small class="text-muted">${r.instansi}</small>
                        </td>
                        <td>${r.unitNama}</td>
                        <td>${r.kegiatan}</td>
                        <td class="text-center"><span class="badge bg-success">${r.status}</span></td>
                        <td class="small">${parafCell}</td>
                    </tr>
                `;
                tbody.append(tr);
            });
        }

        $('#statTotalRecord').text(filtered.length);
    }

    // Trigger Update
    $('#btnFilter, #jenisLaporan').on('click change', function() {
        updateLaporan();
    });

    // Reset Filter
    $('#btnReset').on('click', function() {
        $('#filterUnit').val('');
        $('#filterPeserta').val('');
        $('#jenisLaporan').val('presensi');
        $('#tglMulai').val(toDateInputValue(firstDay));
        $('#tglSelesai').val(toDateInputValue(today));
        $('#filterUnit').trigger('change');
        updateLaporan();
    });

    // Tombol Cetak
    $('#btnCetakLaporan').on('click', function() {
        window.print();
    });

    // Helper: ambil teks bersih dari sel HTML (hapus tag)
    function stripHtml(html) {
        var tmp = document.createElement('div');
        tmp.innerHTML = html;
        return (tmp.textContent || tmp.innerText || '').trim().replace(/\s+/g, ' ');
    }

    // Helper: escape nilai CSV
    function csvEsc(val) {
        val = String(val).replace(/"/g, '""');
        if (val.indexOf(',') !== -1 || val.indexOf('"') !== -1 || val.indexOf('\n') !== -1) {
            val = '"' + val + '"';
        }
        return val;
    }

    // Tombol Export CSV (dibuka sebagai file .csv yang bisa dibuka Excel)
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

        var csvContent = '\uFEFF' + csvLines.join('\n'); // BOM untuk Excel UTF-8
        var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        var tglSelesai = $('#tglSelesai').val() || new Date().toISOString().slice(0, 10);
        link.setAttribute('href', url);
        link.setAttribute('download', 'rekap_' + jenis + '_' + tglSelesai + '.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });

    // Inisialisasi awal
    updateLaporan();
});
