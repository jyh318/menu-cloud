from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import pymysql
import os
from dotenv import load_dotenv

app = Flask(__name__)
CORS(app)

load_dotenv()

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

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
    return pymysql.connect(**DB_CONFIG)

def get_all_tags_cache():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT name, background_color, text_color FROM tags')
    tags = cursor.fetchall()
    conn.close()
    return {tag['name']: {'background_color': tag['background_color'], 'text_color': tag['text_color']} for tag in tags}

def get_dish_tags_mapping():
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
        print(f"Error getting dish tags mapping: {e}")
        conn.close()
        return {}

_tag_cache = None
_dish_tags_cache = None
_cache_timestamp = 0

# 缓存过期时间，单位秒
CACHE_EXPIRE_SECONDS = 30

def get_tag_caches():
    global _tag_cache, _dish_tags_cache, _cache_timestamp
    import time
    current_time = time.time()
    if _tag_cache is None or (current_time - _cache_timestamp) > CACHE_EXPIRE_SECONDS:
        _tag_cache = get_all_tags_cache()
        _dish_tags_cache = get_dish_tags_mapping()
        _cache_timestamp = current_time
        Time = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(current_time))
        print(f"缓存刷新: {Time}")
    return _tag_cache, _dish_tags_cache

@app.route('/api/dishes', methods=['GET'])
def get_dishes():
    tag_filter = request.args.get('tag')
    search = request.args.get('search')
    page = request.args.get('page', 0, type=int)
    page_size = request.args.get('page_size', 12, type=int)

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

    default_tag_map = {
        '宫保鸡丁': ['川菜', '辣'], '鱼香肉丝': ['川菜', '辣'], '麻婆豆腐': ['川菜', '辣'], '糖醋排骨': ['鲁菜', '甜'],
    }

    for dish in all_dishes:
        dish_id = dish['id']
        tags = []
        
        if 'detail_description' in dish and dish['detail_description']:
            dish['detail_desc'] = dish['detail_description']
        if 'method_desc' in dish and dish['method_desc']:
            dish['method'] = dish['method_desc']
        if 'ingredients_desc' in dish and dish['ingredients_desc']:
            dish['ingredients'] = dish['ingredients_desc']

        if dish_id in dish_tags_map:
            tags = dish_tags_map[dish_id]
        else:
            dish_tags_str = dish.get('tags', '')
            if dish_tags_str:
                for tag_name in dish_tags_str.split(','):
                    tag_name = tag_name.strip()
                    if tag_name and tag_name in tag_cache:
                        tags.append({'name': tag_name, 'background_color': tag_cache[tag_name]['background_color'], 'text_color': tag_cache[tag_name]['text_color']})

        if not tags:
            tag_list = default_tag_map.get(dish.get('name', ''), ['家常菜'])
            for tag_name in tag_list:
                if tag_name in tag_cache:
                    tags.append({'name': tag_name, 'background_color': tag_cache[tag_name]['background_color'], 'text_color': tag_cache[tag_name]['text_color']})
                else:
                    tags.append({'name': tag_name, 'background_color': '#7A77B9', 'text_color': 'white'})

        dish['tags'] = ','.join([tag['name'] for tag in tags])
        dish['tag_details'] = tags

    if tag_filter:
        all_dishes = [dish for dish in all_dishes if tag_filter in dish['tags']]

    total = len(all_dishes)
    start = page * page_size
    end = start + page_size
    dishes = all_dishes[start:end]

    return jsonify({
        'dishes': dishes,
        'total': total,
        'page': page,
        'page_size': page_size,
        'has_more': end < total
    })

