# 🤖 Cursor Agent Auto-Deploy Commands

## Quick Start Commands

### Install and Setup
```bash
# Install dependencies
pip install -r cursor_agent_requirements.txt

# Make script executable
chmod +x cursor_agent_deploy.py

# Test installation
python cursor_agent_deploy.py --help
```

### Basic Usage
```bash
# Start auto-watch mode (recommended)
python cursor_agent_deploy.py --mode watch

# Run single deployment
python cursor_agent_deploy.py --mode deploy

# Run tests only
python cursor_agent_deploy.py --mode test

# Run AI analysis only
python cursor_agent_deploy.py --mode analyze
```

## Advanced Commands

### Custom Project Root
```bash
python cursor_agent_deploy.py --mode watch --project-root /path/to/your/project
```

### Development Mode
```bash
# Run with debug output
PYTHONPATH=. python -u cursor_agent_deploy.py --mode watch

# Run with specific log level
LOG_LEVEL=DEBUG python cursor_agent_deploy.py --mode deploy
```

### Integration with Cursor

#### In Cursor Terminal
```bash
# Start the agent in background
nohup python cursor_agent_deploy.py --mode watch > cursor_agent.log 2>&1 &

# Check status
ps aux | grep cursor_agent_deploy

# Stop the agent
pkill -f cursor_agent_deploy
```

#### In Cursor Tasks
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Cursor Agent Deploy",
      "type": "shell",
      "command": "python",
      "args": ["cursor_agent_deploy.py", "--mode", "watch"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "new"
      },
      "isBackground": true,
      "problemMatcher": []
    },
    {
      "label": "Run Single Deployment",
      "type": "shell",
      "command": "python",
      "args": ["cursor_agent_deploy.py", "--mode", "deploy"],
      "group": "build"
    },
    {
      "label": "Run Tests Only",
      "type": "shell",
      "command": "python",
      "args": ["cursor_agent_deploy.py", "--mode", "test"],
      "group": "test"
    },
    {
      "label": "AI Analysis",
      "type": "shell",
      "command": "python",
      "args": ["cursor_agent_deploy.py", "--mode", "analyze"],
      "group": "test"
    }
  ]
}
```

## Package.json Integration

```json
{
  "name": "tagix",
  "version": "1.0.0",
  "description": "Cursor Agent Auto-Deploy Pipeline for Tagix",
  "scripts": {
    "cursor-agent:start": "python cursor_agent_deploy.py --mode watch",
    "cursor-agent:deploy": "python cursor_agent_deploy.py --mode deploy",
    "cursor-agent:test": "python cursor_agent_deploy.py --mode test",
    "cursor-agent:analyze": "python cursor_agent_deploy.py --mode analyze",
    "cursor-agent:install": "pip install -r cursor_agent_requirements.txt",
    "cursor-agent:status": "ps aux | grep cursor_agent_deploy",
    "cursor-agent:stop": "pkill -f cursor_agent_deploy",
    "cursor-agent:logs": "tail -f cursor_agent_deploy.log"
  },
  "dependencies": {
    "ws": "^8.18.3"
  }
}
```

## Environment Variables

```bash
# Set in your shell or .env file
export CURSOR_AGENT_PROJECT_ROOT="/home/i1/git/tagix"
export CURSOR_AGENT_LOG_LEVEL="INFO"
export CURSOR_AGENT_COOLDOWN="30"
export CURSOR_AGENT_AUTO_COMMIT="true"
export CURSOR_AGENT_AUTO_PUSH="true"
```

## Cursor AI Integration

### Automatic Analysis
The agent automatically provides AI analysis after each deployment:

1. **Success Rating**: 🟢 Excellent, 🟡 Good, 🟠 Fair, 🔴 Poor
2. **Key Observations**: What changed and what's working
3. **Recommendations**: Specific suggestions for improvement
4. **Next Steps**: Prioritized action items

### AI Feedback Files
- `cursor_ai_analysis.json` - Raw analysis data
- `cursor_ai_feedback.md` - Human-readable feedback report
- `cursor_deployment_history.json` - Historical deployment data

### Real-time Notifications
- `.cursor_deploy_complete` - Completion notification file
- `cursor_agent_deploy.log` - Detailed deployment logs

## Troubleshooting

### Common Issues

#### 1. Permission Errors
```bash
# Fix script permissions
chmod +x cursor_agent_deploy.py

# Fix directory permissions
chmod -R 755 /home/i1/git/tagix
```

#### 2. Python Dependencies
```bash
# Install missing dependencies
pip install -r cursor_agent_requirements.txt

# Check Python version
python --version  # Should be 3.8+
```

#### 3. File Watcher Issues
```bash
# Check if watchdog is installed
pip install watchdog

# Check file permissions
ls -la cursor_agent_deploy.py
```

#### 4. Git Issues
```bash
# Check git status
git status

# Check remote configuration
git remote -v

# Test git push
git push origin main
```

### Debug Mode
```bash
# Run with verbose output
python -u cursor_agent_deploy.py --mode deploy 2>&1 | tee debug.log

# Check log files
tail -f cursor_agent_deploy.log
tail -f debug.log
```

### Performance Monitoring
```bash
# Check agent process
ps aux | grep cursor_agent_deploy

# Monitor resource usage
top -p $(pgrep -f cursor_agent_deploy)

# Check disk usage
du -sh cursor_agent_deploy.log
du -sh cursor_deployment_history.json
```

## Integration Examples

### With GitHub Actions
```yaml
name: Cursor Agent Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      - name: Install dependencies
        run: pip install -r cursor_agent_requirements.txt
      - name: Run Cursor Agent Deploy
        run: python cursor_agent_deploy.py --mode deploy
```

### With Docker
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY . .

RUN pip install -r cursor_agent_requirements.txt
RUN chmod +x cursor_agent_deploy.py

CMD ["python", "cursor_agent_deploy.py", "--mode", "watch"]
```

### With Systemd Service
```ini
[Unit]
Description=Cursor Agent Auto-Deploy
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/home/i1/git/tagix
ExecStart=/usr/bin/python3 cursor_agent_deploy.py --mode watch
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Best Practices

1. **Always test first**: Run `--mode test` before deploying
2. **Monitor logs**: Keep an eye on `cursor_agent_deploy.log`
3. **Backup history**: Regularly backup `cursor_deployment_history.json`
4. **Update dependencies**: Keep `cursor_agent_requirements.txt` updated
5. **Configure notifications**: Set up Slack/Teams webhooks for alerts
6. **Monitor performance**: Watch resource usage during file watching
7. **Regular maintenance**: Clean up old log files and deployment history

---

**Created by:** Cursor AI Assistant  
**Version:** 1.0.0  
**Last Updated:** 2024  
**License:** MIT
