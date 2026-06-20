// webhook-handler.js
const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 9001;

// Webhook secret
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your_webhook_secret_here';

// Path to your deployment script
const DEPLOY_SCRIPT = '/root/NexusCloudV2/deploy.sh';

app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}));

// Verify GitHub webhook signature
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

// Webhook endpoint
app.post('/webhook', (req, res) => {
    // Verify signature (for security)
    if (!verifySignature(req)) {
        return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const event = req.headers['x-github-event'];
    
    // Only process push events to main branch
    if (event === 'push') {
        const branch = req.body.ref.replace('refs/heads/', '');
        const repo = req.body.repository.name;
        
        console.log(`📥 Received push event for ${repo}/${branch}`);
        
        // Only deploy if pushing to main branch
        if (branch === 'main' || branch === 'master') {
            console.log('🚀 Triggering deployment...');
            
            // Execute deployment script
            exec(`bash ${DEPLOY_SCRIPT}`, (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ Deployment failed:', error);
                    console.error('stderr:', stderr);
                    return;
                }
                console.log('✅ Deployment output:', stdout);
                if (stderr) console.warn('⚠️ Warnings:', stderr);
            });
            
            res.json({ 
                status: 'deployment_started',
                message: 'Deployment script triggered successfully'
            });
        } else {
            res.json({ 
                status: 'ignored',
                message: `Push to ${branch} branch ignored`
            });
        }
    } else {
        res.json({ 
            status: 'ignored',
            message: `Event ${event} ignored`
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'webhook-handler' });
});

app.listen(PORT, () => {
    console.log(`🔗 Webhook handler running on port ${PORT}`);
    console.log(`📡 Webhook endpoint: http://localhost:${PORT}/webhook`);
});