-- Seed de las 16 sedes del Mundial 2026. Idempotente (ON CONFLICT por nombre).
-- Superficie: FIFA exige césped natural en las 16. image_url se llena después
-- con el script de imágenes satelitales (ESRI → Supabase Storage).
-- Coordenadas para centrar la imagen satelital; verificar si alguna queda descuadrada.

INSERT INTO public.venues (name, city, country, capacity, surface, opened_year, latitude, longitude) VALUES
  ('Estadio Azteca',          'Ciudad de México',     'MEX', 80824, 'Césped natural', 1966, 19.302900, -99.150500),
  ('MetLife Stadium',         'East Rutherford, NJ',  'USA', 80663, 'Césped natural', 2010, 40.813500, -74.074500),
  ('AT&T Stadium',            'Arlington, TX',        'USA', 70649, 'Césped natural', 2009, 32.747300, -97.094500),
  ('SoFi Stadium',            'Inglewood, CA',        'USA', 70492, 'Césped natural', 2020, 33.953500, -118.339200),
  ('Arrowhead Stadium',       'Kansas City, MO',      'USA', 69045, 'Césped natural', 1972, 39.048900, -94.483900),
  ('Levi''s Stadium',         'Santa Clara, CA',      'USA', 68827, 'Césped natural', 2014, 37.403000, -121.969800),
  ('NRG Stadium',             'Houston, TX',          'USA', 68777, 'Césped natural', 2002, 29.684700, -95.410700),
  ('Lincoln Financial Field', 'Philadelphia, PA',     'USA', 68324, 'Césped natural', 2003, 39.900800, -75.167500),
  ('Mercedes-Benz Stadium',   'Atlanta, GA',          'USA', 68239, 'Césped natural', 2017, 33.755400, -84.400900),
  ('Lumen Field',             'Seattle, WA',          'USA', 66925, 'Césped natural', 2002, 47.595200, -122.331600),
  ('Hard Rock Stadium',       'Miami Gardens, FL',    'USA', 64478, 'Césped natural', 1987, 25.958000, -80.238900),
  ('Gillette Stadium',        'Foxborough, MA',       'USA', 64146, 'Césped natural', 2002, 42.090900, -71.264300),
  ('BC Place',                'Vancouver, BC',        'CAN', 52497, 'Césped natural', 1983, 49.276800, -123.111900),
  ('Estadio BBVA',            'Guadalupe, NL',        'MEX', 51243, 'Césped natural', 2015, 25.669200, -100.244700),
  ('Estadio Akron',           'Zapopan, JAL',         'MEX', 45664, 'Césped natural', 2010, 20.681900, -103.462500),
  ('BMO Field',               'Toronto, ON',          'CAN', 43036, 'Césped natural', 2007, 43.633200,  -79.418500)
ON CONFLICT (name) DO UPDATE SET
  city        = EXCLUDED.city,
  country     = EXCLUDED.country,
  capacity    = EXCLUDED.capacity,
  surface     = EXCLUDED.surface,
  opened_year = EXCLUDED.opened_year,
  latitude    = EXCLUDED.latitude,
  longitude   = EXCLUDED.longitude;
