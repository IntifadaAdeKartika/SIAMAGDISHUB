// masterData.js - Sumber Data Tunggal SIAMAG DISHUB

window.masterUnitKerja = [
  { id: 1, kode: "SEKRET", nama: "Sekretariat", tipe: "sekretariat", parentId: null },
  { id: 2, kode: "UMPEG", nama: "Sub Bagian Umum Dan Kepegawaian", tipe: "sub_bagian", parentId: 1 },
  { id: 3, kode: "KEUPROG", nama: "Sub Bagian Keuangan Dan Penyusunan Program", tipe: "sub_bagian", parentId: 1 },
  { id: 4, kode: "ANGKUT", nama: "Bidang Angkutan", tipe: "bidang", parentId: 1 },
  { id: 5, kode: "ANGOR", nama: "Seksi Angkutan Orang", tipe: "seksi", parentId: 4 },
  { id: 6, kode: "ANGBAR", nama: "Seksi Angkutan Barang", tipe: "seksi", parentId: 4 },
  { id: 7, kode: "LLSP", nama: "Bidang Lalu Lintas, Sarana, Prasarana", tipe: "bidang", parentId: 1 },
  { id: 8, kode: "PARKIR", nama: "Seksi Perparkiran", tipe: "seksi", parentId: 7 },
  { id: 9, kode: "MRLL", nama: "Seksi Manajemen Rekayasa Lalu Lintas", tipe: "seksi", parentId: 7 },
  { id: 10, kode: "PJU", nama: "Seksi Penerangan Jalan Umum", tipe: "seksi", parentId: 7 },
  { id: 11, kode: "POLLAJ", nama: "Bidang Pengendalian Operasional Lalu Lintas & Angkutan Jalan", tipe: "bidang", parentId: 1 },
  { id: 12, kode: "UPT", nama: "UPT Pengujian Kendaraan Bermotor", tipe: "upt", parentId: 1 }
];

window.masterPeserta = [
  {
    id: 1,
    nim: "220102001",
    nama: "Intifada Ade Kartika",
    instansi: "Univ. Muhammadiyah Ponorogo",
    unitId: 1,
    jenis_peserta: "mahasiswa",
    prodi_jurusan: "Teknik Informatika",
    kelas_semester: "Semester 7",
    dosen_guru_pembimbing: "Dr. Bambang Sutikno, M.Kom.",
    no_hp: "081234567801",
    status_peserta: "aktif",
    tanggal_mulai: "2026-08-01",
    tanggal_selesai: "2026-11-30",
    surat_permohonan: {
      nomor_surat: "045/FT-UMPO/VII/2026",
      nama_file: "Surat_Permohonan_Magang_UMPO_Intifada.pdf",
      ukuran: "1.2 MB",
      tanggal_upload: "2026-07-20",
      status: "sudah_upload"
    },
    surat_balasan: {
      nomor_surat: "551.1/142/405.15/2026",
      nama_file: "Surat_Balasan_Dinas_Dishub_Intifada.pdf",
      ukuran: "840 KB",
      tanggal_upload: "2026-07-25",
      status: "diterbitkan"
    }
  },
  {
    id: 2,
    nim: "220203002",
    nama: "Ayu Sri",
    instansi: "Universitas Brawijaya",
    unitId: 5,
    jenis_peserta: "mahasiswa",
    prodi_jurusan: "Perencanaan Wilayah & Kota",
    kelas_semester: "Semester 7",
    dosen_guru_pembimbing: "Prof. Dr. Ir. Herman, M.T.",
    no_hp: "081234567802",
    status_peserta: "aktif",
    tanggal_mulai: "2026-08-01",
    tanggal_selesai: "2026-11-30",
    surat_permohonan: {
      nomor_surat: "112/PWK-UB/VII/2026",
      nama_file: "Surat_Permohonan_Magang_UB_AyuSri.pdf",
      ukuran: "1.5 MB",
      tanggal_upload: "2026-07-22",
      status: "sudah_upload"
    },
    surat_balasan: {
      nomor_surat: "551.1/148/405.15/2026",
      nama_file: "Surat_Balasan_Dinas_Dishub_AyuSri.pdf",
      ukuran: "780 KB",
      tanggal_upload: "2026-07-26",
      status: "diterbitkan"
    }
  },
  {
    id: 3,
    nim: "220304003",
    nama: "Siti Aminah",
    instansi: "SMKN 1 Jenangan Ponorogo",
    unitId: 5,
    jenis_peserta: "siswa",
    prodi_jurusan: "Teknik Kendaraan Ringan",
    kelas_semester: "Kelas XII",
    dosen_guru_pembimbing: "Drs. Eko Prasetyo",
    no_hp: "081234567803",
    status_peserta: "aktif",
    tanggal_mulai: "2026-08-01",
    tanggal_selesai: "2026-11-30",
    surat_permohonan: {
      nomor_surat: "421.5/310/SMKN1/VII/2026",
      nama_file: "Surat_Permohonan_PKL_SMKN1Jenangan_Siti.pdf",
      ukuran: "950 KB",
      tanggal_upload: "2026-07-24",
      status: "sudah_upload"
    },
    surat_balasan: {
      nomor_surat: "551.1/155/405.15/2026",
      nama_file: "Surat_Balasan_Dinas_Dishub_SitiAminah.pdf",
      ukuran: "810 KB",
      tanggal_upload: "2026-07-28",
      status: "diterbitkan"
    }
  },
  {
    id: 4,
    nim: "220405004",
    nama: "Addelia",
    instansi: "SMK PGRI 2 Ponorogo",
    unitId: 8,
    jenis_peserta: "siswa",
    prodi_jurusan: "Teknik Komputer & Jaringan",
    kelas_semester: "Kelas XII",
    dosen_guru_pembimbing: "Nanik Suryani, S.Pd.",
    no_hp: "081234567804",
    status_peserta: "aktif",
    tanggal_mulai: "2026-08-01",
    tanggal_selesai: "2026-11-30",
    surat_permohonan: {
      nomor_surat: "098/SMK-PGRI2/VII/2026",
      nama_file: "Surat_Permohonan_PKL_SMKPGRI2_Addelia.pdf",
      ukuran: "1.1 MB",
      tanggal_upload: "2026-07-25",
      status: "sudah_upload"
    },
    surat_balasan: null
  }
];

