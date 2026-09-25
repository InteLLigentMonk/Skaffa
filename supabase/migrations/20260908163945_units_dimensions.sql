create type unit_dimension as enum ('vikt', 'volym', 'antal'); 
create type unit_code as enum ('gram', 'kilogram', 'milliliter', 'centiliter', 'deciliter', 'liter', 'matsked', 'tesked', 'kryddmått', 'styck');

alter table ingredients add column dimension unit_dimension;

update ingredients
set dimension = case unit
    when 'gram' then 'vikt'
    when 'styck' then 'antal'
    else 'volym'
    end::unit_dimension;

alter table ingredients alter column dimension set not null;
alter table ingredients drop column unit;

alter table ingredients
add column density_g_per_ml numeric check (density_g_per_ml > 0);