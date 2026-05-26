-- Seed: 5 товаров (по 1 на тип), 3 блог-поста, 6 gallery images
-- Картинки — placehold.co (заглушки). При наличии собственного CDN заменить.

-- =========================
-- products
-- =========================
insert into public.products
    (slug, name, description, type, price, color, stage_color, category, is_for_printing, image_url,
     editor_front_view, editor_back_view, editor_lsleeve_view, editor_rsleeve_view,
     shipping_weight, shipping_width, shipping_length, shipping_depth)
values
    ('classic-tee',         'Классическая футболка',  'Хлопковая футболка плотностью 180 г/м². Идеальна для печати DTG и DTF.',  'tshirt',     1400, 'Белый',         '#ffffff', 'Футболки',  true,
     'https://placehold.co/600x800/ffffff/333333.png?text=Classic+Tee',
     'https://placehold.co/600x800/ffffff/cccccc.png?text=Front',
     'https://placehold.co/600x800/ffffff/cccccc.png?text=Back',
     'https://placehold.co/600x800/ffffff/cccccc.png?text=Left+Sleeve',
     'https://placehold.co/600x800/ffffff/cccccc.png?text=Right+Sleeve',
     0.18, 30, 40, 1),

    ('oversize-hoodie',     'Худи оверсайз',          'Тёплое худи 320 г/м² с начёсом. Свободный крой, унисекс.',                'hoodie',     4900, 'Чёрный',        '#1a1a1a', 'Худи',      true,
     'https://placehold.co/600x800/1a1a1a/ffffff.png?text=Hoodie',
     'https://placehold.co/600x800/1a1a1a/666666.png?text=Front',
     'https://placehold.co/600x800/1a1a1a/666666.png?text=Back',
     'https://placehold.co/600x800/1a1a1a/666666.png?text=Left+Sleeve',
     'https://placehold.co/600x800/1a1a1a/666666.png?text=Right+Sleeve',
     0.65, 35, 50, 4),

    ('longsleeve-base',     'Лонгслив базовый',       'Длинный рукав, средняя плотность 220 г/м². Универсальный крой.',          'longsleeve', 2200, 'Серый',         '#9e9e9e', 'Лонгсливы', true,
     'https://placehold.co/600x800/9e9e9e/ffffff.png?text=Longsleeve',
     'https://placehold.co/600x800/9e9e9e/666666.png?text=Front',
     'https://placehold.co/600x800/9e9e9e/666666.png?text=Back',
     'https://placehold.co/600x800/9e9e9e/666666.png?text=Left+Sleeve',
     'https://placehold.co/600x800/9e9e9e/666666.png?text=Right+Sleeve',
     0.30, 32, 45, 2),

    ('sweatshirt-classic',  'Свитшот классический',   'Свитшот 280 г/м² с круглым вырезом. Подходит для DTF и вышивки.',         'sweatshirt', 3500, 'Бежевый',       '#d4c4a4', 'Свитшоты',  true,
     'https://placehold.co/600x800/d4c4a4/333333.png?text=Sweatshirt',
     'https://placehold.co/600x800/d4c4a4/666666.png?text=Front',
     'https://placehold.co/600x800/d4c4a4/666666.png?text=Back',
     'https://placehold.co/600x800/d4c4a4/666666.png?text=Left+Sleeve',
     'https://placehold.co/600x800/d4c4a4/666666.png?text=Right+Sleeve',
     0.50, 35, 48, 3),

    ('trucker-cap',         'Кепка тракер',           'Бейсболка-тракер с сетчатой задней частью. Регулируемая застёжка.',       'cap',        1800, 'Чёрный/Белый',  '#000000', 'Кепки',     true,
     'https://placehold.co/600x600/000000/ffffff.png?text=Trucker+Cap',
     'https://placehold.co/600x600/000000/666666.png?text=Front',
     'https://placehold.co/600x600/000000/666666.png?text=Back',
     '',
     '',
     0.12, 25, 25, 12);

-- =========================
-- product_sizes
-- =========================
insert into public.product_sizes (product_id, name, qty, sort_order)
select p.id, s.size_name, s.qty, s.sort_order
from public.products p
join (values
    ('classic-tee',        'S',  20, 0),
    ('classic-tee',        'M',  25, 1),
    ('classic-tee',        'L',  18, 2),
    ('classic-tee',        'XL', 10, 3),
    ('classic-tee',        'XXL', 5, 4),

    ('oversize-hoodie',    'M',  8, 0),
    ('oversize-hoodie',    'L',  10, 1),
    ('oversize-hoodie',    'XL', 7, 2),

    ('longsleeve-base',    'S',  12, 0),
    ('longsleeve-base',    'M',  14, 1),
    ('longsleeve-base',    'L',  10, 2),
    ('longsleeve-base',    'XL', 6, 3),

    ('sweatshirt-classic', 'S',  9, 0),
    ('sweatshirt-classic', 'M',  11, 1),
    ('sweatshirt-classic', 'L',  8, 2),
    ('sweatshirt-classic', 'XL', 5, 3),

    ('trucker-cap',        'One Size', 30, 0)
) as s(slug, size_name, qty, sort_order) on s.slug = p.slug;

