/* app.js - Shared utilities and dashboard handlers
   Handles sidebar navigation, session validation, user profile, and notifications
 */

// ── Konstanta Global ────────────────────────────────────────────────────────
/** Base URL API Laravel – tersedia global untuk semua file JS halaman */
if (typeof window.API_BASE === 'undefined') {
    window.API_BASE = 'https://siamagdishub-backend.vercel.app/backend-api';
}

function buildApiUrl(path) {
    if (!path) return (window.API_BASE || 'https://siamagdishub-backend.vercel.app/backend-api').replace(/\/+$/, '');

    // Jika path berupa URL lengkap (http...)
    if (/^https?:\/\//i.test(path)) {
        // PERBAIKAN: Paksa ganti http:// menjadi https:// (kecuali localhost)
        if (path.startsWith('http://') && !path.includes('localhost')) {
            path = path.replace('http://', 'https://');
        }

        if (path.includes('localhost:8000') && !path.includes('/backend-api')) {
            return path.replace('localhost:8000', 'localhost:8000/backend-api');
        }
        // Jika URL sudah mengandung /backend-api, jangan diapa-apakan
        return path;
    }

    var base = (window.API_BASE || 'https://siamagdishub-backend.vercel.app/backend-api').replace(/\/+$/, '');

    // Bersihkan path dari garis miring di depan
    var cleanPath = String(path).replace(/^\/+/, '');

    // PENCEGAH DOBEL: Jika path yang dikirim sudah ada 'backend-api/', hapus tulisan itu
    if (cleanPath.startsWith('backend-api/')) {
        cleanPath = cleanPath.replace('backend-api/', '');
    }

    return base + '/' + cleanPath;
}
window.apiUrl = buildApiUrl;

function isApiRequest(url) {
    try {
        var requestUrl = new URL(url, window.location.href);
        var apiUrl = new URL(window.API_BASE);
        var apiPath = apiUrl.pathname.replace(/\/$/, '');
        return requestUrl.origin === apiUrl.origin &&
            (requestUrl.pathname === apiPath || requestUrl.pathname.indexOf(apiPath + '/') === 0);
    } catch (e) {
        return false;
    }
}

function getAuthToken() {
    return localStorage.getItem('token') || localStorage.getItem('siamag_token') || '';
}

function clearAuthSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('siamag_token');
    localStorage.removeItem('siamag_user');
}

function loginPageUrl() {
    return /\/(admin|pembimbing|peserta)\//.test(window.location.pathname)
        ? '../login.html'
        : 'login.html';
}

function handleUnauthorized() {
    clearAuthSession();
    window.location.href = loginPageUrl();
}

window.apiResponseData = function(payload) {
    return payload && typeof payload === 'object' && payload.data !== undefined
        ? payload.data
        : payload;
};

window.apiResponseMessage = function(payload, fallback) {
    var current = payload;
    for (var depth = 0; depth < 4 && current && typeof current === 'object'; depth++) {
        if (current.errors && typeof current.errors === 'object') {
            var validation = Object.keys(current.errors).map(function(key) {
                var value = current.errors[key];
                return Array.isArray(value) ? value[0] : value;
            }).filter(function(value) {
                return typeof value === 'string' && value.trim();
            })[0];
            if (validation) return validation;
        }
        if (typeof current.message === 'string' && current.message.trim()) return current.message;
        current = current.data;
    }
    return fallback || 'Permintaan gagal.';
};

