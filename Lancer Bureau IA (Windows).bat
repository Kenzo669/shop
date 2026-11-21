@echo off
title Bureau IA
cd /d "%~dp0"
echo.
echo  ==== Bureau IA ====
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo  Node.js n'est pas installe sur cet ordinateur.
  echo  La page de telechargement va s'ouvrir : installez la version LTS,
  echo  puis redemarrez l'ordinateur et double-cliquez a nouveau sur ce fichier.
  start "" https://nodejs.org/fr
  pause
  exit /b
)
if not exist ".env.local" copy ".env.example" ".env.local" >nul
if not exist "node_modules" (
  echo  Premiere installation : 1 a 3 minutes, merci de patienter...
  call npm install
  if errorlevel 1 (
    echo.
    echo  L'installation a echoue. Faites une capture de cette fenetre et envoyez-la.
    pause
    exit /b
  )
)
echo  Demarrage... le navigateur va s'ouvrir tout seul.
echo  Pour arreter Bureau IA : fermez cette fenetre.
start "" cmd /c "timeout /t 12 >nul & start http://localhost:3000"
call npm run dev
pause