-- =========================
-- product_gallery_photos
-- =========================
insert into public.product_gallery_photos (product_id, url, sort_order)
select p.id, g.url, g.sort_order
from public.products p
join (values
    ('classic-tee',        'https://placehold.co/800x1067/ffffff/333333.png?text=Tee+Photo+1', 0),
    ('classic-tee',        'https://placehold.co/800x1067/eeeeee/333333.png?text=Tee+Photo+2', 1),
    ('classic-tee',        'https://placehold.co/800x1067/dddddd/333333.png?text=Tee+Photo+3', 2),

    ('oversize-hoodie',    'https://placehold.co/800x1067/1a1a1a/ffffff.png?text=Hoodie+Photo+1', 0),
    ('oversize-hoodie',    'https://placehold.co/800x1067/2a2a2a/ffffff.png?text=Hoodie+Photo+2', 1),
    ('oversize-hoodie',    'https://placehold.co/800x1067/3a3a3a/ffffff.png?text=Hoodie+Photo+3', 2),

    ('longsleeve-base',    'https://placehold.co/800x1067/9e9e9e/ffffff.png?text=Longsleeve+Photo+1', 0),
    ('longsleeve-base',    'https://placehold.co/800x1067/aeaeae/ffffff.png?text=Longsleeve+Photo+2', 1),

    ('sweatshirt-classic', 'https://placehold.co/800x1067/d4c4a4/333333.png?text=Sweatshirt+Photo+1', 0),
    ('sweatshirt-classic', 'https://placehold.co/800x1067/c4b494/333333.png?text=Sweatshirt+Photo+2', 1),

    ('trucker-cap',        'https://placehold.co/800x800/000000/ffffff.png?text=Cap+Photo+1', 0),
    ('trucker-cap',        'https://placehold.co/800x800/202020/ffffff.png?text=Cap+Photo+2', 1)
) as g(slug, url, sort_order) on g.slug = p.slug;

-- =========================
-- blog_posts
-- =========================
insert into public.blog_posts (slug, title, subtitle, cover, author, hashtags, body_html, created_at)
values
    ('kak-pechatat-dtf',
     'Что такое DTF и почему этот метод подходит для малых тиражей',
     'Гид по технологии прямой плёночной печати',
     'https://placehold.co/1200x630/1a1a1a/ffffff.png?text=DTF+Print',
     'PNHD STUDIO',
     '{печать,DTF,гайд}',
     '<p>DTF (Direct To Film) — метод печати, при котором изображение сначала наносится на плёнку, а затем переносится на ткань под прессом.</p><p>Главное преимущество — отсутствие минимального тиража. Можно напечатать один экземпляр без потери качества и без необходимости делать трафарет.</p><h2>Когда подходит DTF</h2><ul><li>Малые тиражи от 1 шт.</li><li>Сложные многоцветные принты с градиентами</li><li>Тёмные ткани — белая подложка перекрывает основу</li></ul>',
     now() - interval '3 days'),

    ('vidy-textilya',
     'Виды текстиля для печати: гид по плотности и составу',
     'Что выбрать под мерч, корпоративную одежду или подарки',
     'https://placehold.co/1200x630/d4c4a4/333333.png?text=Textile+Guide',
     'PNHD STUDIO',
     '{ткань,текстиль,мерч}',
     '<p>Плотность ткани влияет на ощущение и долговечность изделия. Базовое правило:</p><ul><li>140-160 г/м² — летние футболки</li><li>180-220 г/м² — стандартные футболки и лонгсливы</li><li>280-340 г/м² — свитшоты, худи</li></ul><p>Состав: 100% хлопок даёт мягкость и хорошую печать, но мнётся. Смесь хлопка с эластаном (5-10%) держит форму, рекомендуется для облегающего кроя.</p>',
     now() - interval '10 days'),

    ('svoy-merch-s-nulya',
     'Как запустить свой мерч с нуля: от идеи до первого тиража',
     'Чек-лист на 7 шагов для брендов и стартапов',
     'https://placehold.co/1200x630/9e9e9e/ffffff.png?text=Merch+From+Zero',
     'PNHD STUDIO',
     '{мерч,маркетинг,бизнес}',
     '<p>Мерч — это инструмент, который работает на узнаваемость бренда и лояльность аудитории. Чтобы запуск окупился, важно пройти все шаги по порядку.</p><ol><li>Сформулировать цель (продажа, подарок партнёрам, программа лояльности)</li><li>Определить аудиторию и контекст ношения</li><li>Подобрать ассортимент (1-3 артикула на старте)</li><li>Разработать дизайн с учётом технологии печати</li><li>Сделать пилотный тираж 10-30 шт.</li><li>Собрать обратную связь</li><li>Масштабировать или итерировать</li></ol>',
     now() - interval '20 days');

-- =========================
-- gallery_images (готовые принты для конструктора)
-- =========================
insert into public.gallery_images (src, alt, sort_order) values
    ('https://placehold.co/600x600/ff6b6b/ffffff.png?text=Print+1', 'Принт 1', 0),
    ('https://placehold.co/600x600/4ecdc4/ffffff.png?text=Print+2', 'Принт 2', 1),
    ('https://placehold.co/600x600/ffe66d/333333.png?text=Print+3', 'Принт 3', 2),
    ('https://placehold.co/600x600/95e1d3/333333.png?text=Print+4', 'Принт 4', 3),
    ('https://placehold.co/600x600/f38181/ffffff.png?text=Print+5', 'Принт 5', 4),
    ('https://placehold.co/600x600/aa96da/ffffff.png?text=Print+6', 'Принт 6', 5);