window.setUserTopbar = function(user, role) {
    user = user || {};
    var normalizedRole = normalizeRole(role || (user && user.role));
    var pembimbing = user && (
        user.pembimbing ||
        user.profil_pembimbing ||
        (user.profile && (user.profile.pembimbing || user.profile))
    ) || {};
    var pembimbingAccount = pembimbing.pengguna || {};
    var profile = user && (user.peserta_magang || user.peserta || user.profile) || {};
    var displayName = normalizedRole === 'pembimbing'
        ? (user.nama_lengkap || pembimbing.nama_lengkap || pembimbingAccount.nama_lengkap || 'Pengguna')
        : (user.nama_lengkap || profile.nama_lengkap || user.nama || profile.nama || user.name || profile.name || 'Pengguna');
    var subtitle = normalizedRole === 'pembimbing'
        ? (pembimbing.jabatan || 'Pembimbing Lapangan')
        : formatRole(normalizedRole);

    $('#userName').text(displayName);
    $('#userRole').text(subtitle);
    $('#userInitial').text(String(displayName).trim().charAt(0).toUpperCase() ||
        (normalizedRole === 'peserta_magang' ? 'P' : 'U'));
};

window.apiFormatDateTime = function(value) {
    var raw = String(value || '');
    if (!raw) return { date: '-', dateLabel: '-', time: '-', full: '-' };

    var date = new Date(raw);
    if (isNaN(date.getTime())) {
        var fallbackDate = raw.slice(0, 10) || '-';
        var fallbackTime = raw.replace('T', ' ').slice(11, 19) || '-';
        return {
            date: fallbackDate,
            dateLabel: fallbackDate,
            time: fallbackTime,
            full: raw.replace('T', ' ').slice(0, 19)
        };
    }

    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    var dateLabel = date.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    var time = date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    return {
        date: year + '-' + month + '-' + day,
        dateLabel: dateLabel,
        time: time,
        full: dateLabel + ' ' + time
    };
};

window.apiRequest = function(path, options) {
    var requestOptions = Object.assign({}, options || {});
    requestOptions.headers = new Headers(requestOptions.headers || {});
    if (!requestOptions.headers.has('Accept')) {
        requestOptions.headers.set('Accept', 'application/json');
    }
    var token = getAuthToken();
    if (token && !requestOptions.headers.has('Authorization')) {
        requestOptions.headers.set('Authorization', 'Bearer ' + token);
    }
    return fetch(buildApiUrl(path), requestOptions)
        .then(function(response) {
            return response.text().then(function(text) {
                var payload = null;
                if (text) {
                    try {
                        payload = JSON.parse(text);
                    } catch (error) {
                        if (!response.ok) throw new Error('Permintaan gagal (HTTP ' + response.status + ').');
                        throw new Error('Server mengembalikan respons yang tidak valid.');
                    }
                }
                if (!response.ok) {
                    throw new Error(window.apiResponseMessage(payload, 'Permintaan gagal (HTTP ' + response.status + ').'));
                }
                if (payload && payload.success === false) {
                    throw new Error(window.apiResponseMessage(payload, 'Permintaan gagal.'));
                }
                return payload;
            });
        });
};

window.apiList = function(payload, keys) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;

    var current = payload;
    var searchKeys = Array.isArray(keys) ? keys.slice() : [];
    ['data', 'items', 'rows', 'list', 'result', 'results'].forEach(function(k) {
        if (searchKeys.indexOf(k) === -1) searchKeys.push(k);
    });

    for (var depth = 0; depth < 5; depth++) {
        if (Array.isArray(current)) return current;
        if (!current || typeof current !== 'object') break;

        var next;
        for (var index = 0; index < searchKeys.length; index++) {
            var k = searchKeys[index];
            if (current[k] !== undefined) {
                if (current[k] === null) return [];
                if (Array.isArray(current[k])) return current[k];
                next = current[k];
                break;
            }
        }
        if (next === undefined) {
            if (current.id || current.tanggal_jam || current.tanggal) {
                return [current];
            }
            break;
        }
        current = next;
    }
    if (Array.isArray(current)) return current;
    return (current && typeof current === 'object' && (current.id || current.tanggal_jam || current.tanggal))
        ? [current]
        : [];
};

