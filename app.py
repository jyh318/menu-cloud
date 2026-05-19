#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
@file app.py
@description 菜单管理系统后端API服务
@version 1.0.0
@author Menu Cloud Team
@date 2026-05-19

功能模块：
1. 菜品管理 - CRUD操作
2. 标签管理 - 标签的增删查
3. 订单管理 - 点菜、结算
4. 缓存管理 - 标签缓存机制
5. 日志记录 - 操作日志记录

技术栈：
- Flask 框架
- MySQL 数据库
- Flask-CORS 跨域支持
- 自定义日志模块
"""

# ==================== 导入模块 ====================

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import pymysql
import os
from dotenv import load_dotenv
from logconfig import log_config

# ==================== 应用初始化 ====================

app = Flask(__name__)
CORS(app)  # 启用跨域支持

# 加载环境变量配置
load_dotenv()

# 初始化日志记录器
logger = log_config()

# ==================== 路由定义 - 静态文件服务 ====================

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

@app.route('/api/health')
def health_check():
    """
    健康检查接口
    用于检查服务是否正常运行
    """
    logger.info('健康检查')
    return jsonify({'status': 'ok', 'message': 'Server is running'})

# ==================== 数据库配置 ====================

# 数据库配置,读取.env文件,无数据返回默认值
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'sh-cynosdbmysql-grp-d2dhhovq.sql.tencentcdb.com'),
    'port': int(os.getenv('DB_PORT', 23841)),
    'user': os.getenv('DB_USER', 'menu'),
    'password': os.getenv('DB_PASSWORD', 'menu.123'),
    'db': os.getenv('DB_NAME', 'room-d0gyj4jwe761aa259'),
    'charset': os.getenv('DB_CHARSET', 'utf8mb4'),
    'cursorclass': pymysql.cursors.DictCursor
}

def get_db_connection():
    """
    获取数据库连接
    返回一个MySQL连接对象
    """
    return pymysql.connect(**DB_CONFIG)

# ==================== 标签缓存管理 ====================

def get_all_tags_cache():
    """
    获取所有标签的缓存数据
    返回字典格式：{标签名: {background_color, text_color}}
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT name, background_color, text_color FROM tags')
    tags = cursor.fetchall()
    conn.close()
    return {tag['name']: {'background_color': tag['background_color'], 'text_color': tag['text_color']} for tag in tags}

