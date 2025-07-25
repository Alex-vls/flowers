-- Additional Test Data for FlowerPunk
-- More punk rock data for comprehensive testing

-- Additional Flowers for more variety
INSERT INTO flowers (name, description, category, price, image_url, is_available, is_seasonal, season_start, season_end, stock_quantity, min_order_quantity, max_order_quantity, meta_title, meta_description, tags, views_count, orders_count) VALUES
('Черные Розы', 'Эксклюзивные черные розы - символ элегантности и загадочности. Для особых случаев.', 'roses', 3000.00, 'https://images.unsplash.com/photo-1562690868-60bbe7293e94?w=400', true, false, NULL, NULL, 10, 1, 20, 'Черные розы - эксклюзивные цветы', 'Эксклюзивные черные розы - символ элегантности. Премиум доставка.', '["черные", "розы", "эксклюзив", "элегантность"]', 234, 8),
('Синие Орхидеи', 'Редкие синие орхидеи - уникальный подарок для особых людей.', 'orchids', 3500.00, 'https://images.unsplash.com/photo-1562690868-60bbe7293e94?w=400', true, false, NULL, NULL, 5, 1, 10, 'Синие орхидеи - редкие цветы', 'Редкие синие орхидеи - уникальный подарок. Эксклюзивная доставка.', '["синие", "орхидеи", "редкие", "уникальные"]', 156, 3),
('Мимозы', 'Яркие мимозы - символ весны и женственности. Идеально для 8 марта.', 'other', 700.00, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', true, true, '02-01', '04-30', 80, 1, 100, 'Мимозы - весенние цветы', 'Мимозы - символ весны и женственности. Доставка к 8 марта.', '["мимозы", "весна", "8 марта", "женственность"]', 892, 67),
('Пионы', 'Пышные пионы - символ роскоши и изобилия. Для торжественных случаев.', 'other', 1800.00, 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=400', true, true, '05-01', '07-31', 25, 1, 30, 'Пионы - роскошные цветы', 'Пышные пионы - символ роскоши и изобилия. Доставка цветов.', '["пионы", "роскошь", "изобилие", "торжество"]', 445, 29),
('Хризантемы', 'Классические хризантемы - долго стоят и красиво выглядят.', 'other', 600.00, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', true, false, NULL, NULL, 45, 1, 60, 'Хризантемы - классические цветы', 'Классические хризантемы - долго стоят и красиво выглядят.', '["хризантемы", "классика", "долговечность"]', 334, 22);

-- Additional Users for testing different scenarios
INSERT INTO users (email, hashed_password, full_name, phone, telegram_id, role, is_active, is_verified, address, preferences, bonus_points) VALUES
('vip@flowerpunk.ru', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iQeO', 'VIP Клиент', '+7-999-999-99-99', 'vip_client', 'client', true, true, 'Москва, ул. VIP, д. 1, кв. 100', '{"vip": true, "premium_delivery": true}', 5000),
('test@flowerpunk.ru', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iQeO', 'Тестовый Пользователь', '+7-999-000-00-00', 'test_user', 'client', true, false, 'Москва, ул. Тестовая, д. 1', '{"test": true}', 0),
('inactive@flowerpunk.ru', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iQeO', 'Неактивный Пользователь', '+7-999-111-11-11', 'inactive_user', 'client', false, true, 'Москва, ул. Неактивная, д. 1', '{}', 0);

-- Additional Orders for comprehensive testing
INSERT INTO orders (user_id, status, total_amount, delivery_address, delivery_date, delivery_slot, payment_status, payment_method, notes, created_at) VALUES
(6, 'delivered', 3000.00, 'Москва, ул. VIP, д. 1, кв. 100', '2024-01-20', 'morning', 'completed', 'card', 'VIP доставка, особое внимание', '2024-01-19 09:00:00'),
(6, 'preparing', 1800.00, 'Москва, ул. VIP, д. 1, кв. 100', '2024-01-21', 'afternoon', 'completed', 'card', 'Пионы должны быть свежими', '2024-01-20 15:30:00'),
(7, 'pending', 700.00, 'Москва, ул. Тестовая, д. 1', '2024-01-22', 'evening', 'pending', 'cash', 'Тестовый заказ', '2024-01-21 12:00:00'),
(3, 'cancelled', 1200.00, 'Москва, ул. Рок-н-Ролл, д. 3, кв. 15', '2024-01-23', 'morning', 'refunded', 'card', 'Отменен клиентом', '2024-01-22 10:00:00'),
(4, 'delivering', 2500.00, 'Москва, ул. Альтернатива, д. 4, кв. 8', '2024-01-24', 'afternoon', 'completed', 'card', 'Доставить к 15:00', '2024-01-23 14:00:00');

-- Additional Order Items
INSERT INTO order_items (order_id, flower_id, quantity, unit_price, total_price) VALUES
(6, 11, 1, 3000.00, 3000.00),
(7, 14, 1, 1800.00, 1800.00),
(8, 13, 1, 700.00, 700.00),
(9, 3, 1, 1200.00, 1200.00),
(10, 4, 1, 2500.00, 2500.00);

-- Additional Subscriptions
INSERT INTO subscriptions (user_id, flower_id, frequency, quantity, delivery_address, is_active, next_delivery_date, total_deliveries, completed_deliveries, created_at) VALUES
(6, 11, 'weekly', 1, 'Москва, ул. VIP, д. 1, кв. 100', true, '2024-01-29', 52, 4, '2024-01-01 09:00:00'),
(6, 12, 'monthly', 2, 'Москва, ул. VIP, д. 1, кв. 100', true, '2024-02-01', 12, 1, '2024-01-01 10:00:00'),
(7, 13, 'daily', 1, 'Москва, ул. Тестовая, д. 1', false, NULL, 3, 3, '2024-01-15 12:00:00');

-- Additional Reviews
INSERT INTO reviews (user_id, flower_id, rating, comment, is_verified_purchase, created_at) VALUES
(6, 11, 5, 'Черные розы потрясающие! VIP качество.', true, '2024-01-20 20:00:00'),
(6, 14, 5, 'Пионы просто великолепны! Буду заказывать еще.', true, '2024-01-21 18:30:00'),
(7, 13, 4, 'Мимозы хорошие, но немного дороговато.', true, '2024-01-22 16:45:00'),
(3, 12, 5, 'Синие орхидеи - мечта! Очень доволен.', true, '2024-01-23 14:20:00'),
(4, 15, 4, 'Хризантемы долго стоят, рекомендую.', true, '2024-01-24 12:10:00');

-- Additional Payments
INSERT INTO payments (order_id, amount, payment_method, status, transaction_id, payment_date, created_at) VALUES
(6, 3000.00, 'card', 'completed', 'txn_004', '2024-01-19 09:05:00', '2024-01-19 09:00:00'),
(7, 1800.00, 'card', 'completed', 'txn_005', '2024-01-20 15:35:00', '2024-01-20 15:30:00'),
(10, 2500.00, 'card', 'completed', 'txn_006', '2024-01-23 14:05:00', '2024-01-23 14:00:00');

-- Additional Bonuses
INSERT INTO bonuses (user_id, amount, type, description, is_used, expires_at, created_at) VALUES
(6, 500, 'vip', 'VIP бонус за крупный заказ', false, '2024-03-19 23:59:59', '2024-01-19 09:05:00'),
(6, 200, 'subscription', 'Бонус за подписку', false, '2024-03-20 23:59:59', '2024-01-20 15:35:00'),
(7, 50, 'welcome', 'Приветственный бонус', false, '2024-02-21 23:59:59', '2024-01-21 12:00:00');

-- Additional Notifications
INSERT INTO notifications (user_id, title, message, type, is_read, created_at) VALUES
(6, 'VIP заказ доставлен', 'Ваш VIP заказ #6 успешно доставлен. Спасибо за доверие!', 'order_delivered', false, '2024-01-20 09:00:00'),
(6, 'Новая подписка', 'Ваша подписка на черные розы активна. Следующая доставка 29 января.', 'subscription_active', false, '2024-01-20 15:35:00'),
(7, 'Тестовый заказ', 'Ваш тестовый заказ принят в обработку.', 'order_confirmed', false, '2024-01-21 12:05:00'),
(3, 'Заказ отменен', 'Ваш заказ #9 был отменен. Возврат средств произведен.', 'order_cancelled', false, '2024-01-22 10:30:00'),
(4, 'Заказ в пути', 'Ваш заказ #10 доставляется. Ожидайте курьера.', 'order_delivering', false, '2024-01-24 14:30:00');

-- Update flower statistics
UPDATE flowers SET orders_count = 8 WHERE id = 11;
UPDATE flowers SET orders_count = 3 WHERE id = 12;
UPDATE flowers SET orders_count = 67 WHERE id = 13;
UPDATE flowers SET orders_count = 29 WHERE id = 14;
UPDATE flowers SET orders_count = 22 WHERE id = 15; 