window.apiRequestAll = function(path, keys) {
    var rows = [];
    var visited = Object.create(null);
    var listKeys = Array.isArray(keys) ? keys : [];
    var initialUrl = /^https?:\/\//i.test(String(path || ''))
        ? String(path)
        : window.apiUrl(path);

    function findPage(payload) {
        var current = payload;
        for (var depth = 0; depth < 8; depth++) {
            if (Array.isArray(current)) return { rows: current, metadata: null };
            if (!current || typeof current !== 'object') break;

            for (var index = 0; index < listKeys.length; index++) {
                var key = listKeys[index];
                if (Array.isArray(current[key])) return { rows: current[key], metadata: current };
            }
            if (Array.isArray(current.data)) return { rows: current.data, metadata: current };
            if (current.data === null) return { rows: [], metadata: current };

            var next = undefined;
            for (var nestedIndex = 0; nestedIndex < listKeys.length; nestedIndex++) {
                var nested = current[listKeys[nestedIndex]];
                if (nested && typeof nested === 'object') {
                    next = nested;
                    break;
                }
            }
            if (next === undefined && current.data && typeof current.data === 'object') {
                next = current.data;
            }
            if (next === undefined) break;
            current = next;
        }
        throw new Error('Format data daftar dari server tidak valid.');
    }

    function requestPage(url) {
        if (visited[url]) throw new Error('Paginasi API mengulang halaman yang sama.');
        visited[url] = true;
        return window.apiRequest(url).then(function(payload) {
            var page = findPage(payload);
            rows = rows.concat(page.rows);

            var metadata = page.metadata || {};
            var nestedMetadata = metadata.meta && typeof metadata.meta === 'object' ? metadata.meta : metadata;
            if (nestedMetadata.next_page_url) {
                // Paksa ubah http:// menjadi https:// pada URL paginasi
                var safeNextUrl = nestedMetadata.next_page_url.replace(/^http:\/\//i, 'https://');
                return requestPage(new URL(safeNextUrl, url).href);
            }
            var currentPage = Number(nestedMetadata.current_page);
            var lastPage = Number(nestedMetadata.last_page);
            if (currentPage && lastPage && currentPage < lastPage) {
                var nextUrl = new URL(url, window.location.href);
                nextUrl.searchParams.set('page', String(currentPage + 1));
                return requestPage(nextUrl.href);
            }
            return rows;
        });
    }

    return requestPage(initialUrl);
};

window.apiSetTableState = function(table, state) {
    if (!table || typeof table.settings !== 'function') return;
    var settings = table.settings()[0];
    if (!settings || !settings.oLanguage) return;
    settings.oLanguage.sEmptyTable = state === 'loading'
        ? 'Memuat data...'
        : state === 'error'
            ? 'Data gagal dimuat. Silakan coba muat ulang.'
            : 'Belum ada data.';
    table.draw(false);
};

function normalizeRole(role) {
    var normalized = String(role || '').trim().toLowerCase();
    return normalized === 'peserta' || normalized === 'peserta magang' || normalized === 'peserta_magang'
        ? 'peserta_magang'
        : normalized;
}

if (typeof window.fetch === 'function') {
    var nativeFetch = window.fetch.bind(window);
    window.fetch = function(input, init) {
        var requestUrl = typeof input === 'string' || input instanceof URL ? input : input.url;
        if (!isApiRequest(requestUrl)) {
            return nativeFetch(input, init);
        }

        var options = Object.assign({}, init || {});
        var requestHeaders = typeof Request !== 'undefined' && input instanceof Request
            ? input.headers
            : undefined;
        var headers = new Headers(requestHeaders);
        new Headers(options.headers || {}).forEach(function(value, name) {
            headers.set(name, value);
        });
        var token = getAuthToken();
        if (token) {
            headers.set('Authorization', 'Bearer ' + token);
        }
        headers.set('Accept', 'application/json');
        options.headers = headers;

        return nativeFetch(input, options).then(function(response) {
            if (response.status === 401 && token) {
                handleUnauthorized();
            }
            return response;
        });
    };
}

$(document).ready(function() {

    function resetModalDetailScroll(event) {
        event.target.querySelectorAll('.modal-detail-wrapper').forEach(function(wrapper) {
            wrapper.scrollLeft = 0;
        });
    }

    document.addEventListener('show.bs.modal', resetModalDetailScroll);
    document.addEventListener('shown.bs.modal', resetModalDetailScroll);

    // ── Ambil token & user dari localStorage ────────────────────────
    var token = getAuthToken();
    var user;
    try {
        user = JSON.parse(localStorage.getItem('user') || localStorage.getItem('siamag_user') || 'null');
    } catch (error) {
        clearAuthSession();
        user = null;
    }

    // ── Route Guard: redirect ke login jika belum autentikasi ───────
    var normalizedUserRole = user && normalizeRole(user.role);
    if (!token || !user || typeof user !== 'object' ||
        !['admin', 'pembimbing', 'peserta_magang'].includes(normalizedUserRole)) {
        clearAuthSession();
        window.location.href = loginPageUrl();
        return; // hentikan eksekusi selanjutnya
    }

    // ── Tampilkan info pengguna di topbar ───────────────────────────
    window.setUserTopbar(user, normalizedUserRole);

    // ── Global jQuery AJAX Setup: inject Bearer token ───────────────
    $.ajaxPrefilter(function(options, originalOptions, xhr) {
        if (isApiRequest(options.url)) {
            var currentToken = localStorage.getItem('siamag_token');
            if (currentToken) {
                xhr.setRequestHeader('Authorization', 'Bearer ' + currentToken);
            }
            xhr.setRequestHeader('Accept', 'application/json');
        }
    });

    // ── Global handler: 401 Unauthorized → auto logout ──────────────
    $(document).ajaxError(function(event, xhr, settings) {
        if (xhr.status === 401 && isApiRequest(settings.url)) {
            handleUnauthorized();
        }
    });

    // Tambahkan tombol tutup sidebar mobile jika belum ada
    if ($('#sidebar .sidebar-header').length && !$('#btnCloseSidebar').length) {
        $('#sidebar .sidebar-header').append(
            '<button type="button" class="btn-sidebar-close" id="btnCloseSidebar" aria-label="Tutup Menu">' +
            '<i class="fas fa-times"></i>' +
            '</button>'
        );
    }

    // Toggle sidebar pada tampilan mobile
    $('#btnToggleSidebar').on('click', function(e) {
        e.stopPropagation();
        $('#sidebar').toggleClass('show');
        $('#sidebarOverlay').toggleClass('show');
    });

    // Tutup sidebar saat klik tombol close atau overlay
    $(document).on('click', '#btnCloseSidebar, #sidebarOverlay', function() {
        $('#sidebar').removeClass('show');
        $('#sidebarOverlay').removeClass('show');
    });

    // Tutup sidebar saat klik menu item pada tampilan mobile
    $('.sidebar-menu a').on('click', function() {
        if ($(window).width() <= 992) {
            $('#sidebar').removeClass('show');
            $('#sidebarOverlay').removeClass('show');
        }
    });

    // Tutup sidebar jika tekan ESC
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape' && $('#sidebar').hasClass('show')) {
            $('#sidebar').removeClass('show');
            $('#sidebarOverlay').removeClass('show');
        }
    });

    // ── Handler logout pengguna ─────────────────────────────────────
    $('#btnLogout, .btn-logout').on('click', function(e) {
        e.preventDefault();

        Swal.fire({
            title:              'Logout?',
            text:               'Apakah Anda yakin ingin keluar dari sistem?',
            icon:               'question',
            showCancelButton:   true,
            confirmButtonColor: '#2563eb',
            cancelButtonColor:  '#6c757d',
            confirmButtonText:  'Ya, Logout',
            cancelButtonText:   'Batal'
        }).then(function(result) {
            if (result.isConfirmed) {
                // Hapus token & data user dari localStorage
                clearAuthSession();
                window.location.href = loginPageUrl();
            }
        });
    });

    // ACTIVE MENU
    // Tandai menu sidebar yang aktif berdasarkan halaman sekarang
    var currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    $('.sidebar-menu a').removeClass('active');
    $('.sidebar-menu a').each(function() {
        var href = $(this).attr('href');
        if (href && (href === currentPage || href.indexOf(currentPage) !== -1)) {
            $(this).addClass('active');
        }
    });

    var notificationIcons = {
        info: { icon: 'fa-info-circle', color: 'text-info' },
        warning: { icon: 'fa-exclamation-triangle', color: 'text-warning' },
        success: { icon: 'fa-check-circle', color: 'text-success' },
        danger: { icon: 'fa-exclamation-circle', color: 'text-danger' }
    };
    var myNotifs = [];

    function notificationIsRead(value) {
        return value === true || value === 1 ||
            (typeof value === 'string' && ['1', 'true'].indexOf(value.toLowerCase()) !== -1);
    }

    function normalizeNotification(item) {
        var type = String(item.tipe || 'info').toLowerCase();
        return {
            id: item.id,
            tipe: notificationIcons[type] ? type : 'info',
            judul: item.judul || 'Pemberitahuan',
            pesan: item.pesan || '',
            waktu: window.apiFormatDateTime(item.dibuat_pada || item.created_at || item.waktu).full,
            link: item.link || '',
            sudah_dibaca: notificationIsRead(item.sudah_dibaca)
        };
    }

    function updateNotificationBadge() {
        var unreadCount = myNotifs.filter(function(item) { return !item.sudah_dibaca; }).length;
        if (unreadCount > 0) {
            $('.notif-badge').text(unreadCount).show();
        } else {
            $('.notif-badge').text('').hide();
        }
    }

    function loadNotifications() {
        return window.apiRequest('/notifikasi', { method: 'GET' }).then(function(payload) {
            myNotifs = window.apiList(payload, ['notifikasi', 'notifications'])
                .filter(function(item) { return item && typeof item === 'object'; })
                .map(normalizeNotification);
            updateNotificationBadge();
            return myNotifs;
        });
    }

    function escapeNotificationText(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    function safeNotificationLink(link) {
        var raw = String(link || '').trim();
        if (!raw) return '';
        // Backend mengirim tautan absolut (mis. /peserta/logbook.html).
        // Saat aplikasi di-host di subfolder,arahkan ke subfolder aplikasi.
        if (/^\/(admin|pembimbing|peserta)\//.test(raw) &&
            window.location.pathname.indexOf(raw.split('/').slice(0, 2).join('/') + '/') !== 0) {
            var appBase = window.location.pathname.replace(/\/(admin|pembimbing|peserta)(\/[^/]*)?$/, '/');
            raw = appBase + raw.replace(/^\//, '');
        }
        try {
            var url = new URL(raw, window.location.href);
            return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
        } catch (error) {
            return '';
        }
    }

    function openNotifications() {
        var itemsHtml = myNotifs.length === 0
            ? '<div class="p-4 text-center text-muted small"><i class="fas fa-bell-slash mb-2 d-block fa-2x"></i>Tidak ada pemberitahuan</div>'
            : myNotifs.map(function(item) {
                var typeStyle = notificationIcons[item.tipe];
                return `
                    <button type="button" data-notification-id="${escapeNotificationText(item.id)}" class="w-100 d-flex align-items-start p-2 border-bottom notif-item text-start ${item.sudah_dibaca ? '' : 'bg-light'}" style="border-top:0;border-left:0;border-right:0;">
                        <div class="me-3 mt-1 ${typeStyle.color}"><i class="fas ${typeStyle.icon} fa-lg"></i></div>
                        <div class="flex-grow-1">
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="fw-bold small text-dark">${escapeNotificationText(item.judul)}</span>
                                ${item.sudah_dibaca ? '' : '<span class="badge bg-danger rounded-pill" style="font-size:0.65rem;">Baru</span>'}
                            </div>
                            <p class="mb-1 text-muted small" style="line-height:1.3;">${escapeNotificationText(item.pesan)}</p>
                            <span class="text-muted" style="font-size:0.7rem;">${escapeNotificationText(item.waktu)}</span>
                        </div>
                    </button>
                `;
            }).join('');

        Swal.fire({
            title: '<div class="d-flex justify-content-between align-items-center w-100 px-2"><span>Pemberitahuan</span><button type="button" class="btn btn-sm btn-link text-decoration-none" id="btnMarkAllRead">Tandai Semua Dibaca</button></div>',
            html: '<div style="max-height:320px;overflow-y:auto;">' + itemsHtml + '</div>',
            showConfirmButton: false,
            showCloseButton: true,
            width: $(window).width() < 500 ? '92%' : '450px',
            didOpen: function() {
                $('.notif-item').on('click', function() {
                    var notificationId = $(this).attr('data-notification-id');
                    var item = myNotifs.find(function(notification) {
                        return String(notification.id) === String(notificationId);
                    });
                    if (!item || item.id == null) return;

                    $(this).prop('disabled', true);
                    window.apiRequest('/notifikasi/' + encodeURIComponent(item.id) + '/read', {
                        method: 'PUT'
                    }).then(function() {
                        item.sudah_dibaca = true;
                        updateNotificationBadge();
                        var link = safeNotificationLink(item.link);
                        Swal.close();
                        if (link) window.location.href = link;
                    }).catch(function(error) {
                        Swal.fire('Notifikasi Gagal Diperbarui', error.message, 'error');
                    });
                });

                $('#btnMarkAllRead').on('click', function() {
                    $(this).prop('disabled', true);
                    window.apiRequest('/notifikasi/read-all', { method: 'PUT' })
                        .then(loadNotifications)
                        .then(openNotifications)
                        .catch(function(error) {
                            Swal.fire('Notifikasi Gagal Diperbarui', error.message, 'error');
                        });
                });
            }
        });
    }

    if ($('#btnNotif').length) {
        loadNotifications().catch(function(error) {
            console.error('Gagal memuat notifikasi:', error);
        });
        $('#btnNotif').on('click', function() {
            loadNotifications().then(openNotifications).catch(function(error) {
                Swal.fire('Notifikasi Gagal Dimuat', error.message, 'error');
            });
        });
    }

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

// ── Global Helper Buka Foto Data URI di Tab Baru ──────────────────────────────
window.openImageInNewTab = function(url, title) {
    if (!url) return;
    if (/^data:image\//i.test(url)) {
        try {
            var arr = url.split(',');
            var mimeMatch = arr[0].match(/:(.*?);/);
            var mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            var bstr = atob(arr[1]);
            var n = bstr.length;
            var u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            var blob = new Blob([u8arr], { type: mime });
            var blobUrl = URL.createObjectURL(blob);
            var newWin = window.open(blobUrl, '_blank');
            if (!newWin) {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: title || 'Foto Dokumentasi',
                        imageUrl: url,
                        imageAlt: 'Foto Dokumentasi',
                        confirmButtonText: 'Tutup',
                        confirmButtonColor: '#334EAC'
                    });
                }
            }
        } catch (err) {
            var win = window.open('');
            if (win) {
                win.document.write('<!DOCTYPE html><html><head><title>' + (title || 'Foto') + '</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{margin:0;background:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;}img{max-width:95%;max-height:95vh;border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,0.5);}</style></head><body><img src="' + url + '" alt="Foto"></body></html>');
                win.document.close();
            }
        }
    } else {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
};

// Handler pembukaan foto: pastikan hanya terdaftar satu kali.
$(document)
    .off('click', '.link-lihat-foto, a[href^="data:image/"]')
    .on('click', '.link-lihat-foto, a[href^="data:image/"]', function(e) {
        var href = $(this).attr('href');

        if (!href || href === '#') return;

        // Cegah browser membuka target="_blank" secara bersamaan.
        e.preventDefault();
        e.stopPropagation();

        window.openImageInNewTab(
            href,
            $(this).text().trim() || 'Foto Kegiatan'
        );
    });
