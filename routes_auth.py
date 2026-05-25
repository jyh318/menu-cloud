#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
@file routes_auth.py
@description 用户认证API模块
@version 1.0.0
@author Menu Cloud Team
@date 2026-05-24

功能：
1. 用户登录（账号密码验证，MD5加密）
2. 获取当前登录用户信息
3. 检查登录状态
4. 用户登出
5. 扣除用户余额
"""

from flask import jsonify, request, session
from dataconf import get_db_connection
from logconfig import log_config
import hashlib

logger = log_config()

def md5_hash(password):
    """
    MD5加密函数
    """
    return hashlib.md5(password.encode('utf-8')).hexdigest()

def login():
    """
    用户登录
    请求体：
    - username: 用户名
    - password: 密码
    
    返回：
    - success: 是否成功
    - message: 提示信息
    - user: 用户信息（登录成功时）
    """
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    if not username or not password:
        return jsonify({'success': False, 'message': '请输入账号和密码'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('SELECT * FROM mu_users WHERE username = %s', (username,))
        user = cursor.fetchone()
        
        if user is None:
            return jsonify({'success': False, 'message': '账号不存在'}), 401
        
        if user['password'] != md5_hash(password):
            return jsonify({'success': False, 'message': '密码错误'}), 401
        
        session['user_id'] = user['id']
        session['username'] = user['username']
        session['is_admin'] = user['is_admin']
        
        logger.info(f"用户登录成功 - 用户ID: {user['id']}, 用户名: {user['username']}, 是否管理员: {user['is_admin']}")
        
        return jsonify({
            'success': True,
            'message': '登录成功',
            'user': {
                'id': user['id'],
                'username': user['username'],
                'balance': float(user['balance']),
                'is_admin': bool(user['is_admin']),
                'created_at': user['created_at']
            }
        }), 200
        
    except Exception as e:
        logger.error(f"登录失败 - 错误: {str(e)}")
        return jsonify({'success': False, 'message': '登录失败'}), 500
    finally:
        conn.close()

def logout():
    """
    用户登出
    """
    session.clear()
    logger.info("用户登出")
    return jsonify({'success': True, 'message': '登出成功'}), 200

def get_current_user():
    """
    获取当前登录用户信息
    """
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({'success': False, 'message': '未登录'}), 401
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('SELECT * FROM mu_users WHERE id = %s', (user_id,))
        user = cursor.fetchone()
        
        if user is None:
            session.clear()
            return jsonify({'success': False, 'message': '用户不存在'}), 401
        
        return jsonify({
            'success': True,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'balance': float(user['balance']),
                'is_admin': bool(user['is_admin']),
                'created_at': user['created_at']
            }
        }), 200
        
    except Exception as e:
        logger.error(f"获取用户信息失败 - 错误: {str(e)}")
        return jsonify({'success': False, 'message': '获取用户信息失败'}), 500
    finally:
        conn.close()

def check_login():
    """
    检查登录状态
    """
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({'logged_in': False, 'is_admin': False}), 200
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('SELECT is_admin FROM mu_users WHERE id = %s', (user_id,))
        user = cursor.fetchone()
        
        if user is None:
            session.clear()
            return jsonify({'logged_in': False, 'is_admin': False}), 200
        
        return jsonify({
            'logged_in': True,
            'is_admin': bool(user['is_admin']),
            'user_id': user_id
        }), 200
        
    except Exception as e:
        logger.error(f"检查登录状态失败 - 错误: {str(e)}")
        return jsonify({'logged_in': False, 'is_admin': False}), 200
    finally:
        conn.close()

def deduct_balance(user_id, amount):
    """
    扣除用户余额
    参数：
    - user_id: 用户ID
    - amount: 扣除金额
    
    返回：
    - success: 是否成功
    - message: 提示信息
    - balance: 剩余余额
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('SELECT balance FROM mu_users WHERE id = %s FOR UPDATE', (user_id,))
        user = cursor.fetchone()
        
        if user is None:
            return jsonify({'success': False, 'message': '用户不存在'}), 404
        
        current_balance = float(user['balance'])
        
        if current_balance < amount:
            return jsonify({'success': False, 'message': '余额不足'}), 400
        
        new_balance = current_balance - amount
        cursor.execute('UPDATE mu_users SET balance = %s WHERE id = %s', (new_balance, user_id))
        conn.commit()
        
        logger.info(f"余额扣除成功 - 用户ID: {user_id}, 扣除金额: {amount}, 剩余余额: {new_balance}")
        
        return jsonify({
            'success': True,
            'message': '余额扣除成功',
            'balance': new_balance
        }), 200
        
    except Exception as e:
        conn.rollback()
        logger.error(f"余额扣除失败 - 错误: {str(e)}")
        return jsonify({'success': False, 'message': '余额扣除失败'}), 500
    finally:
        conn.close()

def register_auth_routes(app):
    """
    注册用户认证相关路由
    
    参数：
    - app: Flask应用实例
    """
    app.route('/api/login', methods=['POST'])(login)
    app.route('/api/logout', methods=['POST'])(logout)
    app.route('/api/user', methods=['GET'])(get_current_user)
    app.route('/api/check_login', methods=['GET'])(check_login)
    app.route('/api/user/deduct_balance', methods=['POST'])(deduct_balance_route)

def deduct_balance_route():
    """
    扣除余额API路由包装函数
    """
    data = request.json
    user_id = data.get('user_id')
    amount = data.get('amount')
    
    if not user_id or amount is None:
        return jsonify({'success': False, 'message': '参数错误'}), 400
    
    return deduct_balance(user_id, float(amount))