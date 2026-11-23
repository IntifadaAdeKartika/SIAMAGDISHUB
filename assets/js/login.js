// =====================================================================
//  SIAMAG – Login Handler
//  Fase 0: Integrasi autentikasi dengan Laravel backend API
// =====================================================================

/** Base URL API Laravel – diekspos global agar bisa dipakai file JS lain */
if (typeof window.API_BASE === 'undefined') {
    window.API_BASE = 'https://siamagdishub-backend.vercel.app/backend-api';
}

/** Peta redirect berdasarkan role yang dikembalikan API */
var ROLE_REDIRECT = {
    'admin':          'admin/dashboard.html',
    'pembimbing':     'pembimbing/dashboard.html',
    'peserta':        'peserta/dashboard.html',
    'peserta_magang': 'peserta/dashboard.html',
    'peserta magang': 'peserta/dashboard.html'
};

$(document).ready(function() {

    function readStoredUser() {
        try {
            return JSON.parse(localStorage.getItem('token') ? localStorage.getItem('user') : localStorage.getItem('siamag_user') || 'null');
        } catch (error) {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            localStorage.removeItem('siamag_user');
            localStorage.removeItem('siamag_token');
            return null;
        }
    }

    // Jika sudah login (token masih ada), langsung redirect sesuai role
    var existingToken = localStorage.getItem('token') || localStorage.getItem('siamag_token');
    var existingUser  = readStoredUser();
    if (existingToken && existingUser && ROLE_REDIRECT[String(existingUser.role || '').trim().toLowerCase()]) {
        window.location.href = ROLE_REDIRECT[String(existingUser.role).trim().toLowerCase()];
        return;
    }

    // ── Ingat saya: isi otomatis username jika pernah dicentang ──────
    var savedUsername = localStorage.getItem('siamag_remember_user');
    if (savedUsername) {
        $('#username').val(savedUsername);
        $('#rememberMe').prop('checked', true);
    }

    // ── Toggle visibilitas password ──────────────────────────────────
    window.togglePass = function() {
        var input = $('#password');
        var icon  = $('#iconEye');
        if (input.attr('type') === 'password') {
            input.attr('type', 'text');
            icon.removeClass('fa-eye').addClass('fa-eye-slash');
        } else {
            input.attr('type', 'password');
            icon.removeClass('fa-eye-slash').addClass('fa-eye');
        }
    };

    // ── Submit form login ────────────────────────────────────────────
    $('#formLogin').on('submit', function(e) {
        e.preventDefault();

        var username = $.trim($('#username').val());
        var password = $('#password').val();

        // Validasi input kosong
        if (username === '') {
            showError('Username tidak boleh kosong!');
            $('#username').focus();
            return;
        }
        if ($.trim(password) === '') {
            showError('Password tidak boleh kosong!');
            $('#password').focus();
            return;
        }

        // Tampilkan loading state pada tombol
        var btn = $('#btnLogin');
        btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-1"></i> Memproses...');
        $('#alertError').addClass('d-none');

        // ── Panggil API Login ──────────────────────────────────────
        fetch(window.API_BASE.replace(/\/$/, '') + '/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept':       'application/json'
            },
            body: JSON.stringify({ username: username, password: password })
        })
        .then(function(res) {
            return res.text().then(function(body) {
                var data = {};
                if (body) {
                    try {
                        data = JSON.parse(body);
                    } catch (error) {
                        data = {};
                    }
                }
                return { response: res, data: data };
            });
        })
        .then(function(result) {
            var response = result.response;
            var payload = result.data;
            var data = payload.data && typeof payload.data === 'object'
                ? payload.data
                : payload;

            if (response.ok && typeof data.token === 'string' && data.token &&
                data.user && typeof data.user === 'object' &&
                ROLE_REDIRECT[String(data.user.role || '').trim().toLowerCase()]) {
                // ── Simpan token & user ke localStorage ───────────
                try {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('siamag_token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    localStorage.setItem('siamag_user', JSON.stringify(data.user));

                    // Ingat saya: simpan atau hapus username
                    if ($('#rememberMe').is(':checked')) {
                        localStorage.setItem('siamag_remember_user', username);
                    } else {
                        localStorage.removeItem('siamag_remember_user');
                    }
                } catch (error) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('siamag_token');
                    localStorage.removeItem('siamag_user');
                    showError('Browser tidak dapat menyimpan sesi login. Periksa pengaturan penyimpanan.');
                    resetBtn();
                    return;
                }

                var redirectUrl = ROLE_REDIRECT[String(data.user.role).trim().toLowerCase()];

                Swal.fire({
                    icon:              'success',
                    title:             'Login Berhasil!',
                    text:              'Mengalihkan ke dashboard...',
                    timer:             1500,
                    showConfirmButton: false,
                    allowOutsideClick: false
                }).then(function() {
                    window.location.href = redirectUrl;
                });

            } else if (response.status === 401 || response.status === 422) {
                // Kredensial salah atau validasi gagal
                showError(payload.message || data.message || 'Username atau password salah!');
                resetBtn();
            } else if (response.ok) {
                showError('Respons login tidak memuat token, data pengguna, atau role yang valid.');
                resetBtn();
            } else {
                // Respons tidak terduga dari server
                showError(payload.message || 'Terjadi kesalahan pada server (HTTP ' +
                    response.status + '). Coba lagi nanti.');
                resetBtn();
            }
        })
        .catch(function() {
            // Koneksi gagal / server mati / CORS error
            showError('Tidak dapat terhubung ke server. Pastikan backend sudah berjalan.');
            resetBtn();
        });
    });

    // ── Helper: tampilkan pesan error ───────────────────────────────
    function showError(msg) {
        $('#alertError').removeClass('d-none');
        $('#alertMsg').text(msg);
    }

    // ── Helper: reset tombol login ──────────────────────────────────
    function resetBtn() {
        $('#btnLogin').prop('disabled', false).html('<i class="fas fa-sign-in-alt me-1"></i> Masuk');
    }

    // Sembunyikan alert saat user mulai mengetik kembali
    $('#username, #password').on('input', function() {
        $('#alertError').addClass('d-none');
    });

    // ── Quick-fill tombol demo role (hapus di production jika perlu) ─
    $('.btn-quick-role').on('click', function() {
        var user = $(this).data('user');
        var pass = $(this).data('pass');
        $('#username').val(user);
        $('#password').val(pass);
        $('#alertError').addClass('d-none');
        $('#formLogin').submit();
    });

});
