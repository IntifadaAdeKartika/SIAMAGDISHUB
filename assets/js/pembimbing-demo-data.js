window.pembimbingDemoData = (function() {
    var attendanceRows = [
        {
            id: 1,
            tanggal: "2026-10-14",
            nim: "220102001",
            jamMasuk: "07:15:20 WIB",
            jamPulang: "13:59",
            status: "Hadir",
            statusVerif: "Diverifikasi",
            foto: "selfie_intifada_14sep.jpg",
            jarak: 18
        },
        {
            id: 2,
            tanggal: "2026-10-14",
            nim: "220203002",
            jamMasuk: "07:22",
            jamPulang: "13:50",
            status: "Hadir",
            statusVerif: "Diverifikasi",
            foto: "selfie_ayu_14sep.jpg",
            jarak: 22
        },
        {
            id: 3,
            tanggal: "2026-10-14",
            nim: "220304003",
            jamMasuk: "08:01",
            jamPulang: "13:55",
            status: "Terlambat",
            statusVerif: "Menunggu",
            foto: "selfie_siti_14sep.jpg",
            jarak: 28
        }
    ];

    var leaveRows = [
        {
            id: 1,
            nim: "220102001",
            tglPengajuan: "2026-10-14",
            jenis: "Izin",
            tglMulai: "2026-10-16",
            tglSelesai: "2026-10-16",
            durasi: 1,
            alasan: "Bimbingan Project Magang dengan Dosen Pembimbing.",
            status: "Menunggu",
            fileSurat: "surat_izin_kampus.pdf"
        },
        {
            id: 2,
            nim: "220203002",
            tglPengajuan: "2026-10-10",
            jenis: "Sakit",
            tglMulai: "2026-10-12",
            tglSelesai: "2026-10-14",
            durasi: 3,
            alasan: "Radang pada usus dan membutuhkan penyembuhan sekitar 3 hari.",
            status: "Disetujui",
            fileSurat: "surat_keterangan_dokter.pdf",
            catatan: "Disetujui."
        }
    ];

    var logbookRows = [
        {
            id: 1,
            tanggal: "2026-10-14",
            nim: "220102001",
            jamMulai: "08:00",
            jamSelesai: "12:00",
            kegiatan: "Membantu mencetak SPMK dan melanjutkan pengembangan frontend sistem absensi magang.",
            hasil: "SPMK berhasil dicetak dan frontend sistem absensi magang berhasil diperbarui.",
            status: "Diverifikasi",
            catatan: "Pekerjaan rapi dan teliti.",
            lampiran: "bukti_kegiatan.jpg"
        },
        {
            id: 2,
            tanggal: "2026-10-14",
            nim: "220203002",
            jamMulai: "08:00",
            jamSelesai: "12:00",
            kegiatan: "Pengarsipan surat masuk dan surat keluar bidang kepegawaian Dishub.",
            hasil: "15 surat masuk teragenda pada buku register.",
            status: "Diverifikasi",
            catatan: "Tertib administrasi.",
            lampiran: "rekap_surat_masuk.pdf"
        },
        {
            id: 3,
            tanggal: "2026-10-14",
            nim: "220304003",
            jamMulai: "08:30",
            jamSelesai: "12:00",
            kegiatan: "Membantu mengarsipkan dokumen.",
            hasil: "Dokumen berhasil diarsipkan dengan rapi.",
            status: "Menunggu",
            catatan: "-",
            lampiran: "dokumen_arsip.jpg"
        }
    ];

    function getContext() {
        var user = JSON.parse(sessionStorage.getItem("user") || "null");
        var nama = user && (user.nama || user.username);
        var pembimbing = window.masterPembimbing.find(function(item) {
            return item.nama === nama;
        }) || window.masterPembimbing.find(function(item) {
            return item.nama === "Adi, S.T.";
        });

        if (!pembimbing) {
            throw new Error("Data pembimbing aktif tidak ditemukan di masterData.js.");
        }

        var unit = window.getMasterUnit(pembimbing.unitId);
        if (!unit) {
            throw new Error("Unit kerja pembimbing aktif tidak ditemukan di masterData.js.");
        }

        var peserta = window.masterPeserta.filter(function(item) {
            return item.unitId === pembimbing.unitId;
        });

        function mapParticipant(row) {
            var masterPeserta = window.getMasterPeserta(row.nim);
            var penempatan = window.getMasterPenempatanPeserta(row.nim);
            if (!masterPeserta || !penempatan) return null;

            return Object.assign({}, row, {
                nama: masterPeserta.nama,
                instansi: masterPeserta.instansi,
                unitId: penempatan.unit.id,
                unitNama: penempatan.unit.nama,
                namaPembimbing: penempatan.namaPembimbing,
                disetujuiOleh: row.disetujuiOleh ||
                    (row.status === "Disetujui" ? penempatan.namaPembimbing : "")
            });
        }

        function assignedRows(rows) {
            return rows.filter(function(row) {
                var masterPeserta = window.getMasterPeserta(row.nim);
                return masterPeserta && masterPeserta.unitId === pembimbing.unitId;
            }).map(mapParticipant).filter(Boolean);
        }

        return {
            pembimbing: pembimbing,
            unit: unit,
            peserta: peserta,
            absensi: assignedRows(attendanceRows),
            izin: assignedRows(leaveRows),
            logbook: assignedRows(logbookRows),
            semuaAbsensi: attendanceRows.map(mapParticipant).filter(Boolean),
            semuaLogbook: logbookRows.map(mapParticipant).filter(Boolean)
        };
    }

    function getPesertaContext() {
        var user = JSON.parse(sessionStorage.getItem("user") || "null");
        var nama = user && (user.nama || user.username);
        var peserta = window.getMasterPeserta(nama) || window.masterPeserta[0];
        if (!peserta) {
            throw new Error("Data peserta aktif tidak ditemukan di masterData.js.");
        }

        var penempatan = window.getMasterPenempatanPeserta(peserta.nim);
        if (!penempatan || !penempatan.unit) {
            throw new Error("Penempatan peserta aktif tidak ditemukan di masterData.js.");
        }

        var absensi = attendanceRows.filter(function(row) {
            return row.nim === peserta.nim;
        }).map(function(row) {
            return {
                id: row.id,
                tanggal: row.tanggal,
                nim: peserta.nim,
                nama: peserta.nama,
                instansi: peserta.instansi,
                jamMasuk: row.jamMasuk.replace(/ WIB$/, ''),
                jamPulang: row.jamPulang,
                status: row.status,
                verifikasi: row.statusVerif,
                foto: row.foto,
                jarak: row.jarak,
                pembimbing: penempatan.namaPembimbing
            };
        });

        var izin = leaveRows.filter(function(row) {
            return row.nim === peserta.nim;
        }).map(function(row) {
            return {
                id: row.id,
                jenis: row.jenis.toLowerCase(),
                tanggal_mulai: row.tglMulai,
                tanggal_selesai: row.tglSelesai,
                durasi_hari: row.durasi,
                alasan: row.alasan,
                file_surat: row.fileSurat,
                status: row.status.toLowerCase(),
                catatan_pembimbing: row.catatan || '-',
                pembimbing: penempatan.namaPembimbing
            };
        });

        var logbook = logbookRows.filter(function(row) {
            return row.nim === peserta.nim;
        }).map(function(row) {
            return {
                id: row.id,
                tanggal: row.tanggal,
                waktu_mulai: row.jamMulai,
                waktu_selesai: row.jamSelesai,
                deskripsi_kegiatan: row.kegiatan,
                hasil_kegiatan: row.hasil,
                file_lampiran: row.lampiran,
                status_verifikasi: row.status.toLowerCase() === 'diverifikasi' ? 'diverifikasi' :
                    row.status.toLowerCase() === 'ditolak' ? 'ditolak' : 'menunggu',
                catatan_pembimbing: row.catatan || '-',
                pembimbing: penempatan.namaPembimbing
            };
        });

        return {
            peserta: peserta,
            unit: penempatan.unit,
            pembimbing: penempatan.pembimbing,
            absensi: absensi,
            izin: izin,
            logbook: logbook
        };
    }

    return {
        getContext: getContext,
        getPesertaContext: getPesertaContext
    };
})();
