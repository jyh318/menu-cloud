# 使用 Python 官方镜像作为基础
FROM python:3.13-slim

# 设置工作目录
WORKDIR /app

# 复制依赖文件并安装
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# 复制项目所有代码
COPY . .

# 容器启动命令，这里用 gunicorn 运行 Flask
CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:app"]