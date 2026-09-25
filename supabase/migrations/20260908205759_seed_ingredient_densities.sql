-- Densitet för frö-ingredienser: gram per milliliter.
--
-- Låter en ingrediens mätas i den andra dimensionen — gram på en volym-vara
-- eller dl på en vikt-vara. NULL = bara den egna dimensionens enheter erbjuds.
-- Konverteringen görs av trg_*_amount_base, som avvisar tvärmått när densitet
-- saknas i stället för att gissa.
--
-- Värdena är konventioner, inte mätningar, och tabellerna är INTE överens:
-- havregryn är 37 g/dl hos ICA och 40 hos Arla. Därför en enda källa rakt
-- igenom — att alla recept räknar likadant betyder mer för en inköpslista än
-- att varje enskilt värde är fysikaliskt sant.
--
-- Källa: ICA:s omvandlingstabell, https://www.ica.se/artikel/omvandlingstabell/
-- Omräknat från "1 dl väger X g" till g/ml genom att dela med 100.

update ingredients i
set density_g_per_ml = d.density
from (values
  ('Vetemjöl',    0.60),
  ('Rågmjöl',     0.55),   -- ICA: grovt rågmjöl
  ('Potatismjöl', 0.80),
  ('Strösocker',  0.85),
  ('Farinsocker', 0.75),
  ('Havregryn',   0.37),
  ('Russin',      0.60),
  ('Mandlar',     0.70)    -- ICA: "Mandel"
) as d(name, density)
where i.home_id is null and lower(trim(i.name)) = lower(trim(d.name));

-- ÄNNU OFYLLDA, och det är den grupp som betyder mest för receptinmatning:
-- ris, linser, bönor, couscous, bulgur och quinoa ligger alla i 'vikt', men
-- svenska recept skriver dem i dl. Varken ICA eller Arla listar dem, så de
-- väntar på en källa som gör det. Tills dess går de bara att ange i gram.
--
-- Övriga oträffade i ICA:s tabell: Dinkelmjöl, Maizena, Florsocker, Ströbröd,
-- Müsli, Kokosflingor, Cashewnötter, Jordnötter, Saltnötter, Sesamfrön.
--
-- Nästa omgång värden blir en NY migration — den här är applicerad och
-- redigeras aldrig.

-- Kontroll:
--   select name, dimension, density_g_per_ml from ingredients
--   where home_id is null and density_g_per_ml is not null order by name;
