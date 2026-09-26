-- Skaffa frö-ingredienser, v2 (home_id NULL = frö, ägs av Skaffa).
--
-- Ersätter 20260823000300_seed_ingredients.sql, vars insert refererar kolumnen
-- `unit` som togs bort i 20260908163945_units_dimensions.sql. Den filen är
-- applicerad och redigeras aldrig; den här är efterföljaren.
--
-- dimension: 'vikt' | 'volym' | 'antal'. Ingrediensen bär MÅTTSLAGET, inte
-- måttet — enheten väljer användaren per receptrad, och mängden lagras i
-- dimensionens basenhet (gram, milliliter, styck). Mekaniskt härledd ur den
-- gamla enheten: gram -> vikt, styck -> antal, dl/msk/tsk/krm -> volym.
--
-- diet_tag: 'kott' | 'fisk' | null. NULL betyder neutral, inte "vegetariskt" –
-- ett recept blir vegetariskt genom att sakna kött- och fiskmarkerade
-- ingredienser, inte genom att någon ingrediens säger att det är det.
-- Kolumnen är medvetet skild från category: category är butikshyllan, och där
-- ligger Hönsbuljongtärning och Kalvfond under 'grains' bland torrvarorna.
--
-- Idempotent: konflikt på (home_id, lower(trim(name))) skriver om diet_tag.
-- (Fungerar tack vare NULLS NOT DISTINCT på unika indexet – utan det vore varje
-- frörad unik eftersom home_id är NULL, och ingen konflikt hade upptäckts alls.)
--
-- OBS: dimension står MEDVETET inte i do update. trg_ingredient_dimension
-- vägrar ändra dimension på en befintlig ingrediens, eftersom varje lagrad
-- mängd då blir fel sort. Rättar du en dimension i listan nedan måste den
-- ändringen göras avsiktligt och för hand — omkörning av filen gör det inte.
insert into ingredients (home_id, name, dimension, category, diet_tag) values
  -- ---- produce -------------------------------------------------------------
  (null, 'Gul lök', 'antal', 'produce', null),
  (null, 'Röd lök', 'antal', 'produce', null),
  (null, 'Schalottenlök', 'antal', 'produce', null),
  (null, 'Purjolök', 'antal', 'produce', null),
  (null, 'Vitlök', 'antal', 'produce', null),
  (null, 'Vitlöksklyfta', 'antal', 'produce', null),
  (null, 'Morot', 'antal', 'produce', null),
  (null, 'Palsternacka', 'antal', 'produce', null),
  (null, 'Rödbeta', 'antal', 'produce', null),
  (null, 'Potatis', 'vikt', 'produce', null),
  (null, 'Sötpotatis', 'antal', 'produce', null),
  (null, 'Broccoli', 'antal', 'produce', null),
  (null, 'Blomkål', 'antal', 'produce', null),
  (null, 'Vitkål', 'vikt', 'produce', null),
  (null, 'Rödkål', 'vikt', 'produce', null),
  (null, 'Spetskål', 'antal', 'produce', null),
  (null, 'Grönkål', 'vikt', 'produce', null),
  (null, 'Brysselkål', 'vikt', 'produce', null),
  (null, 'Zucchini', 'antal', 'produce', null),
  (null, 'Aubergine', 'antal', 'produce', null),
  (null, 'Gurka', 'antal', 'produce', null),
  (null, 'Paprika', 'antal', 'produce', null),
  (null, 'Tomat', 'antal', 'produce', null),
  (null, 'Körsbärstomater', 'vikt', 'produce', null),
  (null, 'Champinjoner', 'vikt', 'produce', null),
  (null, 'Svamp', 'vikt', 'produce', null),
  (null, 'Kantareller', 'vikt', 'produce', null),
  (null, 'Sparris', 'vikt', 'produce', null),
  (null, 'Haricots verts', 'vikt', 'produce', null),
  (null, 'Sockerärter', 'vikt', 'produce', null),
  (null, 'Majskolv', 'antal', 'produce', null),
  (null, 'Babyspenat', 'vikt', 'produce', null),
  (null, 'Spenat', 'vikt', 'produce', null),
  (null, 'Ruccola', 'vikt', 'produce', null),
  (null, 'Isbergssallad', 'antal', 'produce', null),
  (null, 'Romansallad', 'antal', 'produce', null),
  (null, 'Stjälkselleri', 'antal', 'produce', null),
  (null, 'Rotselleri', 'antal', 'produce', null),
  (null, 'Fänkål', 'antal', 'produce', null),
  (null, 'Färsk ingefära', 'vikt', 'produce', null),
  (null, 'Pumpa', 'vikt', 'produce', null),
  (null, 'Rädisor', 'vikt', 'produce', null),
  (null, 'Avokado', 'antal', 'produce', null),
  (null, 'Röd chili', 'antal', 'produce', null),
  (null, 'Salladslök', 'antal', 'produce', null),
  (null, 'Färsk dill', 'antal', 'produce', null),
  (null, 'Färsk persilja', 'antal', 'produce', null),
  (null, 'Färsk basilika', 'antal', 'produce', null),
  (null, 'Färsk koriander', 'antal', 'produce', null),
  (null, 'Gräslök', 'antal', 'produce', null),
  (null, 'Färsk mynta', 'antal', 'produce', null),
  (null, 'Färsk timjan', 'antal', 'produce', null),
  (null, 'Färsk rosmarin', 'antal', 'produce', null),

  -- ---- protein -------------------------------------------------------------
  (null, 'Nötfärs', 'vikt', 'protein', 'kott'),
  (null, 'Blandfärs', 'vikt', 'protein', 'kott'),
  (null, 'Fläskfärs', 'vikt', 'protein', 'kott'),
  (null, 'Kycklingfärs', 'vikt', 'protein', 'kott'),
  (null, 'Högrev', 'vikt', 'protein', 'kott'),
  (null, 'Ryggbiff', 'vikt', 'protein', 'kott'),
  (null, 'Entrecôte', 'vikt', 'protein', 'kott'),
  (null, 'Oxfilé', 'vikt', 'protein', 'kott'),
  (null, 'Fläskkarré', 'vikt', 'protein', 'kott'),
  (null, 'Fläskkotlett', 'vikt', 'protein', 'kott'),
  (null, 'Fläskfilé', 'vikt', 'protein', 'kott'),
  (null, 'Bacon', 'vikt', 'protein', 'kott'),
  (null, 'Kokt skinka', 'vikt', 'protein', 'kott'),
  (null, 'Kycklingfilé', 'vikt', 'protein', 'kott'),
  (null, 'Kycklinglårfilé', 'vikt', 'protein', 'kott'),
  (null, 'Hel kyckling', 'antal', 'protein', 'kott'),
  (null, 'Kalkonfärs', 'vikt', 'protein', 'kott'),
  (null, 'Lammfärs', 'vikt', 'protein', 'kott'),
  (null, 'Lammstek', 'vikt', 'protein', 'kott'),
  (null, 'Falukorv', 'vikt', 'protein', 'kott'),
  (null, 'Prinskorv', 'vikt', 'protein', 'kott'),
  (null, 'Chorizo', 'vikt', 'protein', 'kott'),
  (null, 'Salami', 'vikt', 'protein', 'kott'),
  (null, 'Leverpastej', 'vikt', 'protein', 'kott'),
  (null, 'Köttbullar', 'vikt', 'protein', 'kott'),
  (null, 'Fläsklägg', 'vikt', 'protein', 'kott'),
  -- Växtprotein ligger på samma hylla (category = butiksgruppering), men är
  -- neutralt. Det är hela skälet till att diet_tag inte kan härledas ur category.
  (null, 'Tofu', 'vikt', 'protein', null),
  (null, 'Rökt tofu', 'vikt', 'protein', null),
  (null, 'Tempeh', 'vikt', 'protein', null),
  (null, 'Seitan', 'vikt', 'protein', null),
  (null, 'Sojafärs', 'vikt', 'protein', null),
  (null, 'Sojabitar', 'vikt', 'protein', null),
  (null, 'Vegofärs', 'vikt', 'protein', null),
  (null, 'Quornfärs', 'vikt', 'protein', null),
  (null, 'Quornbitar', 'vikt', 'protein', null),
  (null, 'Vegobullar', 'vikt', 'protein', null),
  (null, 'Vegokorv', 'vikt', 'protein', null),
  (null, 'Vegoburgare', 'antal', 'protein', null),
  (null, 'Falafel', 'vikt', 'protein', null),
  (null, 'Hummus', 'vikt', 'protein', null),

  -- ---- seafood -------------------------------------------------------------
  (null, 'Laxfilé', 'vikt', 'seafood', 'fisk'),
  (null, 'Torskrygg', 'vikt', 'seafood', 'fisk'),
  (null, 'Sej', 'vikt', 'seafood', 'fisk'),
  (null, 'Kolja', 'vikt', 'seafood', 'fisk'),
  (null, 'Rödspätta', 'vikt', 'seafood', 'fisk'),
  (null, 'Räkor', 'vikt', 'seafood', 'fisk'),
  (null, 'Handskalade räkor', 'vikt', 'seafood', 'fisk'),
  (null, 'Blåmusslor', 'vikt', 'seafood', 'fisk'),
  (null, 'Tonfisk på burk', 'vikt', 'seafood', 'fisk'),
  (null, 'Makrill i tomatsås', 'vikt', 'seafood', 'fisk'),
  (null, 'Sill', 'vikt', 'seafood', 'fisk'),
  (null, 'Inlagd sill', 'vikt', 'seafood', 'fisk'),
  (null, 'Gravad lax', 'vikt', 'seafood', 'fisk'),
  (null, 'Rökt lax', 'vikt', 'seafood', 'fisk'),
  (null, 'Fiskpinnar', 'antal', 'seafood', 'fisk'),
  (null, 'Pilgrimsmusslor', 'vikt', 'seafood', 'fisk'),
  (null, 'Kräftor', 'vikt', 'seafood', 'fisk'),
  (null, 'Kaviar', 'vikt', 'seafood', 'fisk'),
  (null, 'Löjrom', 'vikt', 'seafood', 'fisk'),

  -- ---- dairy ---------------------------------------------------------------
  -- Ägg och ost är neutrala: diet_class skiljer bara på kött och fisk, så
  -- lakto-ovo-frågor (löpe i parmesan m.m.) hör inte hemma i den här kolumnen.
  (null, 'Mellanmjölk', 'volym', 'dairy', null),
  (null, 'Lättmjölk', 'volym', 'dairy', null),
  (null, 'Standardmjölk', 'volym', 'dairy', null),
  (null, 'Laktosfri mjölk', 'volym', 'dairy', null),
  (null, 'Vispgrädde', 'volym', 'dairy', null),
  (null, 'Matlagningsgrädde', 'volym', 'dairy', null),
  (null, 'Crème fraîche', 'volym', 'dairy', null),
  (null, 'Gräddfil', 'volym', 'dairy', null),
  (null, 'Smör', 'vikt', 'dairy', null),
  (null, 'Margarin', 'vikt', 'dairy', null),
  (null, 'Hushållsost', 'vikt', 'dairy', null),
  (null, 'Riven ost', 'vikt', 'dairy', null),
  (null, 'Parmesan', 'vikt', 'dairy', null),
  (null, 'Fetaost', 'vikt', 'dairy', null),
  (null, 'Mozzarella', 'vikt', 'dairy', null),
  (null, 'Halloumi', 'vikt', 'dairy', null),
  (null, 'Keso', 'vikt', 'dairy', null),
  (null, 'Kvarg', 'vikt', 'dairy', null),
  (null, 'Naturell yoghurt', 'volym', 'dairy', null),
  (null, 'Grekisk yoghurt', 'volym', 'dairy', null),
  (null, 'Filmjölk', 'volym', 'dairy', null),
  (null, 'Ägg', 'antal', 'dairy', null),
  (null, 'Cheddar', 'vikt', 'dairy', null),
  (null, 'Färskost', 'vikt', 'dairy', null),
  (null, 'Smältost', 'vikt', 'dairy', null),
  (null, 'Havremjölk', 'volym', 'dairy', null),
  (null, 'Sojamjölk', 'volym', 'dairy', null),
  (null, 'Mandelmjölk', 'volym', 'dairy', null),
  (null, 'Havregrädde', 'volym', 'dairy', null),

  -- ---- bakery --------------------------------------------------------------
  (null, 'Formfranska', 'antal', 'bakery', null),
  (null, 'Surdegsbröd', 'antal', 'bakery', null),
  (null, 'Rågbröd', 'antal', 'bakery', null),
  (null, 'Knäckebröd', 'antal', 'bakery', null),
  (null, 'Hamburgerbröd', 'antal', 'bakery', null),
  (null, 'Korvbröd', 'antal', 'bakery', null),
  (null, 'Tortillabröd', 'antal', 'bakery', null),
  (null, 'Pitabröd', 'antal', 'bakery', null),
  (null, 'Baguette', 'antal', 'bakery', null),
  (null, 'Ciabatta', 'antal', 'bakery', null),
  (null, 'Croissant', 'antal', 'bakery', null),
  (null, 'Kanelbulle', 'antal', 'bakery', null),
  (null, 'Rostbröd', 'antal', 'bakery', null),
  (null, 'Fullkornsbröd', 'antal', 'bakery', null),

  -- ---- grains --------------------------------------------------------------
  (null, 'Spaghetti', 'vikt', 'grains', null),
  (null, 'Makaroner', 'vikt', 'grains', null),
  (null, 'Penne', 'vikt', 'grains', null),
  (null, 'Lasagneplattor', 'vikt', 'grains', null),
  (null, 'Jasminris', 'vikt', 'grains', null),
  (null, 'Basmatiris', 'vikt', 'grains', null),
  (null, 'Råris', 'vikt', 'grains', null),
  (null, 'Couscous', 'vikt', 'grains', null),
  (null, 'Bulgur', 'vikt', 'grains', null),
  (null, 'Quinoa', 'vikt', 'grains', null),
  (null, 'Vetemjöl', 'volym', 'grains', null),
  (null, 'Dinkelmjöl', 'volym', 'grains', null),
  (null, 'Rågmjöl', 'volym', 'grains', null),
  (null, 'Potatismjöl', 'volym', 'grains', null),
  (null, 'Maizena', 'volym', 'grains', null),
  (null, 'Strösocker', 'volym', 'grains', null),
  (null, 'Florsocker', 'volym', 'grains', null),
  (null, 'Farinsocker', 'volym', 'grains', null),
  (null, 'Ströbröd', 'volym', 'grains', null),
  (null, 'Havregryn', 'volym', 'grains', null),
  (null, 'Müsli', 'volym', 'grains', null),
  (null, 'Kokosflingor', 'volym', 'grains', null),
  (null, 'Kikärtor', 'vikt', 'grains', null),
  (null, 'Svarta bönor', 'vikt', 'grains', null),
  (null, 'Kidneybönor', 'vikt', 'grains', null),
  (null, 'Vita bönor', 'vikt', 'grains', null),
  (null, 'Röda linser', 'vikt', 'grains', null),
  (null, 'Gröna linser', 'vikt', 'grains', null),
  (null, 'Krossade tomater', 'vikt', 'grains', null),
  (null, 'Passerade tomater', 'volym', 'grains', null),
  (null, 'Tomatpuré', 'volym', 'grains', null),
  (null, 'Kokosmjölk', 'volym', 'grains', null),
  (null, 'Grönsaksbuljongtärning', 'antal', 'grains', null),
  -- De två raderna som gör hela kolumnen befogad: kött på torrvaruhyllan.
  (null, 'Hönsbuljongtärning', 'antal', 'grains', 'kott'),
  (null, 'Kalvfond', 'volym', 'grains', 'kott'),
  (null, 'Honung', 'volym', 'grains', null),
  (null, 'Sylt', 'volym', 'grains', null),
  (null, 'Jordnötssmör', 'volym', 'grains', null),
  (null, 'Olivolja', 'volym', 'grains', null),
  (null, 'Rapsolja', 'volym', 'grains', null),
  (null, 'Balsamvinäger', 'volym', 'grains', null),
  (null, 'Soja', 'volym', 'grains', null),
  (null, 'Dijonsenap', 'volym', 'grains', null),
  (null, 'Ketchup', 'volym', 'grains', null),
  (null, 'Majonnäs', 'volym', 'grains', null),

  -- ---- fruit ---------------------------------------------------------------
  (null, 'Äpple', 'antal', 'fruit', null),
  (null, 'Banan', 'antal', 'fruit', null),
  (null, 'Apelsin', 'antal', 'fruit', null),
  (null, 'Citron', 'antal', 'fruit', null),
  (null, 'Lime', 'antal', 'fruit', null),
  (null, 'Päron', 'antal', 'fruit', null),
  (null, 'Vindruvor', 'vikt', 'fruit', null),
  (null, 'Jordgubbar', 'vikt', 'fruit', null),
  (null, 'Blåbär', 'vikt', 'fruit', null),
  (null, 'Hallon', 'vikt', 'fruit', null),
  (null, 'Mango', 'antal', 'fruit', null),
  (null, 'Ananas', 'antal', 'fruit', null),
  (null, 'Kiwi', 'antal', 'fruit', null),
  (null, 'Nektarin', 'antal', 'fruit', null),
  (null, 'Persika', 'antal', 'fruit', null),
  (null, 'Plommon', 'antal', 'fruit', null),
  (null, 'Cantaloupmelon', 'antal', 'fruit', null),
  (null, 'Vattenmelon', 'antal', 'fruit', null),
  (null, 'Granatäpple', 'antal', 'fruit', null),
  (null, 'Clementin', 'antal', 'fruit', null),
  (null, 'Björnbär', 'vikt', 'fruit', null),
  (null, 'Russin', 'volym', 'fruit', null),
  (null, 'Torkade aprikoser', 'vikt', 'fruit', null),
  (null, 'Dadlar', 'vikt', 'fruit', null),

  -- ---- beverages -----------------------------------------------------------
  (null, 'Läsk', 'antal', 'beverages', null),
  (null, 'Cola', 'antal', 'beverages', null),
  (null, 'Saft', 'volym', 'beverages', null),
  (null, 'Apelsinjuice', 'volym', 'beverages', null),
  (null, 'Äppeljuice', 'volym', 'beverages', null),
  (null, 'Malet kaffe', 'vikt', 'beverages', null),
  (null, 'Kaffebönor', 'vikt', 'beverages', null),
  (null, 'Te', 'antal', 'beverages', null),
  (null, 'Mineralvatten', 'antal', 'beverages', null),
  (null, 'Kolsyrat vatten', 'antal', 'beverages', null),
  (null, 'Öl', 'antal', 'beverages', null),
  (null, 'Rödvin', 'volym', 'beverages', null),
  (null, 'Vitt vin', 'volym', 'beverages', null),

  -- ---- frozen --------------------------------------------------------------
  (null, 'Frysta ärtor', 'vikt', 'frozen', null),
  (null, 'Frysta blåbär', 'vikt', 'frozen', null),
  (null, 'Frysta hallon', 'vikt', 'frozen', null),
  (null, 'Frysta wokgrönsaker', 'vikt', 'frozen', null),
  (null, 'Frysta räkor', 'vikt', 'frozen', 'fisk'),
  (null, 'Glass', 'volym', 'frozen', null),
  (null, 'Frysta klyftpotatis', 'vikt', 'frozen', null),
  (null, 'Fryst bladspenat', 'vikt', 'frozen', null),
  (null, 'Frysta majskorn', 'vikt', 'frozen', null),
  -- Fryst pizza lämnas neutral: den kan vara vilket som helst, och att gissa
  -- "kott" hade gjort varje vegetarisk fredagspizza felmärkt utan förvarning.
  (null, 'Fryst pizza', 'antal', 'frozen', null),
  (null, 'Smördeg', 'antal', 'frozen', null),
  (null, 'Frysta jordgubbar', 'vikt', 'frozen', null),

  -- ---- snacks --------------------------------------------------------------
  (null, 'Chips', 'vikt', 'snacks', null),
  (null, 'Ostbågar', 'vikt', 'snacks', null),
  (null, 'Popcorn', 'vikt', 'snacks', null),
  (null, 'Saltnötter', 'vikt', 'snacks', null),
  (null, 'Jordnötter', 'vikt', 'snacks', null),
  (null, 'Cashewnötter', 'vikt', 'snacks', null),
  (null, 'Mandlar', 'vikt', 'snacks', null),
  (null, 'Choklad', 'vikt', 'snacks', null),
  (null, 'Kex', 'vikt', 'snacks', null),
  (null, 'Digestivekex', 'vikt', 'snacks', null),
  (null, 'Godis', 'vikt', 'snacks', null),
  (null, 'Lakrits', 'vikt', 'snacks', null),

  -- ---- spices --------------------------------------------------------------
  (null, 'Salt', 'volym', 'spices', null),
  (null, 'Flingsalt', 'volym', 'spices', null),
  (null, 'Svartpeppar', 'volym', 'spices', null),
  (null, 'Vitpeppar', 'volym', 'spices', null),
  (null, 'Paprikapulver', 'volym', 'spices', null),
  (null, 'Rökt paprikapulver', 'volym', 'spices', null),
  (null, 'Chilipulver', 'volym', 'spices', null),
  (null, 'Spiskummin', 'volym', 'spices', null),
  (null, 'Curry', 'volym', 'spices', null),
  (null, 'Kanel', 'volym', 'spices', null),
  (null, 'Malen kardemumma', 'volym', 'spices', null),
  (null, 'Muskotnöt', 'volym', 'spices', null),
  (null, 'Malen ingefära', 'volym', 'spices', null),
  (null, 'Gurkmeja', 'volym', 'spices', null),
  (null, 'Torkad oregano', 'volym', 'spices', null),
  (null, 'Torkad basilika', 'volym', 'spices', null),
  (null, 'Torkad timjan', 'volym', 'spices', null),
  (null, 'Torkad rosmarin', 'volym', 'spices', null),
  (null, 'Lagerblad', 'antal', 'spices', null),
  (null, 'Vitlökspulver', 'volym', 'spices', null),
  (null, 'Lökpulver', 'volym', 'spices', null),
  (null, 'Cayennepeppar', 'volym', 'spices', null),
  (null, 'Chiliflakes', 'volym', 'spices', null),
  (null, 'Sesamfrön', 'volym', 'spices', null),
  (null, 'Bakpulver', 'volym', 'spices', null),
  (null, 'Bikarbonat', 'volym', 'spices', null),
  (null, 'Vaniljsocker', 'volym', 'spices', null),
  (null, 'Vaniljstång', 'antal', 'spices', null),
  (null, 'Kanelstång', 'antal', 'spices', null),
  (null, 'Saffran', 'vikt', 'spices', null),
  (null, 'Fänkålsfrön', 'volym', 'spices', null),
  (null, 'Senapsfrön', 'volym', 'spices', null),
  (null, 'Korianderfrön', 'volym', 'spices', null),
  (null, 'Torkad dill', 'volym', 'spices', null),
  (null, 'Herbes de Provence', 'volym', 'spices', null),

  -- ---- household -----------------------------------------------------------
  (null, 'Toalettpapper', 'antal', 'household', null),
  (null, 'Hushållspapper', 'antal', 'household', null),
  (null, 'Diskmedel', 'antal', 'household', null),
  (null, 'Disktrasa', 'antal', 'household', null),
  (null, 'Tvättmedel', 'antal', 'household', null),
  (null, 'Soppåsar', 'antal', 'household', null),
  (null, 'Plastfolie', 'antal', 'household', null),
  (null, 'Aluminiumfolie', 'antal', 'household', null),
  (null, 'Bakplåtspapper', 'antal', 'household', null),
  (null, 'Tandkräm', 'antal', 'household', null),
  (null, 'Tvål', 'antal', 'household', null),
  (null, 'Schampo', 'antal', 'household', null),
  (null, 'Servetter', 'antal', 'household', null),
  (null, 'Kaffefilter', 'antal', 'household', null),
  (null, 'Tändstickor', 'antal', 'household', null),
  (null, 'Ljus', 'antal', 'household', null),
  (null, 'Batterier', 'antal', 'household', null),
  (null, 'Rengöringsmedel', 'antal', 'household', null)
