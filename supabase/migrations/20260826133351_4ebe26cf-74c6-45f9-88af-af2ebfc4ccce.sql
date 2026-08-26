UPDATE public.recovery_strategies SET active = false;

INSERT INTO public.recovery_strategies (name, description, points, active, sort_order, icon) VALUES
('Masajes deportivos', 'Sesión de masaje descontracturante post-juego', 50, true, 1, '💆'),
('Sesión de yoga o stretching', 'Rutina completa de movilidad y elongación', 50, true, 2, '🧘'),
('Crioterapia en vestuario', 'Inmersión en frío de 5 minutos', 40, true, 3, '🧊'),
('Crioterapia de contraste', 'Frío/calor: 20" x 20" x 6 series', 40, true, 4, '🌡️'),
('Sesión de regeneración', 'Foam roll, bandas elásticas, etc. (40 minutos)', 30, true, 5, '🎯'),
('Bicicleta o piscina', 'Trabajo regenerativo suave de 20 minutos', 30, true, 6, '🚴'),
('Descanso adecuado', '8 horas de sueño', 20, true, 7, '😴'),
('Vendajes compresivos', 'Medias o vendas de compresión post-juego', 20, true, 8, '🦵'),
('Sin consumo de alcohol post juego', 'Cero alcohol durante las 12 hs posteriores', 20, true, 9, '🚫'),
('Shake proteico post-juego', 'Dentro de los 30 minutos posteriores al partido', 10, true, 10, '🥛'),
('Hidratación adecuada antes de dormir', '1 litro de agua u orina clara', 10, true, 11, '💧'),
('Crioterapia local postjuego', 'Hielo local de 5 a 10 minutos', 10, true, 12, '❄️'),
('1,5 lts de agua post-juego', 'Reposición de líquidos inmediata', 5, true, 13, '🚰'),
('Menos de 4 copas de bebida alcohólica', 'Consumo limitado post-juego', 5, true, 14, '🍺'),
('Desayuno proteico', 'Desayuno con proteínas el domingo', 5, true, 15, '🍳');