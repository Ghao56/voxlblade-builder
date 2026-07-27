@echo off
set GRAPH_DIR=D:\voxlblade-builder
set UNDERSTAND_ACCESS_TOKEN=test123
cd /d "C:\Users\Admin\.understand-anything\repo\understand-anything-plugin\packages\dashboard"
npx vite --host 127.0.0.1 > "D:\voxlblade-builder\.understand-anything\dashboard.log" 2>&1