on conflict (home_id, lower(trim(name))) do update
  set diet_tag = excluded.diet_tag;


-- ----------------------------------------------------------------------------
-- Densitet: gram per milliliter. Låter en ingrediens mätas i den andra
-- dimensionen — 3 dl mjöl på en vikt-ingrediens, eller 100 g sirap på en
-- volym-ingrediens. NULL = bara den egna dimensionens enheter erbjuds.
--
-- Urvalsregel: skriver ett svenskt recept någonsin ingrediensen i dl? Mjöl,
-- socker, ris, gryn, linser, bönor, couscous, bulgur, ströbröd, kakao, nötter,
-- frön, kokos och russin — ja. Kött, fisk, ost, grönsaker och frukt — nej.
--
-- Densiteterna sätts INTE här, utan i en egen migration per omgång värden:
-- 20260908205759_seed_ingredient_densities.sql och framåt. Den här filen är
-- applicerad och redigeras aldrig, så en ny sats värden är alltid en ny fil.
-- ----------------------------------------------------------------------------


-- Kontroll: 314 rader – 135 vikt, 100 antal, 79 volym.
--   select dimension, count(*) from ingredients where home_id is null
--   group by 1 order by 2 desc;
--
--   select count(*) from ingredients
--   where home_id is null and density_g_per_ml is not null;
