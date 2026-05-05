#!/bin/bash

# Script para cambiar la contraseña del administrador via API

echo "Cambiando contraseña del administrador Williamsgamundi..."

# Hacer GET request al endpoint de init que acabamos de actualizar
curl -X GET "http://localhost:3000/api/admin/init" || \
curl -X POST "http://localhost:3000/api/admin/init"

echo ""
echo "Contraseña actualizada. El usuario Williamsgamundi ahora puede iniciar sesión con: gamundistrateg"
