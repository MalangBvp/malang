export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { longURL, postfix } = req.body; // <- req.body must exist
        if (!longURL || !postfix) {
            return res.status(400).json({ success: false, error: 'Missing longURL or postfix' });
        }

        const owner = 'MalangBvp';
        const repo = 'redirector';
        const path = 'r/redirects.json';
        const token = process.env.PERSONAL_PAT; // securely stored

        // 1. Fetch current file to get its content and SHA
        const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!getRes.ok) {
            const text = await getRes.text();
            return res.status(getRes.status).json({ success: false, error: 'Failed to fetch current redirects: ' + text });
        }

        const fileData = await getRes.json();
        const sha = fileData.sha;
        
        // Decode base64 content
        const currentContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
        let redirects = {};
        try {
            redirects = JSON.parse(currentContent);
        } catch (e) {
            return res.status(500).json({ success: false, error: 'Failed to parse current redirects' });
        }

        // 2. Check if postfix already exists
        if (redirects.hasOwnProperty(postfix)) {
            return res.status(409).json({ success: false, error: `The slug '${postfix}' already exists. Please choose a different one.` });
        }

        // 3. Add the new redirect at the top
        redirects = {
            [postfix]: longURL,
            ...redirects
        };

        // 3. Encode the updated content back to base64
        const newContent = Buffer.from(JSON.stringify(redirects, null, 2), 'utf-8').toString('base64');

        // 4. Update the file directly in the repository
        const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Add redirect for ${postfix}`,
                content: newContent,
                sha: sha
            })
        });

        if (putRes.ok) {
            return res.status(200).json({ success: true, message: 'Redirect added successfully' });
        } else {
            const text = await putRes.text();
            return res.status(putRes.status).json({ success: false, error: 'Failed to update redirects file: ' + text });
        }
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}
