@echo off
REM Double-click: updates the studio and opens Claude Code ready to edit whatever is in Raw.
cd /d "%~dp0"
git pull -q
claude "start the edit"
pause
