#!/bin/bash

# Uso: ./setenv.sh staging
#       ./setenv.sh production
#       ./setenv.sh local

if [ -z "$1" ]; then
  echo "Uso: ./setenv.sh [local|staging|production]"
  exit 1
fi

cp .env.$1 .env.local
echo "✅ Copiado .env.$1 a .env.local"