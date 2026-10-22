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
  { id: 1, nim: "220102001", nama: "Intifada Ade Kartika", instansi: "Univ. Muhammadiyah Ponorogo", unitId: 1 },
  { id: 2, nim: "220203002", nama: "Ayu Sri", instansi: "Universitas Brawijaya", unitId: 5 },
  { id: 3, nim: "220304003", nama: "Siti Aminah", instansi: "SMKN 1 Jenangan Ponorogo", unitId: 5 },
  { id: 4, nim: "220405004", nama: "Addelia", instansi: "SMK PGRI 2 Ponorogo", unitId: 8 }
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
