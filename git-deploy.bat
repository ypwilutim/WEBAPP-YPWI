#!/bin/bash
git add .
git commit -m "$1"
git push origin main
curl -X POST 100.115.156.20:3000/auto-deploy