# 🚀 AllMeet 웹 배포 가이드

"allmeet"이 포함된 웹 링크로 언제나 접속 가능하게 설정하는 방법입니다.

## 📍 최종 접속 링크

- **프론트엔드**: `https://1kkikki.github.io/allmeet/`
- **백엔드 API**: `https://allmeet-backend.onrender.com`

## 🛠️ 배포 단계

### Step 1: 백엔드 배포 (Render)

1. [Render.com](https://render.com) 회원가입 및 로그인

2. **New Web Service** 클릭

3. GitHub 레포지토리 연결:
   - Repository: `1kkikki/1kkikki.github.io` 선택
   - Branch: `main`

4. 서비스 설정:
   - **Name**: `allmeet-backend`
   - **Root Directory**: `project/backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT app:app`

5. **Environment Variables** 추가:
   ```
   FLASK_ENV=production
   JWT_SECRET_KEY=<랜덤 문자열 생성>
   FRONTEND_URL=https://1kkikki.github.io
   ```

6. **Create Web Service** 클릭 → 배포 완료까지 대기 (약 5-10분)

7. 배포 후 나타나는 URL 확인 (예: `https://allmeet-backend.onrender.com`)

### Step 2: 프론트엔드 배포 (GitHub Pages)

1. GitHub 레포지토리로 이동: `https://github.com/1kkikki/1kkikki.github.io`

2. **Settings** → **Pages** 메뉴로 이동

3. **Source** 설정:
   - Build and deployment: **GitHub Actions** 선택

4. **Settings** → **Secrets and variables** → **Actions** 메뉴로 이동

5. **New repository secret** 클릭하여 추가:
   - Name: `VITE_API_URL`
   - Value: 백엔드 URL (예: `https://allmeet-backend.onrender.com`)

6. 코드 푸시하여 자동 배포:
   ```bash
   git add .
   git commit -m "배포 설정 추가"
   git push origin main
   ```

7. 배포 완료 확인:
   - 레포지토리 **Actions** 탭에서 워크플로우 실행 확인
   - 약 2-3분 후 `https://1kkikki.github.io/allmeet/` 접속

## ✅ 배포 확인

### 프론트엔드
- `https://1kkikki.github.io/allmeet/` 접속
- 페이지가 정상적으로 로드되는지 확인

### 백엔드
- `https://allmeet-backend.onrender.com/` 접속
- `{"message": "✅ Flask backend running!"}` 응답 확인

## 🔧 문제 해결

### 프론트엔드가 백엔드에 연결되지 않을 때

1. 브라우저 개발자 도구(F12) → Network 탭 확인
2. CORS 에러 발생 시:
   - Render 대시보드 → Environment Variables
   - `FRONTEND_URL` 값 확인: `https://1kkikki.github.io`
   - 백엔드 재배포

3. API URL 확인:
   - GitHub Secrets → `VITE_API_URL` 값 확인
   - 프론트엔드 재빌드 필요 시 커밋 푸시

### 백엔드가 실행되지 않을 때

1. Render 대시보드 → **Logs** 탭 확인
2. 일반적인 오류:
   - **포트 에러**: Start Command가 `gunicorn --bind 0.0.0.0:$PORT app:app` 인지 확인
   - **의존성 에러**: `requirements.txt` 확인
   - **데이터베이스 에러**: SQLite 파일 경로 확인

### GitHub Pages에서 404 에러

- GitHub Pages는 `/allmeet/` 경로로 접근해야 합니다
- 루트 경로(`/`)에서 접근 시 404 발생 가능
- 정확한 URL: `https://1kkikki.github.io/allmeet/`

## 📝 추가 설정 (선택사항)

### 커스텀 도메인 사용

1. 도메인 구매 (예: `allmeet.com`)
2. GitHub Pages에서 커스텀 도메인 설정
3. DNS 설정: CNAME 레코드 추가
4. 백엔드 CORS 설정에 새 도메인 추가

### 데이터베이스 (PostgreSQL)

Render에서 PostgreSQL 데이터베이스를 생성하면 더 안정적입니다:

1. Render → **New** → **PostgreSQL**
2. 데이터베이스 생성
3. Web Service → **Environment Variables** → `DATABASE_URL` 추가
4. 백엔드 코드는 이미 PostgreSQL을 지원하도록 설정됨

## 🔄 업데이트 배포

코드 변경 후 자동 배포:

```bash
# 프론트엔드 변경
git add project/frontend/
git commit -m "프론트엔드 업데이트"
git push origin main
# GitHub Actions가 자동으로 배포

# 백엔드 변경
git add project/backend/
git commit -m "백엔드 업데이트"
git push origin main
# Render가 자동으로 재배포
```

## 📚 참고 문서

- [GitHub Pages 문서](https://docs.github.com/en/pages)
- [Render 문서](https://render.com/docs)
- [Vite 배포 가이드](https://vitejs.dev/guide/static-deploy.html)

