#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
@file app.py
@description 菜单管理系统后端API服务 - 主入口
@version 1.0.0
@author Menu Cloud Team
@date 2026-05-19

功能模块：
1. 应用初始化
2. 路由注册
3. 静态文件服务
4. 应用启动

模块结构：
- dataconf.py: 数据库配置和缓存管理
- routes_dish.py: 菜品管理API
- routes_tag.py: 标签管理API
- routes_order.py: 订单管理API
- logconfig.py: 日志配置

技术栈：
- Flask 框架
- MySQL 数据库
- Flask-CORS 跨域支持
"""

# ==================== 设置路径 ====================
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ==================== 导入模块 ====================

from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from logconfig import log_config

# 导入路由模块
from routes_dish import register_dish_routes
from routes_tag import register_tag_routes
from routes_order import create_order, checkout_order, get_order_list, get_order_detail

# ==================== 应用初始化 ====================

app = Flask(__name__)
CORS(app)

logger = log_config()

# ==================== 静态文件服务 ====================

@app.route('/')
def serve_index():
    """
    服务首页
    返回index.html页面
    """
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """
    静态文件服务
    返回指定路径的静态资源文件
    """
    return send_from_directory('.', path)

# ==================== 健康检查 ====================

@app.route('/api/health')
def health_check():
    """
    健康检查接口
    用于检查服务是否正常运行
    """
    logger.info('健康检查')
    return jsonify({'status': 'ok', 'message': 'Server is running'})

# ==================== 订单管理路由 ====================

@app.route('/api/order', methods=['POST'])
def create_order_route():
    return create_order()

@app.route('/api/order/<order_id>/checkout', methods=['POST'])
def checkout_order_route(order_id):
    return checkout_order(order_id)

@app.route('/api/orders', methods=['GET'])
def get_order_list_route():
    return get_order_list()

@app.route('/api/order/<order_id>', methods=['GET'])
def get_order_detail_route(order_id):
    return get_order_detail(order_id)

# ==================== 注册路由 ====================

register_dish_routes(app)
register_tag_routes(app)

# ==================== 应用启动 ====================

if __name__ == '__main__':
    logger.info('--------应用启动--------')
    app.run(host='0.0.0.0', port=15431, debug=False)
