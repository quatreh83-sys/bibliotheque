-- À exécuter UNE fois si vous avez déjà lancé schema.sql
alter table books add column if not exists subtitle text,add column if not exists publisher text,add column if not exists city text,add column if not exists collection text,add column if not exists volume text,add column if not exists code text;
