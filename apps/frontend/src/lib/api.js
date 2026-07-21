/**
 * Thin fetch wrapper that understands this backend's error convention.
 *
 * The API returns business-rule failures as HTTP 200 with an { error } body
 * (84 such returns in router.py), so `if (response.ok)` alone reports those as
 * success. Every call here treats BOTH a non-2xx status AND an `error` key as a
 * failure, and throws — so callers cannot accidentally swallow one.
 *
 *   try {
 *     const data = await apiSend(`${apiUrl}/admin/employee/${id}`, 'PATCH', body);
 *     toast.success(data.message || 'Saved');
 *   } catch (err) {
 *     toast.error(err.message);
 *   }
 */

async function parse(res) {
    const text = await res.text();
    if (!text) return {};
    try { return JSON.parse(text); } catch { return { _raw: text }; }
}

export async function apiSend(url, method, body) {
    let res;
    try {
        res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
    } catch {
        throw new Error('Could not reach the server. Check your connection and try again.');
    }

    const data = await parse(res);

    if (!res.ok) {
        throw new Error(data.error || data.detail || `Request failed (${res.status})`);
    }
    // The 200-with-error case this codebase relies on
    if (data && data.error) {
        throw new Error(data.error);
    }
    return data;
}

export async function apiGet(url) {
    return apiSend(url, 'GET');
}

export default apiSend;
