-- ============================================================
-- 每日推荐菜品表
-- ============================================================
-- @file   config/daily_recommend.sql
-- @description 用于存储每日推荐菜品，支持日期范围或特定日期
-- @version 2.0.0
-- @author  Menu Cloud Team
-- @date    2026-07-26
--
-- v2.0.0 变更说明：
-- 1. 新增 state 字段：0=停用（历史记录），1=启用（最新生效）
-- 2. 每次推荐变更时，业务层会先把当日所有记录 state=0
-- 3. 新的推荐 state=1（保证只有最新一条生效）
-- 4. 读取时筛选：日期=今日 + state=1，按 updated_at 倒序取首条
-- ============================================================

-- 创建每日推荐表
CREATE TABLE IF NOT EXISTS `daily_recommend` (
    `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `recommend_date` DATE NOT NULL COMMENT '推荐日期 (YYYY-MM-DD)',
    `dish_id` INT NOT NULL COMMENT '关联菜品ID (dishes.id)',
    `state` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0=停用（历史）, 1=启用（生效）',
    `set_by` VARCHAR(50) DEFAULT NULL COMMENT '设置人（管理员用户名）',
    `note` VARCHAR(255) DEFAULT NULL COMMENT '备注说明',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_dish_id` (`dish_id`),
    KEY `idx_date_state` (`recommend_date`, `state`),
    KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每日推荐菜品表';

-- ============================================================
-- 索引说明
-- ============================================================
-- 1. PRIMARY KEY (id): 主键
-- 2. KEY idx_dish_id (dish_id): 加快菜品ID查询
-- 3. KEY idx_date_state (recommend_date, state): 组合索引，加速当日生效推荐查询
-- 4. KEY idx_updated_at (updated_at): 更新时间倒序排序
-- ============================================================

-- ============================================================
-- 数据迁移（如已有 v1 表，使用下面的 ALTER 添加 state 列）
-- ============================================================
-- ALTER TABLE `daily_recommend`
--     ADD COLUMN `state` TINYINT NOT NULL DEFAULT 1
--     COMMENT '状态：0=停用, 1=启用' AFTER `dish_id`,
--     ADD INDEX `idx_date_state` (`recommend_date`, `state`),
--     ADD INDEX `idx_updated_at` (`updated_at`);

-- ============================================================
-- 验证查询（部署后可用）
-- ============================================================
-- 查询所有每日推荐记录：
-- SELECT dr.id, dr.recommend_date, dr.dish_id, dr.state, d.name,
--        dr.set_by, dr.created_at, dr.updated_at
-- FROM daily_recommend dr
-- LEFT JOIN dishes d ON dr.dish_id = d.id
-- ORDER BY dr.recommend_date DESC, dr.state DESC, dr.updated_at DESC;

-- 查询今日生效推荐（多版本时取最新）：
-- SELECT dr.*, d.name, d.image, d.price
-- FROM daily_recommend dr
-- LEFT JOIN dishes d ON dr.dish_id = d.id
-- WHERE dr.recommend_date = CURDATE() AND dr.state = 1
-- ORDER BY dr.updated_at DESC
-- LIMIT 1;

-- ============================================================
-- 数据示例（可选，用于测试）
-- ============================================================
-- INSERT INTO daily_recommend (recommend_date, dish_id, state, set_by, note)
-- VALUES (CURDATE(), 1, 1, 'admin', '今日精选');
