$(document).ready(function() {

    // Toggle password
    window.togglePass = function() {
        var input = $('#password');
        var icon = $('#iconEye');
        
        if (input.attr('type') === 'password') {
            input.attr('type', 'text');
            icon.removeClass('fa-eye').addClass('fa-eye-slash');
        } else {
            input.attr('type', 'password');
            icon.removeClass('fa-eye-slash').addClass('fa-eye');
        }
    };

    // Submit form login
    $('#formLogin').on('submit', function(e) {
        e.preventDefault();
        
        var username = $.trim($('#username').val());
        var password = $.trim($('#password').val());

        // Validasi kosong
        if (username === '') {
            showError('Username tidak boleh kosong!');
            $('#username').focus();
            return;
        }
        if (password === '') {
            showError('Password tidak boleh kosong!');
            $('#password').focus();
            return;
        }

        // Loading state
        var btn = $('#btnLogin');
        btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-1"></i> Memproses...');

        // diganti AJAX ke PHP backend
        // $.ajax({
        //     url: 'api/auth/login.php',
        //     type: 'POST',
        //     data: { username: username, password: password },
        //     dataType: 'json',
        //     success: function(res) {
        //         if (res.status === 'success') {
        //             // redirect sesuai role
        //             window.location.href = res.redirect;
        //         } else {
        //             showError(res.message);
        //             resetBtn();
        //         }
        //     },
        //     error: function() {
        //         showError('Terjadi kesalahan. Coba lagi nanti.');
        //         resetBtn();
        //     }
        // });

        // Otentikasi akun demo (Admin, Pembimbing, Peserta Magang)
        setTimeout(function() {
            var accounts = {
                'admin':       { pass: 'admin123',       role: 'admin',          redirect: 'admin/dashboard.html' },
                'pembimbing':  { pass: 'pembimbing123',  role: 'pembimbing',     nama: window.masterPembimbing[4].nama, redirect: 'pembimbing/dashboard.html' },
                'peserta':     { pass: 'peserta123',     role: 'peserta_magang', nama: window.masterPeserta[0].nama, redirect: 'peserta/dashboard.html' }
            };

            var akun = accounts[username];

            if (akun && akun.pass === password) {
                // Inisialisasi sesi pengguna
                sessionStorage.setItem('user', JSON.stringify({
                    username: username,
                    role: akun.role,
                    nama: akun.nama || username.charAt(0).toUpperCase() + username.slice(1)
                }));

                Swal.fire({
                    icon: 'success',
                    title: 'Login Berhasil!',
                    text: 'Mengalihkan ke dashboard...',
                    timer: 1500,
                    showConfirmButton: false,
                    allowOutsideClick: false
                }).then(function() {
                    window.location.href = akun.redirect;
                });
            } else {
                showError('Username atau password salah!');
            }

            resetBtn();
        }, 1200);
        // END SIMULASI 
    });

    function showError(msg) {
        $('#alertError').removeClass('d-none');
        $('#alertMsg').text(msg);
    }

    function resetBtn() {
        $('#btnLogin').prop('disabled', false).html('<i class="fas fa-sign-in-alt me-1"></i> Masuk');
    }

    // Sembunyikan alert pas user ngetik lagi
    $('#username, #password').on('input', function() {
        $('#alertError').addClass('d-none');
    });

    // Quick demo role autofill
    $('.btn-quick-role').on('click', function() {
        var user = $(this).data('user');
        var pass = $(this).data('pass');
        $('#username').val(user);
        $('#password').val(pass);
        $('#alertError').addClass('d-none');
        $('#formLogin').submit();
    });

});