window.masterPembimbing = [
  { id: 1, nama: "Dra. Ida", unitId: 1 },
  { id: 2, nama: "Siti, S.Tra.", unitId: 2 },
  { id: 3, nama: "Wahyu, S.E.", unitId: 3 },
  { id: 4, nama: "Ir. Bambang", unitId: 4 },
  { id: 5, nama: "Adi, S.T.", unitId: 5 },
  { id: 6, nama: "Indra, S.T.", unitId: 6 },
  { id: 7, nama: "Ir. Sugeng", unitId: 7 },
  { id: 8, nama: "Agus, S.Sos.", unitId: 8 },
  { id: 9, nama: "Eko, S.T.", unitId: 9 },
  { id: 10, nama: "Andi, S.T.", unitId: 10 },
  { id: 11, nama: "Budi, S.Sos.", unitId: 11 },
  { id: 12, nama: "Drs. Joko", unitId: 12 }
];

window.getMasterUnit = function(id) {
  return window.masterUnitKerja.find(function(unit) {
    return unit.id == id;
  });
};

window.getMasterPembimbingForUnit = function(unitId) {
  return window.masterPembimbing.find(function(pembimbing) {
    return pembimbing.unitId == unitId;
  });
};

window.getMasterPeserta = function(identifier) {
  return window.masterPeserta.find(function(peserta) {
    return peserta.nim === identifier || peserta.nama === identifier || peserta.id == identifier;
  });
};

window.getMasterPenempatanPeserta = function(identifier) {
  var peserta = window.getMasterPeserta(identifier);
  if (!peserta) return null;

  var unit = window.getMasterUnit(peserta.unitId);
  var pembimbing = window.getMasterPembimbingForUnit(peserta.unitId);
  return {
    peserta: peserta,
    unit: unit,
    pembimbing: pembimbing,
    namaPembimbing: pembimbing ? pembimbing.nama : "-"
  };
};

// Helper Persistensi Dokumen Magang (LocalStorage)
window.getDokumenStorageKey = function() {
  return 'siamag_dokumen_magang';
};

window.getAllDokumenPeserta = function() {
  try {
    var stored = localStorage.getItem(window.getDokumenStorageKey());
    if (stored) {
      return JSON.parse(stored);
    }
  } catch(e) {}
  
  // Default dari masterPeserta
  var initialDocs = {};
  window.masterPeserta.forEach(function(p) {
    initialDocs[p.id] = {
      peserta_id: p.id,
      surat_permohonan: p.surat_permohonan ? Object.assign({}, p.surat_permohonan) : null,
      surat_balasan: p.surat_balasan ? Object.assign({}, p.surat_balasan) : null
    };
  });
  try {
    localStorage.setItem(window.getDokumenStorageKey(), JSON.stringify(initialDocs));
  } catch(e) {}
  return initialDocs;
};

window.getDokumenPesertaById = function(pesertaId) {
  var docs = window.getAllDokumenPeserta();
  return docs[pesertaId] || { peserta_id: pesertaId, surat_permohonan: null, surat_balasan: null };
};

window.simpanSuratPermohonan = function(pesertaId, dataSurat) {
  var docs = window.getAllDokumenPeserta();
  if (!docs[pesertaId]) {
    docs[pesertaId] = { peserta_id: pesertaId, surat_permohonan: null, surat_balasan: null };
  }
  docs[pesertaId].surat_permohonan = {
    nomor_surat: dataSurat.nomor_surat || "SURAT/KAMPUS/" + new Date().getFullYear(),
    nama_file: dataSurat.nama_file || "Surat_Permohonan.pdf",
    ukuran: dataSurat.ukuran || "1.2 MB",
    tanggal_upload: dataSurat.tanggal_upload || new Date().toISOString().split('T')[0],
    status: "sudah_upload"
  };
  localStorage.setItem(window.getDokumenStorageKey(), JSON.stringify(docs));
  return docs[pesertaId];
};

