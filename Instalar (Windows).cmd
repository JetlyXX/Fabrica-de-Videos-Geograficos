@echo off
cd /d "%~dp0"
echo FABRICA DE VIDEOS
echo.
echo Esto copia la skill en: %USERPROFILE%\.claude\skills\fabrica-de-videos
echo La skill deja a Claude usar la fabrica sin preguntarte cada vez mientras hace un video.
echo.
set "RESPUESTA="
set /p "RESPUESTA=Quieres instalarla? (s/n): "
if /i not "%RESPUESTA%"=="s" exit /b 0
set "DESTINO=%USERPROFILE%\.claude\skills\fabrica-de-videos"
if exist "%DESTINO%" rmdir /s /q "%DESTINO%"
xcopy /e /i /q /y "fabrica-de-videos" "%DESTINO%" >nul || goto error
echo.
echo Listo. Abre una sesion nueva de Claude y escribe: VIDEO NUEVO
pause
exit /b 0
:error
echo No se pudo copiar la skill.
pause
exit /b 1
