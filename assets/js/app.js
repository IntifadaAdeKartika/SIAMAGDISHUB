/* app.js - Shared utilities and dashboard handlers
   Handles sidebar navigation, session validation, user profile, and notifications
 */

$(document).ready(function() {

    // Validasi sesi aktif pengguna
    var user = JSON.parse(sessionStorage.getItem('user') || 'null');
    
    if (user) {
        $('#userName').text(user.nama || user.username);
        $('#userRole').text(formatRole(user.role));
        $('#userInitial').text((user.nama || user.username).charAt(0).toUpperCase());
    }

    // Toggle sidebar pada tampilan mobile
    $('#btnToggleSidebar').on('click', function() {
        $('#sidebar').toggleClass('show');
        $('#sidebarOverlay').toggleClass('show');
    });

    // Tutup sidebar saat klik overlay
    $('#sidebarOverlay').on('click', function() {
        $('#sidebar').removeClass('show');
        $(this).removeClass('show');
    });

    // Handler logout pengguna
    $('#btnLogout, .btn-logout').on('click', function(e) {
        e.preventDefault();
        
        Swal.fire({
            title: 'Logout?',
            text: 'Apakah Anda Yakin ingin keluar dari sistem?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#2563eb',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Ya, Logout',
            cancelButtonText: 'Batal'
        }).then(function(result) {
            if (result.isConfirmed) {
                sessionStorage.removeItem('user');
                window.location.href = '../login.html';
            }
        });
    });

    // ACTIVE MENU
    // Tandai menu sidebar yang aktif berdasarkan halaman sekarang
    var currentPage = window.location.pathname.split('/').pop();
    $('.sidebar-menu a').each(function() {
        var href = $(this).attr('href');
        if (href && href.indexOf(currentPage) !== -1) {
            $(this).addClass('active');
        }
    });

    // Notifikasi demo diselaraskan dengan data peserta dan status verifikasi.
    var notificationExamples = [
        { id: 'attendance-siti', type: 'attendance', nim: '220304003', status: 'Menunggu', waktu: '14 Okt 2026' },
        { id: 'leave-intifada', type: 'leave', nim: '220102001', status: 'Menunggu', waktu: '14 Okt 2026' },
        { id: 'logbook-siti', type: 'logbook', nim: '220304003', status: 'Menunggu', waktu: '14 Okt 2026' },
        { id: 'attendance-intifada', type: 'attendance', nim: '220102001', status: 'Diverifikasi', waktu: '14 Okt 2026' },
        { id: 'logbook-intifada', type: 'logbook', nim: '220102001', status: 'Diverifikasi', waktu: '14 Okt 2026' },
        { id: 'attendance-ayu', type: 'attendance', nim: '220203002', status: 'Diverifikasi', waktu: '14 Okt 2026' },
        { id: 'leave-ayu', type: 'leave', nim: '220203002', status: 'Disetujui', waktu: '10 Okt 2026' },
        { id: 'logbook-ayu', type: 'logbook', nim: '220203002', status: 'Diverifikasi', waktu: '14 Okt 2026' }
    ];
    var roleByPath = {
        admin: 'admin',
        pembimbing: 'pembimbing',
        peserta: 'peserta_magang'
    };
    var pathRole = window.location.pathname.split('/').filter(function(segment) {
        return Object.prototype.hasOwnProperty.call(roleByPath, segment);
    })[0];
    var currentRole = (user && user.role) || roleByPath[pathRole] || 'admin';
    var userName = user && (user.nama || user.username);
    var currentParticipant = window.getMasterPeserta && (window.getMasterPeserta(userName) ||
        (currentRole === 'peserta_magang' && window.masterPeserta[0]));
    var currentMentor = window.masterPembimbing && (window.masterPembimbing.find(function(item) {
        return item.nama === userName;
    }) || (currentRole === 'pembimbing' && window.masterPembimbing[4]));
    var notificationRoutes = {
        attendance: currentRole === 'admin' ? 'absensi.html' : '../' + currentRoleFolder(currentRole) + '/absensi.html',
        leave: currentRole === 'admin' ? 'pengajuan-izin.html' : '../' + currentRoleFolder(currentRole) + '/pengajuan-izin.html',
        logbook: currentRole === 'admin' ? 'logbook.html' : '../' + currentRoleFolder(currentRole) + '/logbook.html'
    };

    function currentRoleFolder(role) {
        return role === 'peserta_magang' ? 'peserta' : role;
    }

    function createNotification(example) {
        var participant = window.getMasterPeserta ? window.getMasterPeserta(example.nim) : null;
        if (!participant) return null;

        var isPending = example.status === 'Menunggu';
        var typeLabels = {
            attendance: { noun: 'absensi', icon: 'fa-fingerprint' },
            leave: { noun: 'pengajuan izin', icon: 'fa-file-alt' },
            logbook: { noun: 'logbook', icon: 'fa-book' }
        };
        var type = typeLabels[example.type];
        var messages = {
            attendance: isPending ? (currentRole === 'peserta_magang' ? 'Presensi Anda menunggu verifikasi pembimbing.' : 'Presensi ' + participant.nama + ' menunggu verifikasi.') : 'Presensi Anda tanggal 14 Oktober telah diverifikasi.',
            leave: isPending ? (currentRole === 'peserta_magang' ? 'Pengajuan izin Anda menunggu persetujuan pembimbing.' : 'Pengajuan izin ' + participant.nama + ' menunggu tindak lanjut.') : 'Pengajuan izin Anda telah disetujui.',
            logbook: isPending ? (currentRole === 'peserta_magang' ? 'Logbook Anda menunggu verifikasi pembimbing.' : 'Logbook ' + participant.nama + ' menunggu verifikasi.') : 'Logbook Anda tanggal 14 Oktober telah diverifikasi.'
        };

        return {
            id: example.id,
            ikon: type.icon,
            judul: (isPending ? 'Perlu ditindaklanjuti: ' : 'Pembaruan: ') + type.noun,
            pesan: messages[example.type],
            waktu: example.waktu,
            url: notificationRoutes[example.type],
            unread: true
        };
    }

    var myNotifs = notificationExamples.filter(function(example) {
        if (currentRole === 'admin') return example.status === 'Menunggu';
        if (currentRole === 'pembimbing') {
            var participant = window.getMasterPeserta && window.getMasterPeserta(example.nim);
            return example.status === 'Menunggu' && currentMentor && participant &&
                participant.unitId === currentMentor.unitId;
        }
        return currentRole === 'peserta_magang' && currentParticipant &&
            example.nim === currentParticipant.nim;
    }).map(createNotification).filter(Boolean);
    var readStorageKey = 'siamag-notif-read-' + currentRole + '-' + ((user && user.username) || userName || 'demo');
    var readIds = JSON.parse(sessionStorage.getItem(readStorageKey) || '[]');
    myNotifs.forEach(function(item) {
        item.unread = readIds.indexOf(item.id) === -1;
    });

    function updateNotificationBadge() {
        var unreadCount = myNotifs.filter(function(item) { return item.unread; }).length;
        $('.notif-badge').text(unreadCount > 0 ? unreadCount : '').toggle(unreadCount > 0);
    }

    function saveReadNotifications() {
        sessionStorage.setItem(readStorageKey, JSON.stringify(myNotifs
            .filter(function(item) { return !item.unread; })
            .map(function(item) { return item.id; })));
    }

    function escapeNotificationText(value) {
        return String(value).replace(/[&<>"']/g, function(character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    updateNotificationBadge();

    $('#btnNotif').on('click', function() {
        var itemsHtml = myNotifs.length === 0
            ? '<div class="p-4 text-center text-muted small"><i class="fas fa-bell-slash mb-2 d-block fa-2x"></i>Tidak ada pemberitahuan baru</div>'
            : myNotifs.map(function(item) {
                return `
                    <a href="${escapeNotificationText(item.url)}" data-notification-id="${escapeNotificationText(item.id)}" class="d-flex align-items-start p-2 border-bottom notif-item text-decoration-none ${item.unread ? 'bg-light' : ''}" style="text-align: left;">
                        <div class="me-3 mt-1 text-primary"><i class="fas ${escapeNotificationText(item.ikon)} fa-lg"></i></div>
                        <div class="flex-grow-1">
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="fw-bold small text-dark">${escapeNotificationText(item.judul)}</span>
                                <span class="badge ${item.unread ? 'bg-primary' : 'bg-light text-muted'} rounded-pill" style="font-size: 0.65rem;">${escapeNotificationText(item.waktu)}</span>
                            </div>
                            <p class="mb-0 text-muted small" style="line-height: 1.3;">${escapeNotificationText(item.pesan)}</p>
                        </div>
                    </a>
                `;
            }).join('');

        Swal.fire({
            title: '<div class="d-flex justify-content-between align-items-center w-100 px-2"><span>Pemberitahuan</span><button type="button" class="btn btn-sm btn-link text-decoration-none" id="btnMarkAllRead" style="font-size:0.8rem;">Tandai Dibaca</button></div>',
            html: '<div style="max-height: 320px; overflow-y: auto;">' + itemsHtml + '</div>',
            showConfirmButton: false,
            showCloseButton: true,
            width: '450px',
            didOpen: function() {
                $('.notif-item').on('click', function() {
                    var notificationId = $(this).data('notification-id');
                    var item = myNotifs.find(function(notification) {
                        return notification.id === notificationId;
                    });
                    if (item) {
                        item.unread = false;
                        saveReadNotifications();
                    }
                });
                $('#btnMarkAllRead').on('click', function() {
                    myNotifs.forEach(function(item) { item.unread = false; });
                    saveReadNotifications();
                    updateNotificationBadge();
                    Swal.close();
                });
            }
        });
    });

});

// Format role
function formatRole(role) {
    var roles = {
        'admin': 'Administrator',
        'pembimbing': 'Pembimbing Lapangan',
        'peserta_magang': 'Peserta Magang'
    };
    return roles[role] || role;
}

// Format angka pakai titik (1000 -> 1.000)
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Format tanggal_jam (global)
const NAMA_BULAN = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const NAMA_HARI = [
    'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
];

function formatTanggal(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.getDate() + ' ' + NAMA_BULAN[d.getMonth()] + ' ' + d.getFullYear();
}

function formatTanggalLengkap(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return NAMA_HARI[d.getDay()] + ', ' + 
           d.getDate() + ' ' + NAMA_BULAN[d.getMonth()] + ' ' + 
           d.getFullYear();
}

function formatWaktu(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return ('0' + d.getHours()).slice(-2) + ':' + 
           ('0' + d.getMinutes()).slice(-2);
}

function formatWaktuLengkap(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return ('0' + d.getHours()).slice(-2) + ':' + 
           ('0' + d.getMinutes()).slice(-2) + ':' + 
           ('0' + d.getSeconds()).slice(-2);
}

function formatTanggalJam(dateStr) {
    if (!dateStr) return '-';
    return formatTanggal(dateStr) + ', ' + formatWaktu(dateStr);
}

function formatTanggalJamLengkap(dateStr) {
    if (!dateStr) return '-';
    return formatTanggalLengkap(dateStr) + ', ' + formatWaktuLengkap(dateStr);
}

function formatTanggalInput(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.getFullYear() + '-' + 
           ('0' + (d.getMonth() + 1)).slice(-2) + '-' + 
           ('0' + d.getDate()).slice(-2);
}

function formatJamInput(dateStr) {
    if (!dateStr) return '';
    return formatWaktu(dateStr);
}

function hariIni() {
    return formatTanggalLengkap(new Date());
}

function waktuSekarang() {
    return formatWaktuLengkap(new Date());
}
