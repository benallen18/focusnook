/**
 * Todoist API Proxy – Vercel Serverless Function
 * Catch-all: /api/todoist/* → https://api.todoist.com/rest/v2/*
 *
 * The browser sends the Todoist API token in X-Todoist-Token.
 * This function forwards it server-side as an Authorization header.
 */

const TODOIST_BASE = 'https://api.todoist.com/rest/v2';

export default async function handler(req, res) {
    const token = req.headers['x-todoist-token'];
    if (!token) {
        res.statusCode = 401;
        return res.end(JSON.stringify({ error: 'Missing Todoist token' }));
    }

    // req.query.path is the [...path] catch-all array, e.g. ['tasks'] or ['tasks', '123', 'close']
    const pathSegments = Array.isArray(req.query.path) ? req.query.path : [req.query.path];
    const upstreamPath = '/' + pathSegments.join('/');

    // Forward any other query params (excluding the internal 'path' param)
    const forwardParams = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
        if (key !== 'path') forwardParams.append(key, value);
    }
    const queryString = forwardParams.toString();
    const url = `${TODOIST_BASE}${upstreamPath}${queryString ? `?${queryString}` : ''}`;

    const fetchOptions = {
        method: req.method,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
        fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    try {
        const upstream = await fetch(url, fetchOptions);

        res.statusCode = upstream.status;

        if (upstream.status === 204) {
            return res.end();
        }

        const data = await upstream.json();
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify(data));
    } catch (err) {
        console.error('Todoist proxy error:', err);
        res.statusCode = 502;
        return res.end(JSON.stringify({ error: 'Failed to reach Todoist API' }));
    }
}
