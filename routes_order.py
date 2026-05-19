#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
@file routes_order.py
@description 订单管理API模块
@version 1.0.0
@author Menu Cloud Team
@date 2026-05-19

功能：
1. 创建订单（点菜）
2. 结算订单
"""

from flask import jsonify, request
from dataconf import get_db_connection
from logconfig import log_config

logger = log_config()

# ==================== API路由函数 ====================

def create_order():
    """
    创建订单（点菜）
    
    请求体：
    - items: 菜品列表 [{id, name, price, quantity}, ...]
    - total: 总价
    
    返回：
    - order_id: 订单ID
    - message: 下单成功消息
    """
    data = request.json
    items = data.get('items', [])
    total = data.get('total', 0)
    
    logger.info(f"点菜 - 订单数据: {items}, 总价: {total}")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
            INSERT INTO orders (total_amount, status, created_at)
            VALUES (%s, %s, NOW())
        ''', (total, 'pending'))

        order_id = cursor.lastrowid

        for item in items:
            cursor.execute('''
                INSERT INTO order_items (order_id, dish_id, dish_name, price, quantity)
                VALUES (%s, %s, %s, %s, %s)
            ''', (order_id, item.get('id'), item.get('name'), item.get('price'), item.get('quantity')))

        conn.commit()
        conn.close()

        logger.info(f"点菜成功 - 订单ID: {order_id}, 菜品数量: {len(items)}, 总价: {total}")
        return jsonify({'order_id': order_id, 'message': '下单成功'}), 201
    except Exception as e:
        logger.error(f"点菜失败 - 错误: {e}")
        conn.close()
        return jsonify({'error': '下单失败'}), 500

def checkout_order(order_id):
    """
    结算订单
    
    请求参数：
    - order_id: 订单ID（URL参数）
    
    返回：
    - message: 结算成功消息
    """
    logger.info(f"结算订单 - 订单ID: {order_id}")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM orders WHERE id = %s', (order_id,))
    order = cursor.fetchone()
    
    if order is None:
        conn.close()
        logger.warning(f"结算订单失败 - 订单ID: {order_id} 不存在")
        return jsonify({'error': '订单不存在'}), 404

    cursor.execute('UPDATE orders SET status = %s WHERE id = %s', ('completed', order_id))
    conn.commit()
    conn.close()

    logger.info(f"结算订单成功 - 订单ID: {order_id}, 订单状态: 已完成")
    return jsonify({'message': '结算成功'})

# ==================== 注册路由 ====================

def register_order_routes(app):
    """
    注册订单管理相关路由
    
    参数：
    - app: Flask应用实例
    """
    app.route('/api/order', methods=['POST'])(create_order)
    app.route('/api/order/<int:order_id>/checkout', methods=['POST'])(checkout_order)
