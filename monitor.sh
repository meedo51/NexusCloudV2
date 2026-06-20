#!/bin/bash

# Monitor deployment status and send alerts

WEBHOOK_URL="your_discord_or_slack_webhook"

check_deployment_status() {
    if curl -s http://localhost:5000/api/health | grep -q '"status":"ok"'; then
        echo "✅ NexusCloud is running healthy"
        return 0
    else
        echo "❌ NexusCloud is down!"
        # Send alert
        curl -X POST "$WEBHOOK_URL" \
             -H "Content-Type: application/json" \
             -d '{"text": "🚨 NexusCloud deployment failed! Check logs."}'
        return 1
    fi
}

# Check every 5 minutes
while true; do
    check_deployment_status
    sleep 300
done