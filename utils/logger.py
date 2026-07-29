"""
@file logger.py
@description 日志配置模块
@version 1.0.0

功能：
1. 配置日志系统
2. 创建按日期命名的日志文件
3. 提供日志记录器实例
"""

from datetime import date
import logging
import os

today = date.today()

if not os.path.exists('./logs'):
    os.makedirs('./logs')

def log_config():
    """
    配置并返回日志记录器
    返回：配置完成的logging.Logger实例
    """
    logs = logging.getLogger('app')
    logs.setLevel(logging.DEBUG)
    # 创建文件处理器
    if logs.handlers:
        return logs
    file_handler = logging.FileHandler(filename=f'./logs/Log{today}.log', 
    mode='a',
    encoding='utf-8')
    # 设定日志格式
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')

    # 将日志格式绑定到文件处理器
    file_handler.setFormatter(formatter)
      
    # 将文件处理器添加到logs中
    logs.addHandler(file_handler)

    logs.info('')
    logs.info('----日志配置完成----')
    logs.info('')
    return logs
