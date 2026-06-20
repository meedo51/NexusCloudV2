// /root/NexusCloudV2/simple-webhook.js
const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');
const app = express();
const PORT = 9001;

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your_webhook_secret_here';
const DEPLOY_SCRIPT = '/root/NexusCloudV2/deploy.sh';

app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}));

// Verify GitHub signature
function verifySignature(req) {
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) return false;
    
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(digest)
    );
}

app.post('/webhook', (req, res) => {
    if (!verifySignature(req)) {
        return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const event = req.headers['x-github-event'];
    
    if (event === 'push') {
        const branch = req.body.ref.replace('refs/heads/', '');
        
        if (branch === 'main' || branch === 'master') {
            console.log('🚀 Triggering deployment...');
            
            exec(`bash ${DEPLOY_SCRIPT}`, (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ Deployment failed:', error);
                    return;
                }
                console.log('✅ Deployment output:', stdout);
            });
            
            res.json({ status: 'deployment_started' });
        } else {
            res.json({ status: 'ignored', branch });
        }
    } else {
        res.json({ status: 'ignored', event });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`🔗 Webhook running on port ${PORT}`);
});