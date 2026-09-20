# 深圳低空无人机多任务调度三维数字孪生仿真平台

基于 Babylon.js 与深圳三维城市底座构建的低空无人机数字孪生展示系统。当前仓库只保留网站运行、维护和 Docker 部署所需的代码与资源，已移除原 GTA 游戏、UE5 工程、车辆、行人和旧角色等无关内容。

## 当前功能

- 深圳三维城市、道路、水域、建筑、绿化和地标展示
- 简洁的首页资源初始化进度
- 主页、手动旋转视角和手动平移视角三种地图交互
- 沉浸地图模式：放大中心地图时自动收起两侧浮窗
- 物流中心 5 个停机位与 5 架 GreenRoute 无人机
- 无人机螺旋桨独立旋转、相邻旋翼反向和高速旋转视觉优化
- 无汽车、行人和电动车干扰的纯净低空场景
- 响应式底部遥测面板

## 技术栈

- TypeScript + Vite
- Babylon.js
- Nginx
- Docker Compose

## 目录

```text
.
├─ src/                 # 三维场景、无人机、停机坪与界面代码
├─ public/city/         # 深圳三维城市运行资源
├─ public/drone/        # GreenRoute 无人机模型
├─ scripts/             # 核心资源检查与无人机验证脚本
├─ Dockerfile
├─ docker-compose.yml
└─ nginx.conf
```

`public/city` 是页面运行必需的三维地图资源，因此仍占据仓库的大部分体积。仓库使用 Git LFS 管理 GLB、HDR 和图片等二进制文件。

## Docker 启动（推荐）

需要已启动 Docker Desktop。

```powershell
docker compose up --build -d
```

浏览器访问：<http://localhost:8000>

常用命令：

```powershell
# 查看状态
docker compose ps

# 查看日志
docker compose logs -f

# 停止服务
docker compose down
```

## 本地开发

需要 Node.js 20 或更高版本。

```powershell
npm ci
npm run dev -- --port 8000
```

生产构建与验证：

```powershell
npm run build
npm run verify
```

## 资源说明

- 城市底座与原始项目结构来源于 [linranff/GTA_SZ](https://github.com/linranff/GTA_SZ)，本项目在其基础上精简并增加无人机数字孪生功能。
- GreenRoute 无人机模型由项目方提供并用于当前停机坪展示。
- 第三方资源许可说明保留在 `public/LICENSES.txt`、`public/city/LICENSES.md` 和各资源目录内。

## 部署说明

- 默认端口为 `8000`，容器内部由 Nginx 提供静态文件服务。
- 首次克隆需要拉取 Git LFS 资源，下载时间取决于网络速度。
- 初始化页面只显示资源加载进度，加载完成后自动进入地图主界面。