window.simpanSuratBalasan = function(pesertaId, dataSurat) {
  var docs = window.getAllDokumenPeserta();
  if (!docs[pesertaId]) {
    docs[pesertaId] = { peserta_id: pesertaId, surat_permohonan: null, surat_balasan: null };
  }
  docs[pesertaId].surat_balasan = {
    nomor_surat: dataSurat.nomor_surat || "551.1/DISHUB/" + new Date().getFullYear(),
    nama_file: dataSurat.nama_file || "Surat_Balasan_Dishub.pdf",
    ukuran: dataSurat.ukuran || "820 KB",
    tanggal_upload: dataSurat.tanggal_upload || new Date().toISOString().split('T')[0],
    status: "diterbitkan"
  };
  localStorage.setItem(window.getDokumenStorageKey(), JSON.stringify(docs));
  return docs[pesertaId];
};

// Helper Unduh File Simulasi PDF
window.unduhFileDokumen = function(namaFile, judulDokumen, isiDetail) {
  var sampleContent = "%PDF-1.4\n1 0 obj\n<< /Title (" + (judulDokumen || namaFile) + ") /Author (SIAMAG Dishub Ponorogo) >>\nendobj\n" +
    (isiDetail || "Dokumen Resmi Magang Dinas Perhubungan Kabupaten Ponorogo");
  var blob = new Blob([sampleContent], { type: 'application/pdf' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = namaFile || 'dokumen.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Helper Modal Preview PDF Dokumen dengan SweetAlert2
window.previewDokumenSweetAlert = function(tipe, infoSurat, namaPeserta) {
  var isPermohonan = tipe === 'permohonan';
  var headerTitle = isPermohonan ? 'Surat Permohonan Magang' : 'Surat Balasan / Penerimaan Dinas';
  var iconClass = isPermohonan ? 'fa-file-invoice text-primary' : 'fa-file-circle-check text-success';
  var instansiTitle = isPermohonan ? 'Asal Sekolah / Kampus' : 'DINAS PERHUBUNGAN KABUPATEN PONOROGO';

  var contentHtml = `
    <div class="text-start p-2" style="font-family:'Poppins', sans-serif;">
      <div class="p-3 rounded mb-3 text-center border" style="background:#f8fafc;">
        <i class="fas ${iconClass} fa-3x mb-2"></i>
        <h6 class="fw-bold mb-0 text-dark">${infoSurat.nama_file}</h6>
        <div class="small text-muted">${infoSurat.ukuran || '1.1 MB'} &bull; Diunggah: ${infoSurat.tanggal_upload}</div>
      </div>
      <table class="table table-sm table-striped align-middle mb-0" style="font-size:0.85rem;">
        <tbody>
          <tr>
            <td class="text-muted" style="width:38%;">Nomor Surat</td>
            <td class="text-center" style="width:5%;">:</td>
            <td class="fw-bold text-dark">${infoSurat.nomor_surat || '-'}</td>
          </tr>
          <tr>
            <td class="text-muted">Nama Peserta</td>
            <td class="text-center">:</td>
            <td class="fw-semibold text-dark">${namaPeserta || '-'}</td>
          </tr>
          <tr>
            <td class="text-muted">Instansi Penerbit</td>
            <td class="text-center">:</td>
            <td class="fw-semibold text-dark">${instansiTitle}</td>
          </tr>
          <tr>
            <td class="text-muted">Status Dokumen</td>
            <td class="text-center">:</td>
            <td><span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>${isPermohonan ? 'Telah Diunggah' : 'Diterbitkan & Sah'}</span></td>
          </tr>
        </tbody>
      </table>
      <div class="mt-3 p-3 rounded bg-light border text-center small text-muted">
        <i class="fas fa-stamp text-primary me-1"></i>Dokumen ini terverifikasi secara elektronik dalam Sistem Informasi Magang (SIAMAG) Dishub Ponorogo.
      </div>
    </div>
  `;

  Swal.fire({
    title: '<i class="fas ' + iconClass + ' me-2"></i>' + headerTitle,
    html: contentHtml,
    width: 580,
    showCancelButton: true,
    confirmButtonColor: '#334EAC',
    cancelButtonColor: '#6c757d',
    confirmButtonText: '<i class="fas fa-download me-1"></i> Unduh File PDF',
    cancelButtonText: 'Tutup'
  }).then(function(result) {
    if (result.isConfirmed) {
      window.unduhFileDokumen(infoSurat.nama_file, headerTitle, 'Nomor: ' + infoSurat.nomor_surat + ' | Peserta: ' + namaPeserta);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Berkas PDF berhasil diunduh',
        showConfirmButton: false,
        timer: 1800
      });
    }
  });
};
