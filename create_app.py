#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
@file create_app.py
@description Flask应用工厂 - 创建并配置Flask应用实例
@version 1.0.0
@author Menu Cloud Team
@date 2026-07-29

功能：
1. 创建Flask应用实例
2. 配置CORS和密钥
3. 注册静态文件服务
4. 注册所有业务路由
5. 提供健康检查接口
"""

import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from utils.logger import log_config

# 导入路由模块
from routes.dish import register_dish_routes
from routes.tag import register_tag_routes
from routes.order import register_order_routes, create_order, checkout_order, get_order_list, get_order_detail
from routes.auth import register_auth_routes
from routes.daily import register_daily_routes
from routes.ops import register_ops_routes

logger = log_config()


def create_app():
    """
    应用工厂函数 - 创建并配置Flask应用实例
    
    返回：
    - 配置完成的Flask应用实例
    """
    app = Flask(__name__)
    app.secret_key = 'menu_cloud_secret_key_2026'
    CORS(app, supports_credentials=True)

    # ==================== 静态文件服务 ====================

    @app.route('/')
    def serve_index():
        """服务首页"""
        return send_from_directory('.', 'index.html')

    @app.route('/<path:path>')
    def serve_static(path):
        """静态文件服务"""
        return send_from_directory('.', path)

    # ==================== 健康检查 ====================

    @app.route('/api/health')
    def health_check():
        """健康检查接口"""
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

    @app.route('/api/receipt/info', methods=['GET'])
    def get_receipt_info_route():
        from routes.order import get_receipt_info
        return get_receipt_info()

    # ==================== 注册路由 ====================

    register_dish_routes(app)
    register_tag_routes(app)
    register_auth_routes(app)
    register_daily_routes(app)
    register_ops_routes(app)
    register_order_routes(app)

    return app