def get_dish_tags_mapping():
    """
    获取菜品与标签的映射关系
    返回字典格式：{菜品ID: [{name, background_color, text_color}, ...]}
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SHOW TABLES LIKE 'taglink'")
    if not cursor.fetchone():
        conn.close()
        return {}
    try:
        cursor.execute("DESCRIBE taglink")
        fields = [f['Field'] for f in cursor.fetchall()]
        dish_field = next((fn for fn in fields if 'dish' in fn.lower()), None)
        tag_field = next((fn for fn in fields if 'tag' in fn.lower()), None)
        if not dish_field or not tag_field:
            conn.close()
            return {}
        cursor.execute(f'SELECT tl.{dish_field} as dish_id, t.name, t.background_color, t.text_color FROM taglink tl JOIN tags t ON tl.{tag_field} = t.id')
        results = cursor.fetchall()
        conn.close()
        mapping = {}
        for r in results:
            if r['dish_id'] not in mapping:
                mapping[r['dish_id']] = []
            mapping[r['dish_id']].append({'name': r['name'], 'background_color': r['background_color'], 'text_color': r['text_color']})
        return mapping
    except Exception as e:
        logger.error(f"获取菜品标签映射失败: {e}")
        conn.close()
        return {}

# 全局缓存变量
_tag_cache = None
_dish_tags_cache = None
_cache_timestamp = 0

# 缓存过期时间，单位秒
CACHE_EXPIRE_SECONDS = 30

def get_tag_caches():
    """
    获取标签缓存（带自动刷新机制）
    如果缓存不存在或已过期，则重新从数据库加载
    返回元组：(标签缓存, 菜品标签映射)
    """
    global _tag_cache, _dish_tags_cache, _cache_timestamp
    import time
    current_time = time.time()
    if _tag_cache is None or (current_time - _cache_timestamp) > CACHE_EXPIRE_SECONDS:
        _tag_cache = get_all_tags_cache()
        _dish_tags_cache = get_dish_tags_mapping()
        _cache_timestamp = current_time
        Time = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(current_time))
        logger.info(f"缓存刷新: {Time}")
    return _tag_cache, _dish_tags_cache

# ==================== 菜品管理API ====================

@app.route('/api/dishes', methods=['GET'])
def get_dishes():
    """
    获取菜品列表（支持分页和筛选）
    
    请求参数：
    - tag: 标签筛选（可选）
    - search: 搜索关键词（匹配名称、描述、价格）
    - page: 页码（默认0）
    - page_size: 每页数量（默认12）
    
    返回：
    - dishes: 菜品列表
    - total: 总数
    - page: 当前页码
    - page_size: 每页数量
    - has_more: 是否还有更多
    """
    tag_filter = request.args.get('tag')
    search = request.args.get('search')
    page = request.args.get('page', 0, type=int)
    page_size = request.args.get('page_size', 12, type=int)

    logger.info(f"查询菜品列表 - 标签筛选: {tag_filter}, 搜索关键词: {search}, 页码: {page}, 每页数量: {page_size}")

    conn = get_db_connection()
    cursor = conn.cursor()

    query = 'SELECT * FROM dishes WHERE 1=1'
    params = []

    if search:
        query += ' AND (name LIKE %s OR description LIKE %s OR CAST(price AS CHAR) LIKE %s)'
        params.append(f'%{search}%')
        params.append(f'%{search}%')
        params.append(f'%{search}%')

    cursor.execute(query, params)
    all_dishes = [dict(row) for row in cursor.fetchall()]
    conn.close()

    tag_cache, dish_tags_map = get_tag_caches()

    # 默认标签映射（用于兼容旧数据）
    default_tag_map = {
        '宫保鸡丁': ['川菜', '辣'], '鱼香肉丝': ['川菜', '辣'], '麻婆豆腐': ['川菜', '辣'], '糖醋排骨': ['鲁菜', '甜'],
    }

    # 处理每个菜品的标签信息
    for dish in all_dishes:
        dish_id = dish['id']
        tags = []
        
        # 字段别名处理
        if 'detail_description' in dish and dish['detail_description']:
            dish['detail_desc'] = dish['detail_description']
        if 'method_desc' in dish and dish['method_desc']:
            dish['method'] = dish['method_desc']
        if 'ingredients_desc' in dish and dish['ingredients_desc']:
            dish['ingredients'] = dish['ingredients_desc']

        # 获取标签信息
        if dish_id in dish_tags_map:
            tags = dish_tags_map[dish_id]
        else:
            dish_tags_str = dish.get('tags', '')
            if dish_tags_str:
                for tag_name in dish_tags_str.split(','):
                    tag_name = tag_name.strip()
                    if tag_name and tag_name in tag_cache:
                        tags.append({'name': tag_name, 'background_color': tag_cache[tag_name]['background_color'], 'text_color': tag_cache[tag_name]['text_color']})

        # 如果没有标签，使用默认标签
        if not tags:
            tag_list = default_tag_map.get(dish.get('name', ''), ['家常菜'])
            for tag_name in tag_list:
                if tag_name in tag_cache:
                    tags.append({'name': tag_name, 'background_color': tag_cache[tag_name]['background_color'], 'text_color': tag_cache[tag_name]['text_color']})
                else:
                    tags.append({'name': tag_name, 'background_color': '#7A77B9', 'text_color': 'white'})

        dish['tags'] = ','.join([tag['name'] for tag in tags])
        dish['tag_details'] = tags

    # 标签筛选
    if tag_filter:
        all_dishes = [dish for dish in all_dishes if tag_filter in dish['tags']]

    # 分页处理
    total = len(all_dishes)
    start = page * page_size
    end = start + page_size
    dishes = all_dishes[start:end]

    logger.info(f"查询菜品列表成功 - 总数: {total}, 返回数量: {len(dishes)}")

    return jsonify({
        'dishes': dishes,
        'total': total,
        'page': page,
        'page_size': page_size,
        'has_more': end < total
    })

@app.route('/api/dishes/<int:dish_id>', methods=['GET'])
def get_dish(dish_id):
    """
    获取单个菜品详情
    
    请求参数：
    - dish_id: 菜品ID（URL参数）
    
    返回：
    - 菜品详细信息
    """
    logger.info(f"查询单个菜品 - 菜品ID: {dish_id}")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM dishes WHERE id = %s', (dish_id,))
    dish = cursor.fetchone()
    conn.close()

    if dish is None:
        logger.warning(f"查询菜品失败 - 菜品ID: {dish_id} 不存在")
        return jsonify({'error': '菜品不存在'}), 404

    dish = dict(dish)
    # 字段别名处理
    if 'detail_description' in dish and dish['detail_description']:
        dish['detail_desc'] = dish['detail_description']
    if 'method_desc' in dish and dish['method_desc']:
        dish['method'] = dish['method_desc']
    if 'ingredients_desc' in dish and dish['ingredients_desc']:
        dish['ingredients'] = dish['ingredients_desc']
    
    # 获取标签信息
    tag_cache, dish_tags_map = get_tag_caches()
    tags = dish_tags_map.get(dish_id, [])

    if not tags:
        dish_tags_str = dish.get('tags', '')
        if dish_tags_str:
            for tag_name in dish_tags_str.split(','):
                tag_name = tag_name.strip()
                if tag_name and tag_name in tag_cache:
                    tags.append({'name': tag_name, 'background_color': tag_cache[tag_name]['background_color'], 'text_color': tag_cache[tag_name]['text_color']})

    if not tags:
        default_tag_map = {
            '宫保鸡丁': ['川菜', '辣'], '鱼香肉丝': ['川菜', '辣'], '麻婆豆腐': ['川菜', '辣'], '糖醋排骨': ['鲁菜', '甜'],
        }
        tag_list = default_tag_map.get(dish.get('name', ''), ['家常菜'])
        for tag_name in tag_list:
            if tag_name in tag_cache:
                tags.append({'name': tag_name, 'background_color': tag_cache[tag_name]['background_color'], 'text_color': tag_cache[tag_name]['text_color']})
            else:
                tags.append({'name': tag_name, 'background_color': '#7A77B9', 'text_color': 'white'})

    dish['tags'] = ','.join([tag['name'] for tag in tags])
    dish['tag_details'] = tags

    logger.info(f"查询菜品成功 - 菜品ID: {dish_id}, 菜品名称: {dish.get('name')}")

    return jsonify(dish)

@app.route('/api/dishes', methods=['POST'])
def create_dish():
    """
    新增菜品
    
    请求体：
    - name: 菜品名称（必填）
    - price: 价格（必填）
    - image: 图片URL（可选）
    - description: 简介（可选）
    - detail_desc: 详细描述（可选）
    - method: 制作方法（可选）
    - ingredients: 用料（可选）
    - tags: 标签（逗号分隔，可选）
    
    返回：
    - id: 新菜品ID
    - message: 成功消息
    """
    global _dish_tags_cache
    data = request.json
    
    logger.info(f"新增菜品 - 菜品名称: {data.get('name')}, 价格: {data.get('price')}")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
            INSERT INTO dishes (name, price, image, description, detail_description, method_desc, ingredients_desc)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        ''', (
            data.get('name'),
            data.get('price'),
            data.get('image', ''),
            data.get('description', ''),
            data.get('detail_desc', ''),
            data.get('method', ''),
            data.get('ingredients', '')
        ))

        dish_id = cursor.lastrowid
        
        # 处理标签关联
        new_tags_str = data.get('tags', '') or ''
        new_tags_set = set(t.strip() for t in new_tags_str.split(',') if t.strip())
        
        if new_tags_set:
            try:
                cursor.execute("SHOW TABLES LIKE 'taglink'")
                if cursor.fetchone():
                    cursor.execute("DESCRIBE taglink")
                    fields = [f['Field'] for f in cursor.fetchall()]
                    dish_field = next((fn for fn in fields if 'dish' in fn.lower()), None)
                    tag_field = next((fn for fn in fields if 'tag' in fn.lower()), None)
                    
                    if dish_field and tag_field:
                        cursor.execute('SELECT id, name FROM tags')
                        all_tags_in_db = cursor.fetchall()
                        tag_id_map = {tag['name']: tag['id'] for tag in all_tags_in_db}
                        
                        for tag_name in new_tags_set:
                            if tag_name in tag_id_map:
                                tag_id = tag_id_map[tag_name]
                                cursor.execute(f'INSERT INTO taglink ({dish_field}, {tag_field}) VALUES (%s, %s)', (dish_id, tag_id))
            except Exception as e:
                logger.error(f"新增菜品时关联标签失败: {e}")

        _dish_tags_cache = None
        conn.commit()
        conn.close()

        logger.info(f"新增菜品成功 - 菜品ID: {dish_id}, 菜品名称: {data.get('name')}")
        return jsonify({'id': dish_id, 'message': '新增成功'}), 201
    except Exception as e:
        logger.error(f"新增菜品失败 - 菜品名称: {data.get('name')}, 错误: {e}")
        conn.close()
        return jsonify({'error': '新增失败'}), 500

@app.route('/api/dishes/<int:dish_id>', methods=['PUT'])
def update_dish(dish_id):
    """
    修改菜品信息
    
    请求参数：
    - dish_id: 菜品ID（URL参数）
    
    请求体：
    - name: 菜品名称（可选）
    - price: 价格（可选）
    - image: 图片URL（可选）
    - description: 简介（可选）
    - detail_desc: 详细描述（可选）
    - method: 制作方法（可选）
    - ingredients: 用料（可选）
    - tags: 标签（逗号分隔，可选）
    
    返回：
    - message: 更新成功消息
    """
    global _dish_tags_cache
    data = request.json

    logger.info(f"修改菜品 - 菜品ID: {dish_id}, 数据: {data}")

    conn = get_db_connection()
    cursor = conn.cursor()

    # 检查菜品是否存在
    cursor.execute('SELECT * FROM dishes WHERE id = %s', (dish_id,))
    if cursor.fetchone() is None:
        conn.close()
        logger.warning(f"修改菜品失败 - 菜品ID: {dish_id} 不存在")
        return jsonify({'error': '菜品不存在'}), 404

    # 获取表结构
    cursor.execute('DESCRIBE dishes')
    dish_fields = [f['Field'] for f in cursor.fetchall()]
    
    # 构建更新字段
    update_fields = []
    update_values = []
    
    if 'name' in dish_fields:
        update_fields.append('name = %s')
        update_values.append(data.get('name'))
    if 'price' in dish_fields:
        update_fields.append('price = %s')
        update_values.append(data.get('price'))
    if 'image' in dish_fields:
        update_fields.append('image = %s')
        update_values.append(data.get('image', ''))
    if 'description' in dish_fields:
        update_fields.append('description = %s')
        update_values.append(data.get('description', ''))
    if 'detail_description' in dish_fields:
        update_fields.append('detail_description = %s')
        update_values.append(data.get('detail_desc', ''))
    if 'method_desc' in dish_fields:
        update_fields.append('method_desc = %s')
        update_values.append(data.get('method', ''))
    if 'ingredients_desc' in dish_fields:
        update_fields.append('ingredients_desc = %s')
        update_values.append(data.get('ingredients', ''))

    # 执行更新
    if update_fields:
        sql = f"UPDATE dishes SET {', '.join(update_fields)} WHERE id = %s"
        update_values.append(dish_id)
        cursor.execute(sql, tuple(update_values))

    # 处理标签更新
    new_tags_str = data.get('tags', '') or ''
    new_tags_set = set(t.strip() for t in new_tags_str.split(',') if t.strip())
    
    tags_changed = False
    try:
        cursor.execute("SHOW TABLES LIKE 'taglink'")
        if cursor.fetchone():
            cursor.execute("DESCRIBE taglink")
            fields = [f['Field'] for f in cursor.fetchall()]
            dish_field = next((fn for fn in fields if 'dish' in fn.lower()), None)
            tag_field = next((fn for fn in fields if 'tag' in fn.lower()), None)
            
            if dish_field and tag_field:
                # 获取旧标签
                cursor.execute(f'''
                    SELECT t.name FROM taglink tl 
                    JOIN tags t ON tl.{tag_field} = t.id 
                    WHERE tl.{dish_field} = %s
                ''', (dish_id,))
                old_tags_list = cursor.fetchall()
                old_tags_set = set(t['name'] for t in old_tags_list)
                
                if old_tags_set != new_tags_set:
                    tags_changed = True
                
                if tags_changed:
                    # 删除旧标签关联
                    cursor.execute(f'DELETE FROM taglink WHERE {dish_field} = %s', (dish_id,))
                    logger.info(f"删除菜品 {dish_id} 的所有标签关联")
                    
                    # 添加新标签关联
                    cursor.execute('SELECT id, name FROM tags')
                    all_tags_in_db = cursor.fetchall()
                    tag_id_map = {tag['name']: tag['id'] for tag in all_tags_in_db}
                    
                    for tag_name in new_tags_set:
                        if tag_name in tag_id_map:
                            tag_id = tag_id_map[tag_name]
                            cursor.execute(f'INSERT INTO taglink ({dish_field}, {tag_field}) VALUES (%s, %s)', (dish_id, tag_id))
                    
                    logger.info(f"菜品 {dish_id} 标签已更新，同步操作 taglink 表")
    except Exception as e:
        logger.error(f"更新 taglink 失败: {e}")

    # 刷新缓存
    if tags_changed:
        _tag_cache = None
        _dish_tags_cache = None
    
    conn.commit()
    conn.close()

    logger.info(f"修改菜品成功 - 菜品ID: {dish_id}")
    return jsonify({'message': '更新成功'})

@app.route('/api/dishes/<int:dish_id>', methods=['DELETE'])
def delete_dish(dish_id):
    """
    删除菜品
    
    请求参数：
    - dish_id: 菜品ID（URL参数）
    
    返回：
    - message: 删除成功消息
    """
    global _dish_tags_cache

    logger.info(f"删除菜品 - 菜品ID: {dish_id}")

    conn = get_db_connection()
    cursor = conn.cursor()

    # 检查菜品是否存在
    cursor.execute('SELECT * FROM dishes WHERE id = %s', (dish_id,))
    dish = cursor.fetchone()
    if dish is None:
        conn.close()
        logger.warning(f"删除菜品失败 - 菜品ID: {dish_id} 不存在")
        return jsonify({'error': '菜品不存在'}), 404

    dish_name = dish.get('name', '未知')
    
    # 删除关联数据和菜品
    cursor.execute('DELETE FROM taglink WHERE dish_id = %s', (dish_id,))
    cursor.execute('DELETE FROM dishes WHERE id = %s', (dish_id,))
    _dish_tags_cache = None
    conn.commit()
    conn.close()

    logger.info(f"删除菜品成功 - 菜品ID: {dish_id}, 菜品名称: {dish_name}")
    return jsonify({'message': '删除成功'})

# ==================== 订单管理API ====================

@app.route('/api/order', methods=['POST'])
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
        # 创建订单记录
        cursor.execute('''
            INSERT INTO orders (total_amount, status, created_at)
            VALUES (%s, %s, NOW())
        ''', (total, 'pending'))

        order_id = cursor.lastrowid

        # 创建订单项记录
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

@app.route('/api/order/<int:order_id>/checkout', methods=['POST'])
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

    # 检查订单是否存在
    cursor.execute('SELECT * FROM orders WHERE id = %s', (order_id,))
    order = cursor.fetchone()
    
    if order is None:
        conn.close()
        logger.warning(f"结算订单失败 - 订单ID: {order_id} 不存在")
        return jsonify({'error': '订单不存在'}), 404

    # 更新订单状态为已完成
    cursor.execute('UPDATE orders SET status = %s WHERE id = %s', ('completed', order_id))
    conn.commit()
    conn.close()

    logger.info(f"结算订单成功 - 订单ID: {order_id}, 订单状态: 已完成")
    return jsonify({'message': '结算成功'})

# ==================== 标签管理API ====================

@app.route('/api/tags', methods=['GET'])
def get_tags():
    """
    获取所有标签列表
    
    返回：
    - 标签列表
    """
    logger.info('查询标签列表')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM tags ORDER BY name')
    tags = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    logger.info(f"查询标签列表成功 - 标签数量: {len(tags)}")
    return jsonify(tags)

@app.route('/api/tags', methods=['POST'])
def create_tag():
    """
    创建新标签
    
    请求体：
    - name: 标签名称（必填）
    - category: 分类（可选）
    - color: 颜色（可选，默认#7A77B9）
    
    返回：
    - id: 标签ID
    - message: 创建成功消息
    """
    global _tag_cache
    data = request.json

    if 'name' not in data:
        logger.warning('创建标签失败 - 标签名称为空')
        return jsonify({'error': '标签名称不能为空'}), 400

    logger.info(f"创建标签 - 标签名称: {data.get('name')}, 分类: {data.get('category')}, 颜色: {data.get('color')}")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
            INSERT INTO tags (name, category, color)
            VALUES (%s, %s, %s)
        ''', (
            data.get('name'),
            data.get('category', ''),
            data.get('color', '#7A77B9')
        ))

        tag_id = cursor.lastrowid
        _tag_cache = None
        conn.commit()
        conn.close()

        logger.info(f"创建标签成功 - 标签ID: {tag_id}, 标签名称: {data.get('name')}")
        return jsonify({'id': tag_id, 'message': '标签创建成功'}), 201
    except pymysql.IntegrityError:
        conn.close()
        logger.warning(f"创建标签失败 - 标签名称: {data.get('name')} 已存在")
        return jsonify({'error': '标签已存在'}), 400

@app.route('/api/tags/<int:tag_id>', methods=['DELETE'])
def delete_tag(tag_id):
    """
    删除标签
    
    请求参数：
    - tag_id: 标签ID（URL参数）
    
    返回：
    - message: 删除成功消息
    """
    global _tag_cache

    logger.info(f"删除标签 - 标签ID: {tag_id}")

    conn = get_db_connection()
    cursor = conn.cursor()

    # 检查标签是否存在
    cursor.execute('SELECT * FROM tags WHERE id = %s', (tag_id,))
    tag = cursor.fetchone()
    
    if tag is None:
        conn.close()
        logger.warning(f"删除标签失败 - 标签ID: {tag_id} 不存在")
        return jsonify({'error': '标签不存在'}), 404

    tag_name = tag.get('name', '未知')
    
    # 删除标签
    cursor.execute('DELETE FROM tags WHERE id = %s', (tag_id,))
    _tag_cache = None
    conn.commit()
    conn.close()

    logger.info(f"删除标签成功 - 标签ID: {tag_id}, 标签名称: {tag_name}")
    return jsonify({'message': '标签删除成功'})

# ==================== 缓存管理API ====================

@app.route('/api/cache/refresh', methods=['POST'])
def refresh_cache():
    """
    手动刷新缓存
    
    返回：
    - message: 缓存刷新成功消息
    """
    global _tag_cache, _dish_tags_cache
    
    logger.info('手动刷新缓存')
    
    _tag_cache = None
    _dish_tags_cache = None
    get_tag_caches()
    
    logger.info('缓存刷新成功')
    return jsonify({'message': '缓存已刷新'})

# ==================== 应用启动 ====================

if __name__ == '__main__':
    logger.info('--------应用启动--------')
    app.run(host='0.0.0.0', port=15431, debug=False)