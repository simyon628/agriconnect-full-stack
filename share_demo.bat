@echo off
cmd /k "echo Getting IP... && curl.exe -s https://api.ipify.org > ip.txt && set /p IP=<ip.txt && echo Your Password is: %IP% && echo %IP%| clip && echo IP Copied to Clipboard. && echo Starting Tunnel... && call npx localtunnel --port 3000"
