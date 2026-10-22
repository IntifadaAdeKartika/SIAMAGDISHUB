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

    // NOTIFIKASI INTERAKTIF PER ROLE (Admin, Pembimbing, Peserta)
    var notifData = {
        'admin': [],
        'pembimbing': [],
        'peserta_magang': []
    };

    // Update badge count jika elemen notif-badge ada
    var currentRole = (user && user.role) ? user.role : 'admin';
    var myNotifs = notifData[currentRole] || notifData['admin'];
    var unreadCount = myNotifs.filter(n => n.unread).length;
    if ($('.notif-badge').length) {
        if (unreadCount > 0) {
            $('.notif-badge').text(unreadCount).show();
        } else {
            $('.notif-badge').hide();
        }
    }

    $('#btnNotif').on('click', function() {
        var itemsHtml = '';
        if (myNotifs.length === 0) {
            itemsHtml = '<div class="p-4 text-center text-muted small"><i class="fas fa-bell-slash mb-2 d-block fa-2x"></i>Tidak ada pemberitahuan baru</div>';
        } else {
            myNotifs.forEach(function(item) {
                itemsHtml += `
                    <div class="d-flex align-items-start p-2 border-bottom notif-item ${item.unread ? 'bg-light' : ''}" style="text-align: left; cursor: pointer;">
                        <div class="me-3 mt-1">
                            <i class="fas ${item.ikon} fa-lg"></i>
                        </div>
                        <div class="flex-grow-1">
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="fw-bold small text-dark">${item.judul}</span>
                                <span class="badge ${item.unread ? 'bg-primary' : 'bg-light text-muted'} rounded-pill" style="font-size: 0.65rem;">${item.waktu}</span>
                            </div>
                            <p class="mb-0 text-muted small" style="line-height: 1.3;">${item.pesan}</p>
                        </div>
                    </div>
                `;
            });
        }

        Swal.fire({
            title: '<div class="d-flex justify-content-between align-items-center w-100 px-2"><span>Pemberitahuan</span><button type="button" class="btn btn-sm btn-link text-decoration-none" id="btnMarkAllRead" style="font-size:0.8rem;">Tandai Dibaca</button></div>',
            html: '<div style="max-height: 320px; overflow-y: auto;">' + itemsHtml + '</div>',
            showConfirmButton: false,
            showCloseButton: true,
            width: '450px',
            didOpen: () => {
                $('#btnMarkAllRead').on('click', function() {
                    myNotifs.forEach(n => n.unread = false);
                    $('.notif-badge').fadeOut();
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
