@echo off
REM Double-click: updates the studio and opens Claude Code ready to edit whatever is in Raw.
cd /d "%~dp0"
git pull -q
set "CL=claude"
if exist "Setup\claude-path.txt" set /p CL=<"Setup\claude-path.txt"
"%CL%" "start the edit"
pause
