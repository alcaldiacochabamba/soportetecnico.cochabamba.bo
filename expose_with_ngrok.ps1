# Script para exponer servicios de Docker con Ngrok

# Levantar servicios de Docker
docker-compose up -d

# Esperar un momento para que los servicios se inicien completamente
Start-Sleep -Seconds 10

# Exponer puertos con Ngrok
Start-Process powershell -ArgumentList "ngrok http 4200 --domain=su-dominio-personalizado.ngrok-free.app" -WindowStyle Hidden
Start-Process powershell -ArgumentList "ngrok http 3001 --domain=su-otro-dominio-personalizado.ngrok-free.app" -WindowStyle Hidden

Write-Host "Servicios expuestos con Ngrok. Presiona Ctrl+C para detener."
Read-Host "Presiona Enter para salir..."

# Detener servicios de Docker
docker-compose down 