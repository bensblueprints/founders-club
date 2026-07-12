# Gemini Enterprise Agent Platform — setup

Chạy trên nền **Vertex AI** (`aiplatform.googleapis.com`). Đã cấu hình xong và test chạy được.

## Trạng thái hiện tại
- **Tài khoản**: `techies.lab2026@gmail.com`
- **Project**: `techies-lab-antibot-sit01` (môi trường SIT — billing bật, Agent Platform API đã enable)
- **Xác thực**: ADC qua gcloud (không dùng API key). Quota project = sit01.
- SDK đã cài: `google-genai`, `google-cloud-aiplatform`.

## Kiểm thử lại bất cứ lúc nào
```bash
python3 tools/agent-platform/verify_setup.py
# đổi model:    --model gemini-2.5-pro
# đổi location: --location us-central1
```

## Dùng trong code của bạn
```python
from google import genai
client = genai.Client(vertexai=True,
                      project="techies-lab-antibot-sit01",
                      location="global")
resp = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Xin chào Agent Platform",
)
print(resp.text)
```
Cấu hình đọc từ [.env](.env) (đã gitignore). Mẫu: [.env.example](.env.example).

## Đổi tài khoản / project sau này
```bash
gcloud auth login <email>                        # đăng nhập gcloud CLI (mở trình duyệt)
gcloud auth application-default login            # đăng nhập ADC cho SDK (mở trình duyệt)
gcloud config set project <PROJECT_ID>
gcloud auth application-default set-quota-project <PROJECT_ID>
# rồi sửa GOOGLE_CLOUD_PROJECT trong .env
```
> Lưu ý: dùng `prod`/`staging` thì phải bật API trước:
> `gcloud services enable aiplatform.googleapis.com --project <PROJECT_ID>`

## Ghi chú môi trường
- gcloud cần Python 3.10+ → `.zshrc` đã có `export CLOUDSDK_PYTHON=$(brew --prefix python@3.11)/bin/python3.11`.
- Project khác của tài khoản này: `techies-lab-antibot-prod`, `techies-lab-antibot-staging` (chưa bật aiplatform API).
- Muốn build agent thật (không chỉ gọi model): cài thêm ADK — `python3 -m pip install google-adk`.
