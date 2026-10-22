/* Riwayat aktivitas seluruh pengguna (Admin, Pembimbing, Peserta)
mencakup login, presensi, verifikasi logbook, CRUD data master, dan ekspor data. */

$(document).ready(function() {

    // Log aktivitas sistem audit trail
    var dataLogAktivitas = [
        {
            id: 1,
            waktu: "2026-10-14 07:32:20",
            pengguna: window.masterPeserta[0].nama,
            role: "peserta_magang",
            aktivitas: "Presensi Masuk",
            modul: "Presensi",
            keterangan: "Check-in presensi masuk dalam radius 18 meter",
            ipAddress: "192.168.1.105",
            tipeBadge: "bg-success"
        },
        {
            id: 2,
            waktu: "2026-10-14 08:30:12",
            pengguna: window.masterPembimbing[4].nama,
            role: "pembimbing",
            aktivitas: "Verifikasi Presensi",
            modul: "Absensi Bimbingan",
            keterangan: "Paraf presensi masuk Intifada Ade Kartika",
            ipAddress: "192.168.1.42",
            tipeBadge: "bg-primary"
        },
        {
            id: 3,
            waktu: "2026-10-14 09:00:15",
            pengguna: "Admin Dishub",
            role: "admin",
            aktivitas: "Monitoring Absensi",
            modul: "Absensi Peserta",
            keterangan: "Melihat daftar presensi peserta magang hari ini",
            ipAddress: "192.168.1.10",
            tipeBadge: "bg-dark"
        }
    ];

    var table = $('#tabelLogAktivitas').DataTable({
        responsive: true,
        language: {
            search: "Cari Log:",
            lengthMenu: "Tampilkan _MENU_ data",
            zeroRecords: "Log aktivitas tidak ditemukan",
            info: "Menampilkan _START_ s/d _END_ dari _TOTAL_ log",
            infoEmpty: "Menampilkan 0 log",
            paginate: { first: "Awal", last: "Akhir", next: "→", previous: "←" }
        },
        order: [[1, 'desc']]
    });

    function renderData() {
        table.clear();

        var roleFilter = $('#filterRole').val();

        dataLogAktivitas.forEach(function(item, index) {
            if (roleFilter && item.role !== roleFilter) return;

            var badgeRole = 'bg-secondary';
            var roleText = 'Peserta Magang';
            if (item.role === 'admin') {
                badgeRole = 'bg-dark';
                roleText = 'Administrator';
            } else if (item.role === 'pembimbing') {
                badgeRole = 'bg-primary';
                roleText = 'Pembimbing';
            }

            var btnDetail = `
                <button class="btn btn-sm btn-outline-info btn-detail-audit" data-id="${item.id}" title="Detail Audit Trail">
                    <i class="fas fa-search-plus"></i>
                </button>
            `;

            table.row.add([
                index + 1,
                `<span class="font-monospace small">${item.waktu}</span>`,
                `<div>
                    <span class="fw-semibold text-dark">${item.pengguna}</span>
                    <div><span class="badge ${badgeRole}" style="font-size:0.65rem;">${roleText}</span></div>
                 </div>`,
                `<span class="badge ${item.tipeBadge}">${item.aktivitas}</span>`,
                `<span class="small fw-semibold text-secondary">${item.modul}</span>`,
                `<div class="small text-muted text-truncate" style="max-width: 280px;" title="${item.keterangan}">${item.keterangan}</div>`,
                `<span class="badge bg-light text-dark font-monospace border">${item.ipAddress}</span>`,
                btnDetail
            ]);
        });

        table.draw();
        $('#statTotalAudit').text(dataLogAktivitas.length);
    }

    renderData();

    $('#filterRole').on('change', function() {
        renderData();
    });

    // Detail Audit Trail
    $(document).on('click', '.btn-detail-audit', function() {
        var id = $(this).data('id');
        var item = dataLogAktivitas.find(x => x.id === id);
        if (!item) return;

        Swal.fire({
            title: '<i class="fas fa-shield-alt text-primary me-2"></i>Detail Audit Trail Log',
            html: `
                <div class="text-start bg-light p-3 rounded small">
                    <p class="mb-1"><b>Waktu Kejadian:</b> ${item.waktu} WIB</p>
                    <p class="mb-1"><b>Akun Pengguna:</b> ${item.pengguna} (${item.role})</p>
                    <p class="mb-1"><b>Aksi / Aktivitas:</b> ${item.aktivitas}</p>
                    <p class="mb-1"><b>Modul Sistem:</b> ${item.modul}</p>
                    <p class="mb-1"><b>Alamat IP Client:</b> ${item.ipAddress}</p>
                    <hr class="my-2">
                    <p class="mb-0"><b>Deskripsi Lengkap:</b><br>${item.keterangan}</p>
                </div>
            `,
            confirmButtonText: 'Tutup',
            confirmButtonColor: '#334EAC'
        });
    });

    function escapeCsv(value) {
        var text = String(value == null ? '' : value).replace(/"/g, '""');
        return '"' + text + '"';
    }

    // Export Log
    $('#btnExportLog').on('click', function() {
        var roleFilter = $('#filterRole').val();
        var rows = dataLogAktivitas.filter(function(item) {
            return !roleFilter || item.role === roleFilter;
        });
        var csvRows = [
            ['Waktu', 'Pengguna', 'Role', 'Aktivitas', 'Modul', 'Keterangan', 'IP Address']
        ];

        rows.forEach(function(item) {
            csvRows.push([
                item.waktu,
                item.pengguna,
                item.role,
                item.aktivitas,
                item.modul,
                item.keterangan,
                item.ipAddress
            ]);
        });

        var csvContent = '\uFEFF' + csvRows.map(function(row) {
            return row.map(escapeCsv).join(',');
        }).join('\r\n');
        var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = 'log_aktivitas_' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(function() {
            URL.revokeObjectURL(url);
        }, 1000);
    });
});
