-- Flower Subscription Service Test Data
-- Punk rock test data - real shit for real testing

-- Test Users
INSERT INTO users (email, hashed_password, full_name, phone, telegram_id, role, is_active, is_verified, address, preferences, bonus_points) VALUES
('admin@flowerpunk.ru', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iQeO', 'Админ Панк', '+7-999-123-45-67', 'admin_punk', 'admin', true, true, 'Москва, ул. Панк-Рок, д. 1', '{"theme": "dark", "notifications": true}', 1000),
('courier@flowerpunk.ru', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iQeO', 'Курьер Металл', '+7-999-234-56-78', 'courier_metal', 'courier', true, true, 'Москва, ул. Доставки, д. 2', '{"vehicle": "bike", "area": "center"}', 500),
('user1@flowerpunk.ru', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iQeO', 'Иван Рокер', '+7-999-345-67-89', 'ivan_rocker', 'client', true, true, 'Москва, ул. Рок-н-Ролл, д. 3', '{"favorite_flowers": ["roses", "tulips"]}', 150),
('user2@flowerpunk.ru', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iQeO', 'Мария Панк', '+7-999-456-78-90', 'maria_punk', 'client', true, true, 'Москва, ул. Альтернатива, д. 4', '{"favorite_flowers": ["lilies", "orchids"]}', 75),
('user3@flowerpunk.ru', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iQeO', 'Алексей Металл', '+7-999-567-89-01', 'alex_metal', 'client', true, false, 'Москва, ул. Хеви-Метал, д. 5', '{"favorite_flowers": ["sunflowers"]}', 25);

-- Test Flowers
INSERT INTO flowers (name, description, category, price, image_url, is_available, is_seasonal, season_start, season_end, stock_quantity, min_order_quantity, max_order_quantity, meta_title, meta_description, tags, views_count, orders_count) VALUES
('Красные Розы', 'Классические красные розы - символ страсти и любви. Идеально для романтических моментов.', 'roses', 1500.00, 'https://images.unsplash.com/photo-1562690868-60bbe7293e94?w=400', true, false, NULL, NULL, 50, 1, 100, 'Красные розы - доставка цветов в Москве', 'Заказать красные розы с доставкой. Свежие цветы для любого случая.', '["красные", "розы", "романтика", "любовь"]', 1250, 89),
('Белые Тюльпаны', 'Нежные белые тюльпаны - символ чистоты и новых начинаний. Весеннее настроение круглый год.', 'tulips', 800.00, 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=400', true, true, '03-01', '05-31', 30, 1, 50, 'Белые тюльпаны - весенние цветы', 'Белые тюльпаны - символ весны и чистоты. Доставка по Москве.', '["белые", "тюльпаны", "весна", "чистота"]', 890, 45),
('Оранжевые Лилии', 'Яркие оранжевые лилии - энергия и позитив в каждом лепестке. Для тех, кто любит яркие краски.', 'lilies', 1200.00, 'https://images.unsplash.com/photo-1544943910-1b4b0b0b0b0b?w=400', true, false, NULL, NULL, 25, 1, 30, 'Оранжевые лилии - яркие цветы', 'Оранжевые лилии - символ энергии и позитива. Доставка цветов.', '["оранжевые", "лилии", "энергия", "позитив"]', 567, 23),
('Фиолетовые Орхидеи', 'Элегантные фиолетовые орхидеи - символ роскоши и изысканности. Для особых случаев.', 'orchids', 2500.00, 'https://images.unsplash.com/photo-1562690868-60bbe7293e94?w=400', true, false, NULL, NULL, 15, 1, 20, 'Фиолетовые орхидеи - элегантные цветы', 'Фиолетовые орхидеи - символ роскоши и изысканности. Премиум доставка.', '["фиолетовые", "орхидеи", "роскошь", "элегантность"]', 423, 12),
('Подсолнухи', 'Яркие подсолнухи - символ лета и позитива. Принесут солнечное настроение в любой дом.', 'sunflowers', 600.00, 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=400', true, true, '06-01', '09-30', 40, 1, 60, 'Подсолнухи - летние цветы', 'Подсолнухи - символ лета и позитива. Доставка по Москве.', '["подсолнухи", "лето", "позитив", "солнце"]', 678, 34),
('Ромашки', 'Нежные ромашки - символ простоты и чистоты. Идеально для создания уютной атмосферы.', 'daisies', 400.00, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', true, true, '05-01', '08-31', 60, 1, 80, 'Ромашки - нежные цветы', 'Ромашки - символ простоты и чистоты. Доставка цветов.', '["ромашки", "простота", "чистота", "уют"]', 445, 28),
('Гвоздики', 'Классические гвоздики - универсальный выбор для любого случая. Долго стоят и красиво выглядят.', 'carnations', 500.00, 'https://images.unsplash.com/photo-1562690868-60bbe7293e94?w=400', true, false, NULL, NULL, 35, 1, 70, 'Гвоздики - классические цветы', 'Гвоздики - универсальный выбор для любого случая. Доставка.', '["гвоздики", "классика", "универсальность"]', 334, 19),
('Розовые Розы', 'Нежные розовые розы - символ нежности и романтики. Идеально для признаний в любви.', 'roses', 1300.00, 'https://images.unsplash.com/photo-1562690868-60bbe7293e94?w=400', true, false, NULL, NULL, 30, 1, 50, 'Розовые розы - нежные цветы', 'Розовые розы - символ нежности и романтики. Доставка цветов.', '["розовые", "розы", "нежность", "романтика"]', 789, 56),
('Желтые Тюльпаны', 'Яркие желтые тюльпаны - символ радости и счастья. Принесут солнечное настроение.', 'tulips', 750.00, 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=400', true, true, '03-01', '05-31', 25, 1, 40, 'Желтые тюльпаны - яркие цветы', 'Желтые тюльпаны - символ радости и счастья. Доставка.', '["желтые", "тюльпаны", "радость", "счастье"]', 456, 31),
('Белые Лилии', 'Чистые белые лилии - символ чистоты и невинности. Идеально для торжественных случаев.', 'lilies', 1400.00, 'https://images.unsplash.com/photo-1544943910-1b4b0b0b0b0b?w=400', true, false, NULL, NULL, 20, 1, 25, 'Белые лилии - чистые цветы', 'Белые лилии - символ чистоты и невинности. Доставка цветов.', '["белые", "лилии", "чистота", "невинность"]', 345, 18);

-- Test Orders
INSERT INTO orders (user_id, status, total_amount, delivery_address, delivery_date, delivery_slot, payment_status, payment_method, notes, created_at) VALUES
(3, 'delivered', 1500.00, 'Москва, ул. Рок-н-Ролл, д. 3, кв. 15', '2024-01-15', 'afternoon', 'completed', 'card', 'Доставить до 18:00', '2024-01-14 10:30:00'),
(3, 'delivering', 2400.00, 'Москва, ул. Рок-н-Ролл, д. 3, кв. 15', '2024-01-16', 'morning', 'completed', 'card', 'Хрупкие цветы, аккуратно', '2024-01-15 14:20:00'),
(4, 'confirmed', 800.00, 'Москва, ул. Альтернатива, д. 4, кв. 8', '2024-01-17', 'evening', 'pending', 'cash', 'Позвонить за час', '2024-01-16 09:15:00'),
(4, 'preparing', 1200.00, 'Москва, ул. Альтернатива, д. 4, кв. 8', '2024-01-18', 'afternoon', 'completed', 'card', NULL, '2024-01-17 16:45:00'),
(5, 'pending', 600.00, 'Москва, ул. Хеви-Метал, д. 5, кв. 12', '2024-01-19', 'morning', 'pending', 'card', 'Доставить к 9:00', '2024-01-18 11:30:00');

-- Test Order Items
INSERT INTO order_items (order_id, flower_id, quantity, unit_price, total_price) VALUES
(1, 1, 1, 1500.00, 1500.00),
(2, 1, 1, 1500.00, 1500.00),
(2, 3, 1, 1200.00, 1200.00),
(3, 2, 1, 800.00, 800.00),
(4, 3, 1, 1200.00, 1200.00),
(5, 5, 1, 600.00, 600.00);

-- Test Subscriptions
INSERT INTO subscriptions (user_id, flower_id, frequency, quantity, delivery_address, is_active, next_delivery_date, total_deliveries, completed_deliveries, created_at) VALUES
(3, 1, 'weekly', 1, 'Москва, ул. Рок-н-Ролл, д. 3, кв. 15', true, '2024-01-22', 12, 3, '2024-01-01 10:00:00'),
(4, 2, 'every_other_day', 2, 'Москва, ул. Альтернатива, д. 4, кв. 8', true, '2024-01-18', 30, 8, '2024-01-01 12:00:00'),
(5, 5, 'daily', 1, 'Москва, ул. Хеви-Метал, д. 5, кв. 12', false, NULL, 7, 7, '2024-01-10 15:00:00');

-- Test Reviews
INSERT INTO reviews (user_id, flower_id, rating, comment, is_verified_purchase, created_at) VALUES
(3, 1, 5, 'Отличные розы! Свежие и красивые. Доставка вовремя.', true, '2024-01-15 18:30:00'),
(3, 3, 4, 'Красивые лилии, но немного дороговато.', true, '2024-01-16 19:15:00'),
(4, 2, 5, 'Тюльпаны просто прелесть! Буду заказывать еще.', true, '2024-01-15 20:00:00'),
(4, 4, 5, 'Орхидеи потрясающие! Элегантно и стильно.', true, '2024-01-14 16:45:00'),
(5, 5, 4, 'Подсолнухи яркие и позитивные. Рекомендую!', true, '2024-01-13 14:20:00');

-- Test Payments
INSERT INTO payments (order_id, amount, payment_method, status, transaction_id, payment_date, created_at) VALUES
(1, 1500.00, 'card', 'completed', 'txn_001', '2024-01-14 10:35:00', '2024-01-14 10:30:00'),
(2, 2400.00, 'card', 'completed', 'txn_002', '2024-01-15 14:25:00', '2024-01-15 14:20:00'),
(4, 1200.00, 'card', 'completed', 'txn_003', '2024-01-17 16:50:00', '2024-01-17 16:45:00');

-- Test Bonuses
INSERT INTO bonuses (user_id, amount, type, description, is_used, expires_at, created_at) VALUES
(3, 100, 'welcome', 'Приветственный бонус за регистрацию', false, '2024-02-14 23:59:59', '2024-01-14 10:30:00'),
(3, 50, 'order', 'Бонус за первый заказ', false, '2024-02-14 23:59:59', '2024-01-15 18:30:00'),
(4, 100, 'welcome', 'Приветственный бонус за регистрацию', false, '2024-02-15 23:59:59', '2024-01-15 20:00:00'),
(4, 25, 'review', 'Бонус за отзыв', false, '2024-02-15 23:59:59', '2024-01-15 20:00:00'),
(5, 100, 'welcome', 'Приветственный бонус за регистрацию', true, '2024-01-20 23:59:59', '2024-01-10 15:00:00');

-- Test Notifications
INSERT INTO notifications (user_id, title, message, type, is_read, created_at) VALUES
(3, 'Заказ доставлен', 'Ваш заказ #1 успешно доставлен. Спасибо за покупку!', 'order_delivered', false, '2024-01-15 18:00:00'),
(3, 'Новый заказ', 'Ваш заказ #2 принят в обработку. Ожидайте доставки.', 'order_confirmed', false, '2024-01-15 14:25:00'),
(4, 'Подписка активна', 'Ваша подписка на тюльпаны активна. Следующая доставка 18 января.', 'subscription_active', false, '2024-01-16 09:20:00'),
(5, 'Бонус истек', 'Ваш приветственный бонус истек. Используйте бонусы вовремя!', 'bonus_expired', false, '2024-01-20 23:59:59');

-- Update flower statistics based on orders
UPDATE flowers SET orders_count = 89 WHERE id = 1;
UPDATE flowers SET orders_count = 45 WHERE id = 2;
UPDATE flowers SET orders_count = 23 WHERE id = 3;
UPDATE flowers SET orders_count = 12 WHERE id = 4;
UPDATE flowers SET orders_count = 34 WHERE id = 5;
UPDATE flowers SET orders_count = 28 WHERE id = 6;
UPDATE flowers SET orders_count = 19 WHERE id = 7;
UPDATE flowers SET orders_count = 56 WHERE id = 8;
UPDATE flowers SET orders_count = 31 WHERE id = 9;
UPDATE flowers SET orders_count = 18 WHERE id = 10; 