@app.route('/api/dishes/<int:dish_id>', methods=['GET'])
def get_dish(dish_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM dishes WHERE id = %s', (dish_id,))
    dish = cursor.fetchone()
    conn.close()

    if dish is None:
        return jsonify({'error': '菜品不存在'}), 404

    dish = dict(dish)
    if 'detail_description' in dish and dish['detail_description']:
        dish['detail_desc'] = dish['detail_description']
    if 'method_desc' in dish and dish['method_desc']:
        dish['method'] = dish['method_desc']
    if 'ingredients_desc' in dish and dish['ingredients_desc']:
        dish['ingredients'] = dish['ingredients_desc']
    
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

    return jsonify(dish)

@app.route('/api/dishes/<int:dish_id>', methods=['PUT'])
def update_dish(dish_id):
    global _dish_tags_cache
    data = request.json

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM dishes WHERE id = %s', (dish_id,))
    if cursor.fetchone() is None:
        conn.close()
        return jsonify({'error': '菜品不存在'}), 404

    cursor.execute('DESCRIBE dishes')
    dish_fields = [f['Field'] for f in cursor.fetchall()]
    
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

    if update_fields:
        sql = f"UPDATE dishes SET {', '.join(update_fields)} WHERE id = %s"
        update_values.append(dish_id)
        cursor.execute(sql, tuple(update_values))

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
                    cursor.execute(f'DELETE FROM taglink WHERE {dish_field} = %s', (dish_id,))
                    print(f"删除菜品 {dish_id} 的所有标签关联")
                    cursor.execute('SELECT id, name FROM tags')
                    all_tags_in_db = cursor.fetchall()
                    tag_id_map = {tag['name']: tag['id'] for tag in all_tags_in_db}
                    
                    for tag_name in new_tags_set:
                        if tag_name in tag_id_map:
                            tag_id = tag_id_map[tag_name]
                            cursor.execute(f'INSERT INTO taglink ({dish_field}, {tag_field}) VALUES (%s, %s)', (dish_id, tag_id))
                    
                    print(f"菜品 {dish_id} 标签已更新，同步操作 taglink 表")
    except Exception as e:
        print(f"更新 taglink 失败: {e}")

    if tags_changed:
        _tag_cache = None
        _dish_tags_cache = None
    
    conn.commit()
    conn.close()

    return jsonify({'message': '更新成功'})

@app.route('/api/dishes/<int:dish_id>', methods=['DELETE'])
def delete_dish(dish_id):
    global _dish_tags_cache
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM dishes WHERE id = %s', (dish_id,))
    if cursor.fetchone() is None:
        conn.close()
        return jsonify({'error': '菜品不存在'}), 404

    cursor.execute('DELETE FROM taglink WHERE dish_id = %s', (dish_id,))
    cursor.execute('DELETE FROM dishes WHERE id = %s', (dish_id,))
    _dish_tags_cache = None
    conn.commit()
    conn.close()

    return jsonify({'message': '删除成功'})

@app.route('/api/tags', methods=['GET'])
def get_tags():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM tags ORDER BY name')
    tags = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(tags)

@app.route('/api/tags', methods=['POST'])
def create_tag():
    global _tag_cache
    data = request.json

    if 'name' not in data:
        return jsonify({'error': '标签名称不能为空'}), 400

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

        return jsonify({'id': tag_id, 'message': '标签创建成功'}), 201
    except pymysql.IntegrityError:
        conn.close()
        return jsonify({'error': '标签已存在'}), 400

@app.route('/api/tags/<int:tag_id>', methods=['DELETE'])
def delete_tag(tag_id):
    global _tag_cache
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM tags WHERE id = %s', (tag_id,))
    if cursor.fetchone() is None:
        conn.close()
        return jsonify({'error': '标签不存在'}), 404

    cursor.execute('DELETE FROM tags WHERE id = %s', (tag_id,))
    _tag_cache = None
    conn.commit()
    conn.close()

    return jsonify({'message': '标签删除成功'})

@app.route('/api/cache/refresh', methods=['POST'])
def refresh_cache():
    global _tag_cache, _dish_tags_cache
    _tag_cache = None
    _dish_tags_cache = None
    get_tag_caches()
    return jsonify({'message': '缓存已刷新'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)