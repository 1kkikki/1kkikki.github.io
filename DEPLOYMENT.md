# 🚀 AllMeet 배포 가이드

이 프로젝트를 웹에서 접속 가능하도록 배포하는 방법입니다.

## 📋 배포 구조

- **프론트엔드**: GitHub Pages (`https://1kkikki.github.io/allmeet/`)
- **백엔드**: Render (`https://allmeet-backend.onrender.com`)

## 🔧 배포 단계

### 1. 백엔드 배포 (Render)

1. [Render](https://render.com)에 가입하고 로그인합니다.

2. 새로운 Web Service를 생성합니다:
   - Repository: GitHub 레포지토리 연결
   - Root Directory: `project/backend`
   - Environment: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn --bind 0.0.0.0:$PORT app:app`

3. 환경 변수 설정:
   ```
   FLASK_ENV=production
   JWT_SECRET_KEY=<랜덤 시크릿 키 생성>
   FRONTEND_URL=https://1kkikki.github.io
   ```

4. 데이터베이스 설정:
   - Render 대시보드에서 PostgreSQL 데이터베이스 생성
   - 데이터베이스 URL을 환경 변수 `DATABASE_URL`에 추가

5. 배포 후 백엔드 URL을 확인합니다 (예: `https://allmeet-backend.onrender.com`)

### 2. 프론트엔드 배포 (GitHub Pages)

1. GitHub 레포지토리 Settings로 이동:
   - Settings → Pages
   - Source: GitHub Actions 선택

2. GitHub Secrets 설정 (Settings → Secrets and variables → Actions):
   - `VITE_API_URL`: 백엔드 URL (예: `https://allmeet-backend.onrender.com`)

3. `main` 브랜치에 푸시하면 자동으로 배포됩니다:
   ```bash
   git push origin main
   ```

4. 배포 후 접속 URL:
   - `https://1kkikki.github.io/allmeet/`

### 3. 라우팅 설정

GitHub Pages에서 React Router를 사용하려면 `index.html`을 모든 경로에서 제공해야 합니다.

`.github/workflows/deploy-frontend.yml` 파일에서 이미 설정되어 있습니다.

## 🔗 접속 링크

배포 완료 후:
- **프론트엔드**: `https://1kkikki.github.io/allmeet/`
- **백엔드 API**: `https://allmeet-backend.onrender.com`

## 📝 참고사항

### CORS 설정
백엔드의 `app.py`에서 프론트엔드 URL이 허용되어 있는지 확인하세요.

### 환경 변수
프로덕션 환경에서는 반드시 `JWT_SECRET_KEY`를 안전한 랜덤 값으로 설정하세요.

### 데이터베이스
Render의 무료 PostgreSQL 데이터베이스를 사용하거나, SQLite를 계속 사용할 수도 있습니다 (비권장).

## 🛠️ 로컬 개발

로컬에서 개발할 때는 기존과 동일하게:
```bash
# 백엔드
cd project/backend
flask run

# 프론트엔드
cd project/frontend
npm run dev
```

## 🔄 자동 배포

프론트엔드는 GitHub Actions를 통해 자동 배포되며, `main` 브랜치에 푸시할 때마다 새로 빌드됩니다.

백엔드도 Render에서 GitHub와 연결하면 자동 배포됩니다.

