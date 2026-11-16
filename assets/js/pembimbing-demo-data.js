window.pembimbingDemoData = (function() {
    var attendanceRows = [
        {
            id_absensi: 1,
            id_peserta_magang: 1,
            tanggal_jam: "2026-10-14 07:15:20",
            lokasi: "Kantor Sekretariat Dishub",
            latitude: -7.8682,
            longitude: 111.4623,
            foto_selfie: "selfie_intifada_14okt.jpg",
            status: "masuk",
            status_verifikasi: "approved",
            paraf_pembimbing: "paraf_pembimbing_1.png",
            keterangan: "Presensi masuk telah diverifikasi."
        },
        {
            id_absensi: 2,
            id_peserta_magang: 2,
            tanggal_jam: "2026-10-14 07:22:10",
            lokasi: "Seksi Angkutan Orang",
            latitude: -7.8681,
            longitude: 111.4625,
            foto_selfie: "selfie_ayu_14okt.jpg",
            status: "masuk",
            status_verifikasi: "approved",
            paraf_pembimbing: "paraf_pembimbing_2.png",
            keterangan: "Presensi masuk telah diverifikasi."
        },
        {
            id_absensi: 3,
            id_peserta_magang: 3,
            tanggal_jam: "2026-10-14 08:01:45",
            lokasi: "Seksi Angkutan Orang",
            latitude: -7.8683,
            longitude: 111.4622,
            foto_selfie: "selfie_siti_14okt.jpg",
            status: "masuk",
            status_verifikasi: "pending",
            paraf_pembimbing: null,
            keterangan: null
        }
    ];

    var leaveRows = [
        {
            id_pengajuan_izin: 1,
            id_peserta_magang: 1,
            jenis: "izin",
            tanggal_mulai: "2026-10-16",
            tanggal_selesai: "2026-10-16",
            keterangan: "Bimbingan project magang dengan dosen pembimbing.",
            file_surat: "surat_izin_kampus.pdf",
            status: "pending",
            catatan_pembimbing: null
        },
        {
            id_pengajuan_izin: 2,
            id_peserta_magang: 2,
            jenis: "sakit",
            tanggal_mulai: "2026-10-12",
            tanggal_selesai: "2026-10-14",
            keterangan: "Radang pada usus dan membutuhkan penyembuhan sekitar 3 hari.",
            file_surat: "surat_keterangan_dokter.pdf",
            status: "approved",
            catatan_pembimbing: "Disetujui."
        }
    ];

    var logbookRows = [
        {
            id_logbook: 1,
            id_absensi: 1,
            id_peserta_magang: 1,
            tanggal: "2026-10-14",
            jam_mulai: "08:00",
            jam_selesai: "12:00",
            kegiatan: "Membantu mencetak SPMK dan melanjutkan pengembangan frontend sistem absensi magang.",
            foto_kegiatan: "bukti_kegiatan.jpg",
            status_verifikasi: "approved",
            catatan_pembimbing: "Pekerjaan rapi dan teliti."
        },
        {
            id_logbook: 2,
            id_absensi: 2,
            id_peserta_magang: 2,
            tanggal: "2026-10-14",
            jam_mulai: "08:00",
            jam_selesai: "12:00",
            kegiatan: "Pengarsipan surat masuk dan surat keluar bidang kepegawaian Dishub.",
            foto_kegiatan: null,
            status_verifikasi: "approved",
            catatan_pembimbing: "Tertib administrasi."
        },
        {
            id_logbook: 3,
            id_absensi: 3,
            id_peserta_magang: 3,
            tanggal: "2026-10-14",
            jam_mulai: "08:30",
            jam_selesai: "12:00",
            kegiatan: "Membantu mengarsipkan dokumen.",
            foto_kegiatan: "dokumen_arsip.jpg",
            status_verifikasi: "pending",
            catatan_pembimbing: null
        }
    ];

    function currentUser() {
        try {
            return JSON.parse(localStorage.getItem("siamag_user") || "null");
        } catch (error) {
            return null;
        }
    }

    function participantFor(row) {
        return window.getMasterPeserta(row.id_peserta_magang);
    }

    function enrichRows(rows) {
        return rows.map(function(row) {
            var participant = participantFor(row);
            var placement = participant && window.getMasterPenempatanPeserta(participant.id);
            return Object.assign({}, row, {
                nama: participant ? participant.nama : 'Peserta #' + row.id_peserta_magang,
                username: participant ? participant.nim : '-',
                instansi: participant ? participant.instansi : '-',
                unitId: placement && placement.unit ? placement.unit.id : null,
                unitNama: placement && placement.unit ? placement.unit.nama : '-',
                namaPembimbing: placement ? placement.namaPembimbing : '-'
            });
        });
    }

    function getContext() {
        var user = currentUser();
        var name = user && (user.nama_lengkap || user.nama || user.name || user.username);
        var mentor = window.masterPembimbing.find(function(item) {
            return item.nama === name;
        }) || window.masterPembimbing.find(function(item) {
            return item.nama === "Adi, S.T.";
        });
        if (!mentor) throw new Error("Data pembimbing aktif tidak ditemukan di masterData.js.");

        var unit = window.getMasterUnit(mentor.unitId);
        if (!unit) throw new Error("Unit kerja pembimbing aktif tidak ditemukan di masterData.js.");

        var participants = window.masterPeserta.filter(function(item) {
            return item.unitId === mentor.unitId;
        });
        function assigned(rows) {
            return enrichRows(rows).filter(function(row) {
                return row.unitId === mentor.unitId;
            });
        }

        return {
            pembimbing: mentor,
            unit: unit,
            peserta: participants,
            absensi: assigned(attendanceRows),
            izin: assigned(leaveRows),
            logbook: assigned(logbookRows),
            semuaAbsensi: enrichRows(attendanceRows),
            semuaLogbook: enrichRows(logbookRows)
        };
    }

    function getPesertaContext() {
        var user = currentUser();
        var name = user && (user.nama_lengkap || user.nama || user.name || user.username);
        var userProfile = user && user.peserta_magang;
        var peserta = window.getMasterPeserta((userProfile && userProfile.id) || name) || window.masterPeserta[0];
        if (!peserta) throw new Error("Data peserta aktif tidak ditemukan di masterData.js.");

        var placement = window.getMasterPenempatanPeserta(peserta.id);
        if (!placement || !placement.unit) {
            throw new Error("Penempatan peserta aktif tidak ditemukan di masterData.js.");
        }

        function ownRows(rows) {
            return enrichRows(rows).filter(function(row) {
                return row.id_peserta_magang === peserta.id;
            });
        }

        return {
            peserta: peserta,
            unit: placement.unit,
            pembimbing: placement.pembimbing,
            absensi: ownRows(attendanceRows),
            izin: ownRows(leaveRows),
            logbook: ownRows(logbookRows)
        };
    }

    return {
        getContext: getContext,
        getPesertaContext: getPesertaContext
    };
})();
