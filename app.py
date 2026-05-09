from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import pymysql

app = Flask(__name__)
CORS(app)

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

DB_CONFIG = {
    'host': 'sh-cynosdbmysql-grp-d2dhhovq.sql.tencentcdb.com',
    'port': 23841,
    'user': 'menu',
    'password': 'menu.123',
    'db': 'room-d0gyj4jwe761aa259',
    'charset': 'utf8mb4',
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

def get_tag_caches():
    global _tag_cache, _dish_tags_cache
    if _tag_cache is None:
        _tag_cache = get_all_tags_cache()
    if _dish_tags_cache is None:
        _dish_tags_cache = get_dish_tags_mapping()
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
        query += ' AND (name LIKE %s OR description LIKE %s)'
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

@app.route('/api/dishes', methods=['POST'])
def create_dish():
    global _dish_tags_cache
    data = request.json

    required_fields = ['name', 'price']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'缺少必填字段: {field}'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        INSERT INTO dishes (name, price, image, description, detail_desc, method, ingredients, tags)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    ''', (
        data.get('name'),
        data.get('price'),
        data.get('image', ''),
        data.get('description', ''),
        data.get('detail_desc', ''),
        data.get('method', ''),
        data.get('ingredients', ''),
        data.get('tags', '')
    ))

    dish_id = cursor.lastrowid
    _dish_tags_cache = None
    conn.commit()
    conn.close()

    return jsonify({'id': dish_id, 'message': '菜品创建成功'}), 201

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

    cursor.execute('''
        UPDATE dishes
        SET name = %s, price = %s, image = %s, description = %s, detail_desc = %s, method = %s, ingredients = %s, tags = %s
        WHERE id = %s
    ''', (
        data.get('name'),
        data.get('price'),
        data.get('image', ''),
        data.get('description', ''),
        data.get('detail_desc', ''),
        data.get('method', ''),
        data.get('ingredients', ''),
        data.get('tags', ''),
        dish_id
    ))

    _dish_tags_cache = None
    conn.commit()
    conn.close()

    return jsonify({'message': '菜品更新成功'})

@app.route('/api/dishes/<int:dish_id>', methods=['DELETE'])
def delete_dish(dish_id):
    global _dish_tags_cache
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM dishes WHERE id = %s', (dish_id,))
    if cursor.fetchone() is None:
        conn.close()
        return jsonify({'error': '菜品不存在'}), 404

    cursor.execute('DELETE FROM dishes WHERE id = %s', (dish_id,))
    _dish_tags_cache = None
    conn.commit()
    conn.close()

    return jsonify({'message': '菜品删除成功'})

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
    app.run(debug=True, host='0.0.0.0', port=5000)