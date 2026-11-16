/* Shared request and download helpers for Admin pages. */
(function() {
    function apiUrl(path) {
        if (typeof window.apiUrl === 'function') return window.apiUrl(path);
        var base = (window.API_BASE || 'http://localhost:8000/backend-api').replace(/\/+$/, '');
        var cleanPath = String(path || '').replace(/^\/+/, '');
        return cleanPath ? base + '/' + cleanPath : base;
    }

    function parseError(text, status) {
        var payload = {};
        if (text) {
            try { payload = JSON.parse(text); } catch (error) { payload = {}; }
        }
        return new Error(window.apiResponseMessage(payload, 'Permintaan gagal (HTTP ' + status + ').'));
    }

    function getAuthToken() {
        return localStorage.getItem('token') || localStorage.getItem('siamag_token') || '';
    }

    function request(path, options, preserveEnvelope) {
        var token = getAuthToken();
        var defaultHeaders = { Accept: 'application/json' };
        if (token) {
            defaultHeaders['Authorization'] = 'Bearer ' + token;
        }
        var requestOptions = Object.assign({}, options || {});
        requestOptions.headers = Object.assign(defaultHeaders, requestOptions.headers || {});
        return fetch(apiUrl(path), requestOptions).then(function(response) {
            return response.text().then(function(text) {
                var payload = null;
                if (text) {
                    try {
                        payload = JSON.parse(text);
                    } catch (error) {
                        if (!response.ok) throw parseError(text, response.status);
                        throw new Error('Server mengembalikan respons yang tidak valid.');
                    }
                }
                if (!response.ok) throw parseError(text, response.status);
                if (payload && payload.success === false) {
                    throw new Error(window.apiResponseMessage(payload, 'Permintaan gagal.'));
                }
                return !preserveEnvelope && payload && payload.data !== undefined ? payload.data : payload;
            });
        });
    }

    function download(path, fallbackName) {
        var token = getAuthToken();
        var headers = { Accept: 'application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/json' };
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }
        return fetch(apiUrl(path), { headers: headers })
            .then(function(response) {
                if (!response.ok) {
                    return response.text().then(function(text) { throw parseError(text, response.status); });
                }
                var disposition = response.headers.get('Content-Disposition') || '';
                var filenameMatch = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
                var filename = filenameMatch
                    ? decodeURIComponent(filenameMatch[1] || filenameMatch[2])
                    : fallbackName;
                return response.blob().then(function(blob) {
                    var url = URL.createObjectURL(blob);
                    var link = document.createElement('a');
                    link.href = url;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
                });
            });
    }

    window.adminApi = {
        url: apiUrl,
        get: function(path) { return request(path); },
        getAll: function(path, keys) { return window.apiRequestAll(path, keys); },
        post: function(path, data) {
            return request(path, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }, true);
        },
        put: function(path, data) {
            return request(path, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }, true);
        },
        delete: function(path) { return request(path, { method: 'DELETE' }, true); },
        download: download
    };
})();
