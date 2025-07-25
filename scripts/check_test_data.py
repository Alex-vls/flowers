#!/usr/bin/env python3
"""
FlowerPunk Test Data Checker
Проверяет наличие всех тестовых данных в базе
"""

import psycopg2
import os
from datetime import datetime

# Database connection settings
DB_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', 'localhost'),
    'port': os.getenv('POSTGRES_PORT', '5432'),
    'database': os.getenv('POSTGRES_DB', 'flower_db'),
    'user': os.getenv('POSTGRES_USER', 'flower_user'),
    'password': os.getenv('POSTGRES_PASSWORD', 'flower_password')
}

def connect_db():
    """Подключение к базе данных"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print(f"❌ Ошибка подключения к базе данных: {e}")
        return None

def check_table_data(conn, table_name, expected_count=None):
    """Проверка данных в таблице"""
    try:
        cursor = conn.cursor()
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]
        
        status = "✅" if count > 0 else "❌"
        if expected_count:
            status = "✅" if count >= expected_count else "⚠️"
        
        print(f"{status} {table_name}: {count} записей")
        
        # Показать несколько примеров
        if count > 0:
            cursor.execute(f"SELECT * FROM {table_name} LIMIT 3")
            rows = cursor.fetchall()
            for i, row in enumerate(rows, 1):
                print(f"   Пример {i}: {row[:3]}...")  # Показать первые 3 поля
        
        cursor.close()
        return count
        
    except Exception as e:
        print(f"❌ Ошибка проверки таблицы {table_name}: {e}")
        return 0

def check_flowers_data(conn):
    """Проверка данных цветов"""
    print("\n🌹 Проверка цветов:")
    try:
        cursor = conn.cursor()
        
        # Общее количество
        cursor.execute("SELECT COUNT(*) FROM flowers")
        total = cursor.fetchone()[0]
        print(f"✅ Всего цветов: {total}")
        
        # По категориям
        cursor.execute("""
            SELECT category, COUNT(*) 
            FROM flowers 
            GROUP BY category 
            ORDER BY COUNT(*) DESC
        """)
        categories = cursor.fetchall()
        print("📊 По категориям:")
        for category, count in categories:
            print(f"   {category}: {count}")
        
        # Доступные цветы
        cursor.execute("SELECT COUNT(*) FROM flowers WHERE is_available = true")
        available = cursor.fetchone()[0]
        print(f"✅ Доступных цветов: {available}")
        
        # Сезонные цветы
        cursor.execute("SELECT COUNT(*) FROM flowers WHERE is_seasonal = true")
        seasonal = cursor.fetchone()[0]
        print(f"🌱 Сезонных цветов: {seasonal}")
        
        # Ценовой диапазон
        cursor.execute("SELECT MIN(price), MAX(price), AVG(price) FROM flowers")
        min_price, max_price, avg_price = cursor.fetchone()
        print(f"💰 Цены: {min_price}₽ - {max_price}₽ (средняя: {avg_price:.0f}₽)")
        
        cursor.close()
        
    except Exception as e:
        print(f"❌ Ошибка проверки цветов: {e}")

def check_users_data(conn):
    """Проверка данных пользователей"""
    print("\n👥 Проверка пользователей:")
    try:
        cursor = conn.cursor()
        
        # Общее количество
        cursor.execute("SELECT COUNT(*) FROM users")
        total = cursor.fetchone()[0]
        print(f"✅ Всего пользователей: {total}")
        
        # По ролям
        cursor.execute("""
            SELECT role, COUNT(*) 
            FROM users 
            GROUP BY role 
            ORDER BY COUNT(*) DESC
        """)
        roles = cursor.fetchall()
        print("📊 По ролям:")
        for role, count in roles:
            print(f"   {role}: {count}")
        
        # Активные пользователи
        cursor.execute("SELECT COUNT(*) FROM users WHERE is_active = true")
        active = cursor.fetchone()[0]
        print(f"✅ Активных пользователей: {active}")
        
        # Верифицированные пользователи
        cursor.execute("SELECT COUNT(*) FROM users WHERE is_verified = true")
        verified = cursor.fetchone()[0]
        print(f"✅ Верифицированных пользователей: {verified}")
        
        # Бонусные баллы
        cursor.execute("SELECT SUM(bonus_points) FROM users")
        total_bonus = cursor.fetchone()[0]
        print(f"🎁 Всего бонусных баллов: {total_bonus}")
        
        cursor.close()
        
    except Exception as e:
        print(f"❌ Ошибка проверки пользователей: {e}")

def check_orders_data(conn):
    """Проверка данных заказов"""
    print("\n📦 Проверка заказов:")
    try:
        cursor = conn.cursor()
        
        # Общее количество
        cursor.execute("SELECT COUNT(*) FROM orders")
        total = cursor.fetchone()[0]
        print(f"✅ Всего заказов: {total}")
        
        # По статусам
        cursor.execute("""
            SELECT status, COUNT(*) 
            FROM orders 
            GROUP BY status 
            ORDER BY COUNT(*) DESC
        """)
        statuses = cursor.fetchall()
        print("📊 По статусам:")
        for status, count in statuses:
            print(f"   {status}: {count}")
        
        # По способам оплаты
        cursor.execute("""
            SELECT payment_method, COUNT(*) 
            FROM orders 
            GROUP BY payment_method 
            ORDER BY COUNT(*) DESC
        """)
        payments = cursor.fetchall()
        print("💳 По способам оплаты:")
        for method, count in payments:
            print(f"   {method}: {count}")
        
        # Общая сумма заказов
        cursor.execute("SELECT SUM(total_amount) FROM orders")
        total_amount = cursor.fetchone()[0]
        print(f"💰 Общая сумма заказов: {total_amount}₽")
        
        cursor.close()
        
    except Exception as e:
        print(f"❌ Ошибка проверки заказов: {e}")

def check_schema_org_endpoints():
    """Проверка Schema.org endpoints"""
    print("\n🔍 Проверка Schema.org endpoints:")
    
    import requests
    
    base_url = "http://localhost:8000"
    endpoints = [
        "/sitemap.xml",
        "/robots.txt",
        "/structured-data/homepage",
        "/structured-data/catalog"
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{base_url}{endpoint}", timeout=5)
            if response.status_code == 200:
                print(f"✅ {endpoint} - OK")
            else:
                print(f"❌ {endpoint} - HTTP {response.status_code}")
        except Exception as e:
            print(f"❌ {endpoint} - Ошибка: {e}")

def main():
    """Основная функция"""
    print("🎸 FlowerPunk Test Data Checker")
    print("=" * 50)
    print(f"Время проверки: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Подключение к базе
    conn = connect_db()
    if not conn:
        return
    
    try:
        # Проверка основных таблиц
        print("\n📋 Проверка основных таблиц:")
        check_table_data(conn, "users", 8)
        check_table_data(conn, "flowers", 15)
        check_table_data(conn, "orders", 10)
        check_table_data(conn, "order_items", 10)
        check_table_data(conn, "subscriptions", 6)
        check_table_data(conn, "reviews", 10)
        check_table_data(conn, "payments", 6)
        check_table_data(conn, "bonuses", 8)
        check_table_data(conn, "notifications", 9)
        
        # Детальная проверка
        check_flowers_data(conn)
        check_users_data(conn)
        check_orders_data(conn)
        
        # Проверка Schema.org endpoints
        check_schema_org_endpoints()
        
        print("\n🎉 Проверка завершена!")
        
    except Exception as e:
        print(f"❌ Ошибка во время проверки: {e}")
    
    finally:
        conn.close()

if __name__ == "__main__":
    main() 